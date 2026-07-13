/* eslint-disable @next/next/no-img-element */
"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getMe, updateProfile, clearToken, changePassword,
  getMyListings, saveListing, deleteListing,
  getMyServices, saveService, deleteService,
  uploadMedia, PARISHES, ISLANDWIDE,
  type Partner, type Listing, type Service, type Media,
} from "@/lib/partners/api";

const STATUS_NOTE: Record<Partner["status"], string> = {
  pending: "Your listing is awaiting Ferguson Law's review. It isn't public yet — you can keep editing in the meantime.",
  approved: "You're live in the directory. Changes you publish appear right away.",
  suspended: "Your listing is currently hidden. Please contact Ferguson Law.",
};

export default function DashboardPage() {
  const router = useRouter();
  const [me, setMe] = useState<Partner | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const p = await getMe();
      if (!p) {
        router.replace("/directory/login");
        return;
      }
      setMe(p);
      setLoading(false);
    })();
  }, [router]);

  if (loading || !me) {
    return <div className="dir-wrap" style={{ padding: "60px 0" }}>Loading…</div>;
  }

  function logout() {
    clearToken();
    router.replace("/directory/login");
  }

  return (
    <div className="dir-wrap">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 30 }}>
        <h1 style={{ fontFamily: "var(--serif)", color: "var(--ink)", fontSize: 30 }}>
          {me.business_name}
        </h1>
        <div style={{ display: "flex", gap: 10 }}>
          {me.status === "approved" && me.slug && (
            <a className="btn btn-ghost" href={`/directory/${me.slug}`} target="_blank" rel="noopener">
              View public page
            </a>
          )}
          <button className="link-btn" onClick={logout}>Log out</button>
        </div>
      </div>

      <div className="dash-status" data-s={me.status}>{STATUS_NOTE[me.status]}</div>

      <ProfileCard me={me} onSaved={setMe} />

      <SecurityCard />

      {me.kind === "realtor" ? (
        <ListingsManager partnerId={me.id} />
      ) : (
        <ServicesManager
          partnerId={me.id}
          kindLabel={
            me.kind === "surveyor" ? "survey"
            : me.kind === "loan_officer" ? "banking"
            : "valuation"
          }
        />
      )}
    </div>
  );
}

