import type Anthropic from "@anthropic-ai/sdk";
import { createAdminClient } from "@/lib/supabase/server";
import { createClient } from "@/lib/supabase/client";

/**
 * Chat tool schemas + executors (server-only).
 *
 * Schemas are handed to Claude as `tools`. Executors run on the server with the
 * service-role client (createAdminClient) so they can write to ferguson_leads
 * and chat_conversations regardless of RLS. Executors are pure-ish functions
 * that take the conversationId so they can scope side-effects correctly.
 */

export const CHAT_TOOLS: Anthropic.Tool[] = [
  {
    name: "check_availability",
    description:
      "Check available consultation slots. Call this when the visitor wants to book or asks when they can come in. Returns a human-readable list of available times grouped by day.",
    input_schema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "book_consultation",
    description:
      "Book a consultation with Ferguson Law. Use once you have the visitor's name, at least one contact (phone or email), and which service/area they need. Optionally pass slot_iso if the visitor has chosen a specific available time from check_availability. Returns a booking reference.",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Full name of the visitor." },
        phone: {
          type: "string",
          description: "Phone / WhatsApp number, if given.",
        },
        email: { type: "string", description: "Email address, if given." },
        service: {
          type: "string",
          description:
            "The practice area or service, e.g. 'Real Estate & Conveyancing'.",
        },
        slot_iso: {
          type: "string",
          description:
            "ISO timestamp of the chosen consultation slot (from check_availability). If provided, the appointment is booked at this exact time.",
        },
        preferred_time: {
          type: "string",
          description:
            "Free-text preferred day/time, e.g. 'Tuesday afternoon' or '2026-07-02 10am'. Used when no specific slot_iso is chosen.",
        },
        summary: {
          type: "string",
          description: "One or two sentences describing the matter.",
        },
      },
      required: ["name", "service"],
    },
  },
  {
    name: "capture_contact",
    description:
      "Quietly save the visitor's name and contact details to this conversation so the team can follow up. Use when they share their name and a phone or email but aren't booking yet.",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Visitor's name." },
        phone: { type: "string", description: "Phone / WhatsApp number." },
        email: { type: "string", description: "Email address." },
      },
      required: ["name"],
    },
  },
  {
    name: "request_human",
    description:
      "Flag this conversation for a live human agent. Use when the visitor asks to speak to a person, is frustrated, or has a matter that clearly needs an attorney.",
    input_schema: {
      type: "object",
      properties: {
        reason: {
          type: "string",
          description: "Short reason a human is needed.",
        },
      },
      required: [],
    },
  },
];

export interface ToolResult {
  /** Text fed back to the model as the tool_result content. */
  content: string;
  /** Structured side-effect recorded in the bot message meta. */
  meta: Record<string, unknown>;
  /** Booking reference, surfaced to the API response when present. */
  ref?: string;
  /** Whether this tool set the conversation to waiting_agent. */
  requestedHuman?: boolean;
}

/** FL-XXXXXX style reference, e.g. FL-7K3Q9A. */
function makeRef(): string {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 6; i++) {
    s += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return `FL-${s}`;
}

type ToolInput = Record<string, unknown>;
const str = (v: unknown): string | null =>
  typeof v === "string" && v.trim() ? v.trim() : null;

