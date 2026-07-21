import Anthropic from "@anthropic-ai/sdk";
import { createAdminClient } from "@/lib/supabase/server";
import { systemPrompt } from "@/lib/chat/prompt";
import { CHAT_TOOLS, executeTool } from "@/lib/chat/tools";
import { generateReply, hasAnyLLMKey, type ChatMsg } from "@/lib/chat/llm";
import { SITE } from "@/lib/site";
import { notifyOwenWA } from "@/lib/wa-notify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MODEL = process.env.CHAT_MODEL || "claude-haiku-4-5-20251001";
const MAX_TOOL_LOOPS = 4;
const HISTORY_LIMIT = 20;

type Role = "visitor" | "bot" | "agent" | "system";
interface DbMessage {
  role: Role;
  body: string | null;
}

/** Canned reply used when NO LLM key (free or Anthropic) is configured. */
function cannedReply(): string {
  return `Thanks for reaching out to ${SITE.name}. Our live assistant isn't connected right now, but I can still help you get moving:

• Book a consultation and the team will confirm a time.
• Tap "Talk to a person" above and a team member will join this chat.
• Or message us on WhatsApp at ${SITE.whatsappDisplay}.

How would you like to continue?`;
}

export async function POST(req: Request) {
  const supabase = createAdminClient();

  try {
    const body = await req.json().catch(() => ({}));
    const incoming: string =
      typeof body.message === "string" ? body.message.trim() : "";
    const action: string | undefined =
      typeof body.action === "string" ? body.action : undefined;
    let conversationId: string | undefined =
      typeof body.conversationId === "string"
        ? body.conversationId
        : undefined;
    const visitor =
      body.visitor && typeof body.visitor === "object" ? body.visitor : {};

    // --- Load or create the conversation -----------------------------------
    let status: string = "bot";
    if (conversationId) {
      const { data } = await supabase
        .from("chat_conversations")
        .select("id, status")
        .eq("id", conversationId)
        .maybeSingle();
      if (data) {
        status = data.status as string;
      } else {
        conversationId = undefined; // stale id — start fresh
      }
    }

    if (!conversationId) {
      const { data, error } = await supabase
        .from("chat_conversations")
        .insert({
          channel: "web",
          status: "bot",
          visitor_name: typeof visitor.name === "string" ? visitor.name : null,
          visitor_email:
            typeof visitor.email === "string" ? visitor.email : null,
          visitor_phone:
            typeof visitor.phone === "string" ? visitor.phone : null,
        })
        .select("id, status")
        .single();
      if (error || !data) {
        return Response.json(
          {
            reply:
              "Sorry — I couldn't start the chat just now. Please try WhatsApp: " +
              SITE.whatsappDisplay,
            status: "bot",
          },
          { status: 200 },
        );
      }
      conversationId = data.id;
      status = data.status;
    }

    if (!conversationId) {
      return Response.json({ reply: cannedReply(), status: "bot" }, { status: 200 });
    }
    const cid: string = conversationId;

    // --- Explicit "Talk to a person" handoff (independent of the model) -----
    if (action === "request_human") {
      const result = await executeTool("request_human", {}, cid);
      await supabase
        .from("chat_conversations")
        .update({ last_message_at: new Date().toISOString(), unread_for_agent: 1 })
        .eq("id", cid);
      void notifyOwenWA(
        `Ferguson Law Live Chat — visitor requested a human agent.\nName: ${visitor.name || "website visitor"}\nView: https://ferguson-law.vercel.app/agent`,
      );
      return Response.json({
        conversationId: cid,
        status: "waiting_agent",
        handledByHuman: true,
        ...(result?.meta ? { meta: result.meta } : {}),
      });
    }

    // --- Persist the visitor message ---------------------------------------
    if (incoming) {
      await supabase.from("chat_messages").insert({
        conversation_id: cid,
        role: "visitor",
        body: incoming,
      });
    }
    const isLiveChat = status === "agent" || status === "waiting_agent";
    await supabase
      .from("chat_conversations")
      .update({
        last_message_at: new Date().toISOString(),
        unread_for_agent: isLiveChat ? 1 : 0,
      })
      .eq("id", cid);

    // --- A human is handling this thread — do NOT call the model -----------
    if (isLiveChat) {
      void notifyOwenWA(
        `Ferguson Law Live Chat — new message from visitor.\nFrom: ${visitor.name || "website visitor"}\nMessage: ${incoming.substring(0, 120)}\nView: https://ferguson-law.vercel.app/agent`,
      );
      return Response.json({ conversationId: cid, status, handledByHuman: true });
    }

    // --- Build message history (shared by both model paths) ----------------
    const { data: history } = await supabase
      .from("chat_messages")
      .select("role, body")
      .eq("conversation_id", cid)
      .order("created_at", { ascending: false })
      .limit(HISTORY_LIMIT);

    const ordered = ((history as DbMessage[] | null) ?? []).slice().reverse();
    const messages: ChatMsg[] = [];
    for (const m of ordered) {
      if (!m.body) continue;
      if (m.role === "visitor") messages.push({ role: "user", content: m.body });
      else if (m.role === "bot" || m.role === "agent")
        messages.push({ role: "assistant", content: m.body });
    }
    // Ensure the conversation starts with a user turn.
    while (messages.length && messages[0].role !== "user") messages.shift();
    if (!messages.length && incoming)
      messages.push({ role: "user", content: incoming });

    const system = systemPrompt();
    let finalText = "";
    let ref: string | undefined;
    let requestedHuman = false;
    const sideEffects: Record<string, unknown>[] = [];

    const anthropicKey = process.env.ANTHROPIC_API_KEY;

    if (anthropicKey) {
      // --- Anthropic path: full tool-use loop (best experience) ------------
      const anthropic = new Anthropic({ apiKey: anthropicKey });
      const convo: Anthropic.MessageParam[] = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));
      for (let loop = 0; loop < MAX_TOOL_LOOPS; loop++) {
        const resp = await anthropic.messages.create({
          model: MODEL,
          max_tokens: 1024,
          system,
          tools: CHAT_TOOLS,
          messages: convo,
        });
        const textParts = resp.content
          .filter((b): b is Anthropic.TextBlock => b.type === "text")
          .map((b) => b.text);
        if (textParts.length) finalText = textParts.join("\n").trim();
        const toolUses = resp.content.filter(
          (b): b is Anthropic.ToolUseBlock => b.type === "tool_use",
        );
        if (resp.stop_reason !== "tool_use" || toolUses.length === 0) break;
        convo.push({ role: "assistant", content: resp.content });
        const toolResults: Anthropic.ToolResultBlockParam[] = [];
        for (const tu of toolUses) {
          const result = await executeTool(
            tu.name,
            (tu.input ?? {}) as Record<string, unknown>,
            cid,
          );
          sideEffects.push(result.meta);
          if (result.ref) ref = result.ref;
          if (result.requestedHuman) requestedHuman = true;
          toolResults.push({
            type: "tool_result",
            tool_use_id: tu.id,
            content: result.content,
          });
        }
        convo.push({ role: "user", content: toolResults });
      }
      if (!finalText) finalText = cannedReply();
    } else if (hasAnyLLMKey()) {
      // --- Free-LLM path: Groq → Gemini → OpenRouter (text-only) -----------
      const res = await generateReply({ system, messages });
      finalText = res.ok ? res.text : cannedReply();
      if (res.ok) sideEffects.push({ provider: res.provider });
    } else {
      // --- No key at all: graceful canned reply ----------------------------
      finalText = cannedReply();
      sideEffects.push({ fallback: "no_api_key" });
    }

    // --- Persist the bot reply --------------------------------------------
    await supabase.from("chat_messages").insert({
      conversation_id: cid,
      role: "bot",
      body: finalText,
      meta: sideEffects.length ? { info: sideEffects } : {},
    });

    const finalStatus = requestedHuman ? "waiting_agent" : "bot";
    return Response.json({
      conversationId: cid,
      reply: finalText,
      status: finalStatus,
      ...(ref ? { ref } : {}),
    });
  } catch (err) {
    console.error("[chat] error", err);
    const reply = `Sorry — something went wrong on our side. You can reach ${SITE.name} on WhatsApp at ${SITE.whatsappDisplay}, and a team member will help right away.`;
    return Response.json({ reply, status: "bot" }, { status: 200 });
  }
}