/* ---------------- profile ---------------- */
function ProfileCard({ me, onSaved }: { me: Partner; onSaved: (p: Partner) => void }) {
  const [f, setF] = useState({
    contact_name: me.contact_name ?? "",
    phone: me.phone ?? "",
    whatsapp: me.whatsapp ?? "",
    website: me.website ?? "",
    reb_number: me.reb_number ?? "",
    bio: me.bio ?? "",
    parishes: me.parishes ?? [],
    logo_url: me.logo_url ?? "",
  });
  const [busy, setBusy] = useState(false);
  const [ok, setOk] = useState(false);

  const islandwide = f.parishes.includes(ISLANDWIDE);

  function toggleParish(p: string) {
    if (islandwide) return; // individual parishes are disabled while Islandwide is on
    setF((s) => ({
      ...s,
      parishes: s.parishes.includes(p) ? s.parishes.filter((x) => x !== p) : [...s.parishes, p],
    }));
  }

  function toggleIslandwide() {
    setF((s) => ({ ...s, parishes: islandwide ? [] : [ISLANDWIDE] }));
  }

  async function onLogo(file: File | undefined) {
    if (!file) return;
    const m = await uploadMedia(me.id, file);
    setF((s) => ({ ...s, logo_url: m.url }));
  }

  async function save() {
    setBusy(true);
    setOk(false);
    try {
      await updateProfile(f);
      const fresh = await getMe();
      if (fresh) onSaved(fresh);
      setOk(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="dash-section">
      <h2>Your profile</h2>
      {ok && <div className="dform-ok">Saved.</div>}
      <div style={{ display: "flex", gap: 14, alignItems: "center", margin: "10px 0 14px" }}>
        <img
          className="profile-logo"
          src={f.logo_url || "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg'/>"}
          alt=""
        />
        <label className="btn btn-ghost" style={{ cursor: "pointer" }}>
          Upload logo
          <input type="file" accept="image/*" hidden onChange={(e) => onLogo(e.target.files?.[0])} />
        </label>
      </div>
      <div className="dform-field">
        <label>Contact name</label>
        <input value={f.contact_name} onChange={(e) => setF({ ...f, contact_name: e.target.value })} />
      </div>
      <div className="dform-field">
        <label>Phone</label>
        <input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} placeholder="+1 876 …" />
      </div>
      <div className="dform-field">
        <label>WhatsApp</label>
        <input value={f.whatsapp} onChange={(e) => setF({ ...f, whatsapp: e.target.value })} placeholder="+1 876 …" />
      </div>
      <div className="dform-field">
        <label>Website / social</label>
        <input value={f.website} onChange={(e) => setF({ ...f, website: e.target.value })} placeholder="Optional" />
      </div>
      {me.kind === "realtor" && (
        <div className="dform-field">
          <label>REB registration number</label>
          <input
            value={f.reb_number}
            onChange={(e) => setF({ ...f, reb_number: e.target.value })}
            placeholder="#S-0006"
          />
          <span style={{ fontSize: 12, color: "var(--muted)", marginTop: 4, display: "block" }}>
            Real Estate Board registration · format S-XXXX (e.g. #S-0006)
          </span>
        </div>
      )}
      <div className="dform-field">
        <label>About</label>
        <textarea rows={3} value={f.bio} onChange={(e) => setF({ ...f, bio: e.target.value })}
          placeholder="A short description of your business." />
      </div>
      <div className="dform-field">
        <label>Parishes served</label>
        <button type="button" onClick={toggleIslandwide}
          className="kind-pill" data-active={islandwide}
          style={{ marginBottom: 8 }}>
          Islandwide (all parishes)
        </button>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, opacity: islandwide ? 0.4 : 1, pointerEvents: islandwide ? "none" : "auto" }}>
          {PARISHES.map((p) => (
            <button type="button" key={p} onClick={() => toggleParish(p)}
              className="kind-pill" data-active={f.parishes.includes(p)}>
              {p}
            </button>
          ))}
        </div>
        <span style={{ fontSize: 12, color: "var(--muted)", marginTop: 6, display: "block" }}>
          {islandwide
            ? "Serving all of Jamaica."
            : f.parishes.length
              ? `Serving ${f.parishes.length} ${f.parishes.length === 1 ? "parish" : "parishes"}.`
              : "Select the parishes you serve, or choose Islandwide."}
        </span>
      </div>
      <button className="btn btn-gold" onClick={save} disabled={busy}>
        {busy ? "Saving…" : "Save profile"}
      </button>
    </section>
  );
}

/* ---------------- security / password ---------------- */
function SecurityCard() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [ok, setOk] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function save() {
    setErr(null);
    setOk(false);
    if (next.length < 8) return setErr("New password must be at least 8 characters.");
    if (next !== confirm) return setErr("The new passwords don't match.");
    setBusy(true);
    try {
      await changePassword(current, next);
      setCurrent("");
      setNext("");
      setConfirm("");
      setOk(true);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not change your password.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="dash-section">
      <h2>Password</h2>
      {ok && <div className="dform-ok">Password updated.</div>}
      {err && <div className="dform-err">{err}</div>}
      <div className="dform-field">
        <label>Current password</label>
        <input type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} />
      </div>
      <div className="dform-field">
        <label>New password</label>
        <input type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} />
      </div>
      <div className="dform-field">
        <label>Confirm new password</label>
        <input type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
      </div>
      <button className="btn btn-gold" onClick={save} disabled={busy || !current || !next}>
        {busy ? "Saving…" : "Update password"}
      </button>
    </section>
  );
}