/** Jamaica timezone label for a Date. */
function jamaicaLabel(d: Date): string {
  return d.toLocaleString("en-JM", {
    timeZone: "America/Jamaica",
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/** Group ISO timestamps by Jamaica date and format as readable list. */
function formatSlots(slots: string[]): string {
  const groups: Record<string, string[]> = {};
  for (const iso of slots) {
    const d = new Date(iso);
    const dayKey = d.toLocaleDateString("en-JM", {
      timeZone: "America/Jamaica",
      weekday: "long",
      month: "long",
      day: "numeric",
    });
    const timeStr = d.toLocaleTimeString("en-JM", {
      timeZone: "America/Jamaica",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
    if (!groups[dayKey]) groups[dayKey] = [];
    groups[dayKey].push(timeStr);
  }
  const lines: string[] = [];
  for (const [day, times] of Object.entries(groups)) {
    lines.push(`${day}: ${times.slice(0, 6).join(", ")}`);
  }
  return lines.join("\n");
}

/**
 * Execute a tool by name. Returns text content for the model plus structured
 * meta for persistence.
 */
export async function executeTool(
  name: string,
  input: ToolInput,
  conversationId: string,
): Promise<ToolResult> {
  const supabase = createAdminClient();

  // -------------------------------------------------------------------------
  // check_availability — public RPC, no admin token needed
  // -------------------------------------------------------------------------
  if (name === "check_availability") {
    const now = new Date();
    const in14 = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

    // Use anon client since fl_available_slots is public
    const anonClient = createClient();
    const { data, error } = await anonClient.rpc("fl_available_slots", {
      p_from: now.toISOString(),
      p_to: in14.toISOString(),
    });

    if (error || !data) {
      return {
        content:
          "I wasn't able to load the availability calendar right now. Please ask the visitor to call or WhatsApp the firm directly to find a suitable time.",
        meta: { tool: name, error: error?.message },
      };
    }

    const slots = (data as Array<{ slot_start: string }>)
      .map((r) => r.slot_start)
      .slice(0, 40); // cap to avoid overwhelming the model

    if (slots.length === 0) {
      return {
        content:
          "There are no available slots in the next 14 days. Please ask the visitor to contact the firm on WhatsApp to arrange a time.",
        meta: { tool: name, slots: [] },
      };
    }

    const formatted = formatSlots(slots);
    return {
      content: `Available consultation slots (Jamaica time) over the next 14 days:\n\n${formatted}\n\nAsk the visitor which day and time works best, then call book_consultation with the chosen slot_iso.`,
      meta: { tool: name, slots },
    };
  }

  // -------------------------------------------------------------------------
  // book_consultation
  // -------------------------------------------------------------------------
  if (name === "book_consultation") {
    const ref = makeRef();
    const leadName = str(input.name) ?? "Website visitor";
    const phone = str(input.phone);
    const email = str(input.email);
    const service = str(input.service);
    const slotIso = str(input.slot_iso);
    const preferred = str(input.preferred_time);
    const summary = str(input.summary);

    // If a specific slot was chosen, verify it's still free and insert into appointments
    if (slotIso) {
      const startsAt = new Date(slotIso);
      const endsAt = new Date(startsAt.getTime() + 20 * 60 * 1000); // 20 min default
      const startsIso = startsAt.toISOString();
      const endsIso = endsAt.toISOString();

      // Double-booking guard
      const { data: clash } = await supabase.rpc("taken_slots", {
        p_from: startsIso,
        p_to: endsIso,
      });

      if (Array.isArray(clash) && clash.length > 0) {
        return {
          content:
            `Sorry — that slot (${jamaicaLabel(startsAt)} Jamaica time) was just taken. Please call check_availability again and offer the visitor another time.`,
          meta: { tool: name, error: "slot_taken", slot: slotIso },
        };
      }

      // Insert appointment
      await supabase.from("appointments").insert({
        lead_ref: ref,
        name: leadName,
        email,
        phone,
        service: service ?? "Consultation",
        starts_at: startsIso,
        ends_at: endsIso,
        status: "pending",
        ref,
        meta: { source: "chatbot", conversation_id: conversationId, summary },
      });

      // Upsert fl_clients
      let clientId: string | null = null;
      try {
        const { data: cRow } = await supabase
          .rpc("fl_admin_upsert_client", {
            p_token: process.env.FL_ADMIN_TOKEN ?? "",
            p_name: leadName,
            p_email: email,
            p_phone: phone,
            p_type: "individual",
            p_country: null,
            p_notes: summary,
          });
        clientId = typeof cRow === "string" ? cRow : null;
      } catch {
        /* best effort */
      }

      // Create fl_matters row
      if (clientId) {
        try {
          await supabase.from("fl_matters").insert({
            client_id: clientId,
            ref,
            matter_type: "other",
            stage: "consultation_booked",
            description: summary ?? service,
            priority: "standard",
            payment_status: "unpaid",
            meta: { chatbot: true, conversation_id: conversationId },
          });
        } catch {
          /* best effort */
        }
      }
    }

    // Always write ferguson_leads for backwards compat
    const { error } = await supabase.from("ferguson_leads").insert({
      source: "chatbot",
      name: leadName,
      email,
      phone,
      service,
      preferred_date: slotIso
        ? new Date(slotIso).toLocaleDateString("en-JM", { timeZone: "America/Jamaica" })
        : null,
      preferred_time: slotIso
        ? new Date(slotIso).toLocaleTimeString("en-JM", { timeZone: "America/Jamaica", hour: "numeric", minute: "2-digit", hour12: true })
        : preferred,
      message: summary,
      ref,
      status: "new",
      meta: { conversation_id: conversationId, slot_iso: slotIso },
    });

    if (error) {
      return {
        content:
          "I couldn't save that booking just now. Please ask the visitor to try again in a moment, or to reach the firm on WhatsApp.",
        meta: { tool: name, error: error.message },
      };
    }

    // Mirror the contact onto the conversation for the agent console.
    await supabase
      .from("chat_conversations")
      .update({
        visitor_name: leadName,
        ...(phone ? { visitor_phone: phone } : {}),
        ...(email ? { visitor_email: email } : {}),
      })
      .eq("id", conversationId);

    const slotLabel = slotIso
      ? ` at ${jamaicaLabel(new Date(slotIso))} Jamaica time`
      : "";

    return {
      content: `Booking saved${slotLabel}. Reference: ${ref}. The firm will confirm${slotIso ? "" : " a time"} with ${leadName}${
        phone || email ? ` via ${phone ?? email}` : ""
      }. Share the reference ${ref} with the visitor.`,
      meta: { tool: name, ref, service, name: leadName, slot_iso: slotIso },
      ref,
    };
  }

  // -------------------------------------------------------------------------
  // capture_contact
  // -------------------------------------------------------------------------
  if (name === "capture_contact") {
    const name_ = str(input.name);
    const phone = str(input.phone);
    const email = str(input.email);

    const { error } = await supabase
      .from("chat_conversations")
      .update({
        ...(name_ ? { visitor_name: name_ } : {}),
        ...(phone ? { visitor_phone: phone } : {}),
        ...(email ? { visitor_email: email } : {}),
      })
      .eq("id", conversationId);

    if (error) {
      return {
        content: "Couldn't save the contact details just now.",
        meta: { tool: name, error: error.message },
      };
    }

    return {
      content: "Saved the visitor's contact details for follow-up.",
      meta: { tool: name, name: name_, phone, email },
    };
  }

  // -------------------------------------------------------------------------
  // request_human
  // -------------------------------------------------------------------------
  if (name === "request_human") {
    const reason = str(input.reason);
    const { error } = await supabase
      .from("chat_conversations")
      .update({ status: "waiting_agent" })
      .eq("id", conversationId);

    // Drop a system note into the thread for the agent console.
    await supabase.from("chat_messages").insert({
      conversation_id: conversationId,
      role: "system",
      body: reason
        ? `Visitor requested a human. Reason: ${reason}`
        : "Visitor requested a human.",
      meta: { kind: "handoff" },
    });

    if (error) {
      return {
        content:
          "I tried to bring in a team member but hit a snag — let the visitor know they can reach us on WhatsApp meanwhile.",
        meta: { tool: name, error: error.message },
      };
    }

    return {
      content:
        "A team member has been notified and will join this chat shortly. Reassure the visitor and let them know they can also use WhatsApp.",
      meta: { tool: name, reason },
      requestedHuman: true,
    };
  }

  return {
    content: `Unknown tool: ${name}`,
    meta: { tool: name, error: "unknown_tool" },
  };
}