/* ---------------- realtor listings ---------------- */
const EMPTY_LISTING: Partial<Listing> = {
  title: "", description: "", parish: "", price_jmd: null,
  bedrooms: null, bathrooms: null, property_type: "", media: [], status: "published",
};

/* CSV columns (order matters): title, parish, price_jmd, bedrooms, bathrooms, property_type, description */
type CsvRow = { title: string; parish: string; price_jmd: string; bedrooms: string; bathrooms: string; property_type: string; description: string };

function parseCsv(text: string): CsvRow[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/\s+/g, "_"));
  return lines.slice(1).map((line) => {
    const vals = line.split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = vals[i] ?? ""; });
    return row as unknown as CsvRow;
  }).filter((r) => r.title);
}

function ListingsManager({ partnerId }: { partnerId: string }) {
  const [items, setItems] = useState<Listing[]>([]);
  const [form, setForm] = useState<Partial<Listing>>(EMPTY_LISTING);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [csvBusy, setCsvBusy] = useState(false);
  const [csvResult, setCsvResult] = useState<{ ok: number; err: number } | null>(null);

  const load = useCallback(async () => setItems(await getMyListings()), []);
  useEffect(() => { load(); }, [load]);

  function startEdit(l: Listing) {
    setEditingId(l.id);
    setForm({ ...l });
    window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(EMPTY_LISTING);
  }

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    try {
      const added: Media[] = [];
      for (const file of Array.from(files)) added.push(await uploadMedia(partnerId, file));
      setForm((s) => ({ ...s, media: [...(s.media ?? []), ...added] }));
    } finally {
      setUploading(false);
    }
  }

  function setDisplay(i: number) {
    setForm((s) => {
      const media = [...(s.media ?? [])];
      const [picked] = media.splice(i, 1);
      return { ...s, media: [picked, ...media] };
    });
  }

  async function submit() {
    if (!form.title?.trim()) return;
    setBusy(true);
    try {
      await saveListing({
        ...form,
        ...(editingId ? { id: editingId } : {}),
        price_jmd: form.price_jmd ? Number(form.price_jmd) : null,
        bedrooms: form.bedrooms ? Number(form.bedrooms) : null,
        bathrooms: form.bathrooms ? Number(form.bathrooms) : null,
      });
      setEditingId(null);
      setForm(EMPTY_LISTING);
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (editingId === id) cancelEdit();
    await deleteListing(id);
    await load();
  }

  const MediaPicker = () => (
    <div className="dform-field">
      <label>Photos &amp; video</label>
      <label className="btn btn-ghost" style={{ cursor: "pointer", justifySelf: "start" }}>
        {uploading ? "Uploading…" : "Add media"}
        <input type="file" accept="image/*,video/mp4" multiple hidden onChange={(e) => onFiles(e.target.files)} />
      </label>
      {!!(form.media ?? []).length && (
        <>
          <p style={{ fontSize: 12, color: "var(--muted)", margin: "8px 0 4px" }}>
            ★ = display image. Click any photo to make it the display image.
          </p>
          <div className="thumbs">
            {(form.media ?? []).map((m, i) =>
              m.type === "image" ? (
                <div key={i} style={{ position: "relative", display: "inline-block" }}>
                  <img
                    className="t"
                    src={m.url}
                    alt=""
                    onClick={() => setDisplay(i)}
                    style={{ cursor: "pointer", outline: i === 0 ? "2px solid var(--gold)" : "none" }}
                  />
                  {i === 0 && (
                    <span style={{ position: "absolute", top: 2, left: 2, background: "var(--gold)", color: "#000", fontSize: 10, fontWeight: 700, padding: "1px 4px", borderRadius: 3 }}>
                      ★
                    </span>
                  )}
                </div>
              ) : (
                <video className="t" key={i} src={m.url} muted />
              ),
            )}
          </div>
        </>
      )}
    </div>
  );

  return (
    <section className="dash-section">
      <h2>Your property listings</h2>
      <p style={{ color: "var(--muted)", fontSize: 14, marginBottom: 14 }}>
        Add a property with photos &amp; video. Buyers find it in the directory.
      </p>

      {/* ── Bulk CSV upload ── */}
      <details style={{ marginBottom: 16 }}>
        <summary style={{ cursor: "pointer", fontWeight: 600, fontSize: 14, color: "var(--ink)", userSelect: "none", padding: "10px 0" }}>
          Bulk upload listings via CSV
        </summary>
        <div style={{ background: "var(--paper)", border: "1px solid var(--line)", borderRadius: 12, padding: "16px 18px", marginTop: 8 }}>
          <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 10, lineHeight: 1.55 }}>
            Upload a CSV with columns: <code style={{ background: "var(--paper-2)", padding: "1px 5px", borderRadius: 4, fontSize: 12 }}>title, parish, price_jmd, bedrooms, bathrooms, property_type, description</code>
          </p>
          <a
            href="data:text/csv;charset=utf-8,title,parish,price_jmd,bedrooms,bathrooms,property_type,description%0A3-bed%20house%20Kingston,Kingston,25000000,3,2,House,Spacious%203-bed%20in%20Kingston%206"
            download="listings-template.csv"
            style={{ fontSize: 12.5, color: "var(--gold-deep)", marginBottom: 10, display: "inline-block" }}
          >
            ↓ Download template
          </a>
          {csvResult && (
            <div className={csvResult.err ? "dform-err" : "dform-ok"} style={{ marginBottom: 10 }}>
              {csvResult.ok} listing{csvResult.ok !== 1 ? "s" : ""} added{csvResult.err ? `, ${csvResult.err} skipped (missing title)` : " successfully"}.
            </div>
          )}
          <label className="btn btn-ghost" style={{ cursor: "pointer", display: "inline-flex" }}>
            {csvBusy ? "Importing…" : "Choose CSV file"}
            <input
              type="file"
              accept=".csv,text/csv"
              hidden
              disabled={csvBusy}
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setCsvBusy(true);
                setCsvResult(null);
                const text = await file.text();
                const rows = parseCsv(text);
                let ok = 0; let err = 0;
                for (const row of rows) {
                  if (!row.title) { err++; continue; }
                  try {
                    await saveListing({
                      title: row.title,
                      parish: row.parish || null,
                      price_jmd: row.price_jmd ? Number(row.price_jmd) : null,
                      bedrooms: row.bedrooms ? Number(row.bedrooms) : null,
                      bathrooms: row.bathrooms ? Number(row.bathrooms) : null,
                      property_type: row.property_type || null,
                      description: row.description || null,
                      media: [],
                      status: "published",
                    });
                    ok++;
                  } catch { err++; }
                }
                setCsvResult({ ok, err });
                setCsvBusy(false);
                e.target.value = "";
                await load();
              }}
            />
          </label>
        </div>
      </details>

      {items.map((l) => (
        <div className="item-row" key={l.id}>
          <div>
            <strong>{l.title}</strong>
            <div style={{ fontSize: 13, color: "var(--muted)" }}>
              {l.parish || "—"}
              {l.price_jmd ? ` · J$${l.price_jmd.toLocaleString()}` : ""} · {l.status}
            </div>
            {!!(l.media ?? []).length && (
              <div className="thumbs">
                {l.media.filter((m) => m.type === "image").slice(0, 4).map((m, i) => (
                  <img className="t" key={i} src={m.url} alt="" style={{ outline: i === 0 ? "2px solid var(--gold)" : "none" }} />
                ))}
              </div>
            )}
          </div>
          <div className="row-actions">
            <button className="link-btn" onClick={() => startEdit(l)}>Edit</button>
            <button className="link-btn danger" onClick={() => remove(l.id)}>Delete</button>
          </div>
        </div>
      ))}

      <div className="dir-form" style={{ margin: "16px 0 0", maxWidth: "none" }}>
        <h3 style={{ fontFamily: "var(--serif)", color: "var(--ink)", marginBottom: 12 }}>
          {editingId ? "Edit listing" : "Add a listing"}
        </h3>
        <div className="dform-field">
          <label>Title</label>
          <input value={form.title ?? ""} onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="3-bed townhouse, Mandeville" />
        </div>
        <div className="dform-field">
          <label>Parish</label>
          <select value={form.parish ?? ""} onChange={(e) => setForm({ ...form, parish: e.target.value })}>
            <option value="">Select…</option>
            {PARISHES.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div className="dform-field">
          <label>Price (J$)</label>
          <input type="number" value={form.price_jmd ?? ""} onChange={(e) => setForm({ ...form, price_jmd: e.target.value as unknown as number })} placeholder="25000000" />
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <div className="dform-field" style={{ flex: 1 }}>
            <label>Beds</label>
            <input type="number" value={form.bedrooms ?? ""} onChange={(e) => setForm({ ...form, bedrooms: e.target.value as unknown as number })} />
          </div>
          <div className="dform-field" style={{ flex: 1 }}>
            <label>Baths</label>
            <input type="number" value={form.bathrooms ?? ""} onChange={(e) => setForm({ ...form, bathrooms: e.target.value as unknown as number })} />
          </div>
        </div>
        <div className="dform-field">
          <label>Description</label>
          <textarea rows={3} value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
        <MediaPicker />
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn btn-gold" onClick={submit} disabled={busy || uploading}>
            {busy ? "Saving…" : editingId ? "Save changes" : "Add listing"}
          </button>
          {editingId && (
            <button className="btn btn-ghost" onClick={cancelEdit}>Cancel</button>
          )}
        </div>
      </div>
    </section>
  );
}

/* ---------------- surveyor / valuator services ---------------- */
function ServicesManager({ partnerId, kindLabel }: { partnerId: string; kindLabel: string }) {
  void partnerId;
  const [items, setItems] = useState<Service[]>([]);
  const [form, setForm] = useState<Partial<Service>>({ name: "", description: "", fee_text: "", status: "published" });
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => setItems(await getMyServices()), []);
  useEffect(() => { load(); }, [load]);

  async function submit() {
    if (!form.name?.trim()) return;
    setBusy(true);
    try {
      await saveService(form);
      setForm({ name: "", description: "", fee_text: "", status: "published" });
      await load();
    } finally {
      setBusy(false);
    }
  }
  async function remove(id: string) {
    await deleteService(id);
    await load();
  }

  return (
    <section className="dash-section">
      <h2>Your {kindLabel} services</h2>
      <p style={{ color: "var(--muted)", fontSize: 14, marginBottom: 14 }}>
        List the services you offer and your fees. Clients find them in the directory.
      </p>

      {items.map((s) => (
        <div className="item-row" key={s.id}>
          <div>
            <strong>{s.name}</strong>
            <div style={{ fontSize: 13, color: "var(--muted)" }}>
              {s.fee_text || "Fee on request"} · {s.status}
            </div>
          </div>
          <div className="row-actions">
            <button className="link-btn danger" onClick={() => remove(s.id)}>Delete</button>
          </div>
        </div>
      ))}

      <div className="dir-form" style={{ margin: "16px 0 0", maxWidth: "none" }}>
        <h3 style={{ fontFamily: "var(--serif)", color: "var(--ink)", marginBottom: 12 }}>Add a service</h3>
        <div className="dform-field">
          <label>Service name</label>
          <input value={form.name ?? ""} onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="e.g. Residential property valuation" />
        </div>
        <div className="dform-field">
          <label>Fee</label>
          <input value={form.fee_text ?? ""} onChange={(e) => setForm({ ...form, fee_text: e.target.value })}
            placeholder="e.g. From J$45,000" />
        </div>
        <div className="dform-field">
          <label>Description</label>
          <textarea rows={3} value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
        <button className="btn btn-gold" onClick={submit} disabled={busy}>
          {busy ? "Saving…" : "Add service"}
        </button>
      </div>
    </section>
  );
}
