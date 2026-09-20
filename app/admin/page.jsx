"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Lock, LogOut, Plus, Trash2, Pencil, Upload, Link2, Check,
  Image as ImageIcon, Video as VideoIcon, Star, Mail, Inbox, Film, Users, Loader2,
} from "lucide-react";
import {
  onAuthStateChanged, signInWithEmailAndPassword, signOut,
  sendPasswordResetEmail, EmailAuthProvider, reauthenticateWithCredential, updatePassword,
} from "firebase/auth";
import { auth } from "../../lib/firebase";
import {
  subscribeProfile, saveProfile,
  subscribeVideos, addVideo, updateVideo, deleteVideo,
  subscribeTestimonials, addTestimonial, updateTestimonial, deleteTestimonial,
  subscribeMessages, deleteMessage,
  resizeImageToDataUrl,
} from "../../lib/data";

/* ---------------------------------------------------------------
   TOKENS — black + gold (matches the public site)
--------------------------------------------------------------- */
const C = {
  bg: "#0A0908",
  panel: "#151310",
  border: "#2A2721",
  text: "#F5F1E8",
  muted: "#9B9488",
  gold: "#D4A03A",
  goldDim: "rgba(212,160,58,.14)",
  danger: "#FF6B5E",
};

const VIDEO_TYPES = ["Reel", "Ad", "Podcast Clip", "Talking Head", "Motion Graphics", "Testimonial", "Product Showcase", "AI Voiceover"];
const ORIENTATIONS = [
  { v: "auto", label: "Auto-detect" },
  { v: "vertical", label: "Vertical (9:16 — Reels, Shorts)" },
  { v: "horizontal", label: "Horizontal (16:9 — YouTube, Ads)" },
];
const CATEGORY_SUGGESTIONS = ["Short Form", "Long Form", "Brand", "Music Video", "Documentary"];
const IMAGE_ACCEPT = "image/jpeg,image/png,image/webp,image/gif";

const defaultProfile = {
  name: "Your Name",
  eyebrow: "Video Editor · Short-Form Specialist",
  bio: "Add your bio here.",
  avatar: "",
  available: true,
  instagram: "", linkedin: "", upwork: "", whatsapp: "",
  editsCount: null, reviewsCount: null, formatsCount: null,
};

function timeAgo(ts) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(ts).toLocaleDateString();
}

/* ---------------------------------------------------------------
   STYLE HELPERS
--------------------------------------------------------------- */
function FieldLabelDark({ children }) {
  return <label style={{ display: "block", fontSize: 11, fontWeight: 700, letterSpacing: 0.6, textTransform: "uppercase", color: C.muted, marginBottom: 6 }}>{children}</label>;
}
const darkInputStyle = { width: "100%", padding: "11px 13px", borderRadius: 10, border: `1px solid ${C.border}`, fontSize: 14, background: "#0F0D0B", color: C.text };
const darkTextareaStyle = { ...darkInputStyle, minHeight: 90, resize: "vertical" };
const ghostBtn = { display: "flex", alignItems: "center", gap: 6, background: "transparent", border: `1px solid ${C.border}`, color: C.text, padding: "8px 13px", borderRadius: 10, fontSize: 12.5, fontWeight: 600, cursor: "pointer" };
const darkCard = { background: C.panel, border: `1px solid ${C.border}`, borderRadius: 18, padding: 24 };
const primaryBtn = { width: "100%", padding: "13px", borderRadius: 12, border: "none", background: C.gold, color: "#0A0908", fontWeight: 700, fontSize: 14.5, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 };
const iconBtnDark = { width: 34, height: 34, borderRadius: 9, border: `1px solid ${C.border}`, background: "#0F0D0B", color: C.text, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 };

function Toast({ message }) {
  if (!message) return null;
  return (
    <div style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", zIndex: 200 }} className="pop-in">
      <div style={{ background: C.gold, color: C.bg, padding: "12px 20px", borderRadius: 999, fontSize: 14, fontWeight: 700, boxShadow: "0 10px 30px rgba(0,0,0,.4)", display: "flex", alignItems: "center", gap: 8 }}>
        <Check size={16} /> {message}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------
   PAGE — auth gate
--------------------------------------------------------------- */
export default function AdminPage() {
  const [authChecked, setAuthChecked] = useState(false);
  const [user, setUser] = useState(null);
  const [toast, setToast] = useState("");
  const toastTimer = useRef(null);

  const notify = (msg) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 3200);
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => { setUser(u); setAuthChecked(true); });
    return unsub;
  }, []);

  if (!authChecked) {
    return (
      <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Loader2 size={26} className="ring-spin" color={C.gold} />
      </div>
    );
  }

  return (
    <div>
      {!user ? <AdminLogin /> : <Dashboard user={user} notify={notify} />}
      <Toast message={toast} />
    </div>
  );
}

/* ---------------------------------------------------------------
   LOGIN — real Firebase email/password auth
--------------------------------------------------------------- */
function AdminLogin() {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const submit = async () => {
    setError(""); setBusy(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), pw);
    } catch (e) {
      setError(e.code === "auth/invalid-credential" || e.code === "auth/wrong-password" || e.code === "auth/user-not-found"
        ? "Incorrect email or password."
        : e.message);
    }
    setBusy(false);
  };

  const forgotPassword = async () => {
    if (!email.trim()) { setError("Enter your admin email first, then tap this again."); return; }
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setResetSent(true);
      setError("");
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div className="pop-in" style={{ width: "100%", maxWidth: 360, background: C.panel, border: `1px solid ${C.border}`, borderRadius: 18, padding: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 22 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: C.gold, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Lock size={17} color="#0A0908" />
          </div>
          <div>
            <div style={{ color: C.text, fontWeight: 800, fontSize: 16 }}>Studio Admin</div>
            <div style={{ color: C.muted, fontSize: 12 }}>Sign in to manage your portfolio</div>
          </div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <FieldLabelDark>Email</FieldLabelDark>
          <input type="email" value={email} onChange={(e) => { setEmail(e.target.value); setError(""); }} style={darkInputStyle} placeholder="you@studio.com" autoFocus />
        </div>
        <div>
          <FieldLabelDark>Password</FieldLabelDark>
          <input type="password" value={pw} onChange={(e) => { setPw(e.target.value); setError(""); }}
            onKeyDown={(e) => { if (e.key === "Enter") submit(); }} style={darkInputStyle} placeholder="••••••••" />
        </div>

        {error && <div style={{ color: C.danger, fontSize: 12.5, marginTop: 10 }}>{error}</div>}
        {resetSent && <div style={{ color: C.gold, fontSize: 12.5, marginTop: 10 }}>Password reset email sent.</div>}

        <button disabled={busy} onClick={submit} style={{ marginTop: 16, ...primaryBtn }}>
          {busy ? <Loader2 size={16} className="ring-spin" /> : <Lock size={15} />} Sign in
        </button>
        <button onClick={forgotPassword} style={{ marginTop: 12, width: "100%", background: "none", border: "none", color: C.muted, fontSize: 12.5, cursor: "pointer" }}>
          Forgot password?
        </button>
        <div style={{ marginTop: 14, fontSize: 11.5, color: C.muted, textAlign: "center", lineHeight: 1.5 }}>
          Admin accounts are created in the Firebase Console under Authentication — see the README.
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------
   DASHBOARD SHELL
--------------------------------------------------------------- */
function Dashboard({ user, notify }) {
  const [tab, setTab] = useState("videos");
  const [profile, setProfile] = useState(defaultProfile);
  const [videos, setVideos] = useState([]);
  const [testimonials, setTestimonials] = useState([]);
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    const unsubP = subscribeProfile((p) => setProfile(p || defaultProfile));
    const unsubV = subscribeVideos(setVideos);
    const unsubT = subscribeTestimonials(setTestimonials);
    const unsubM = subscribeMessages(setMessages);
    return () => { unsubP(); unsubV(); unsubT(); unsubM(); };
  }, []);

  const pendingCount = testimonials.filter((t) => t.source === "viewer" && !t.approved).length;
  const tabs = [
    { id: "videos", label: "Videos", icon: <Film size={15} /> },
    { id: "testimonials", label: "Testimonials", icon: <Star size={15} />, badge: pendingCount },
    { id: "messages", label: "Messages", icon: <Inbox size={15} />, badge: messages.length },
    { id: "profile", label: "Profile", icon: <Users size={15} /> },
  ];

  return (
    <div style={{ minHeight: "100vh", background: C.bg }}>
      <div style={{ borderBottom: `1px solid ${C.border}`, position: "sticky", top: 0, background: "rgba(10,9,8,.92)", backdropFilter: "blur(6px)", zIndex: 10 }}>
        <div style={{ maxWidth: 1040, margin: "0 auto", padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: C.gold, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Lock size={14} color="#0A0908" />
            </div>
            <span style={{ color: C.text, fontWeight: 800, fontSize: 15 }}>Studio Admin</span>
          </div>
          <div className="no-scrollbar" style={{ display: "flex", gap: 6, overflowX: "auto" }}>
            {tabs.map((t) => (
              <button key={t.id} onClick={() => setTab(t.id)} style={{
                display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 999, fontSize: 13, fontWeight: 600, cursor: "pointer", flexShrink: 0,
                border: `1px solid ${tab === t.id ? C.gold : C.border}`, background: tab === t.id ? C.goldDim : "transparent",
                color: tab === t.id ? C.gold : C.muted,
              }}>
                {t.icon} {t.label}
                {!!t.badge && <span style={{ background: C.gold, color: "#0A0908", fontSize: 10, fontWeight: 800, borderRadius: 999, padding: "1px 6px", marginLeft: 2 }}>{t.badge}</span>}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ color: C.muted, fontSize: 12 }}>{user.email}</span>
            <button onClick={() => signOut(auth)} style={ghostBtn}><LogOut size={13} /> Logout</button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1040, margin: "0 auto", padding: "28px 20px 80px" }}>
        {tab === "videos" && <AdminVideos videos={videos} notify={notify} />}
        {tab === "testimonials" && <AdminTestimonials testimonials={testimonials} notify={notify} />}
        {tab === "messages" && <AdminMessages messages={messages} notify={notify} />}
        {tab === "profile" && <AdminProfile profile={profile} user={user} notify={notify} />}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------
   VIDEOS TAB — link-only now (no Storage means no room for real
   video files; only thumbnails, which are small, go through Firestore)
--------------------------------------------------------------- */
const emptyVideoForm = { id: null, title: "", client: "", description: "", category: "", type: "", orientation: "auto", videoUrl: "", thumbnail: "" };

function AdminVideos({ videos, notify }) {
  const [form, setForm] = useState(emptyVideoForm);
  const [editingId, setEditingId] = useState(null);
  const [busy, setBusy] = useState(false);

  const reset = () => { setForm(emptyVideoForm); setEditingId(null); };

  const handleThumbFile = async (file) => {
    if (!file) return;
    setBusy(true);
    try {
      const dataUrl = await resizeImageToDataUrl(file, { maxWidth: 640, quality: 0.75 });
      setForm((f) => ({ ...f, thumbnail: dataUrl }));
    } catch (e) {
      notify("Thumbnail failed: " + e.message);
    } finally {
      setBusy(false);
    }
  };

  const submit = async () => {
    if (!form.title.trim()) { notify("Give the video a title."); return; }
    if (!form.videoUrl.trim()) { notify("Add a video link (YouTube, Vimeo, Drive, etc.)."); return; }
    setBusy(true);
    const record = {
      title: form.title.trim(),
      client: form.client.trim(),
      description: form.description.trim(),
      category: form.category.trim() || "Uncategorized",
      type: form.type || "Reel",
      orientation: form.orientation,
      videoUrl: form.videoUrl.trim(),
      thumbnail: form.thumbnail,
      sourceType: "link",
    };
    try {
      if (editingId) await updateVideo(editingId, record);
      else await addVideo(record);
      notify(editingId ? "Video updated." : "Video added.");
      reset();
    } catch (e) {
      notify("Save failed: " + e.message);
    }
    setBusy(false);
  };

  const startEdit = (v) => {
    setForm({
      id: v.id, title: v.title, client: v.client,
      description: v.description, category: v.category, type: v.type, orientation: v.orientation,
      videoUrl: v.videoUrl || "", thumbnail: v.thumbnail || "",
    });
    setEditingId(v.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const remove = async (v) => {
    await deleteVideo(v.id);
    notify("Video removed.");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={darkCard}>
        <h2 style={{ margin: "0 0 6px", color: C.text, fontSize: 18, fontWeight: 800 }}>{editingId ? "Edit Video" : "Add Video"}</h2>
        <p style={{ color: C.muted, fontSize: 12.5, marginTop: 0, marginBottom: 20, display: "flex", alignItems: "center", gap: 6 }}>
          <Link2 size={13} /> Link only — host your video on YouTube, Vimeo, or Google Drive and paste the link below.
        </p>

        <div style={{ marginBottom: 16 }}>
          <FieldLabelDark>Video URL (YouTube, Vimeo, Drive, etc.)</FieldLabelDark>
          <input style={darkInputStyle} placeholder="https://youtube.com/watch?v=..." value={form.videoUrl} onChange={(e) => setForm((f) => ({ ...f, videoUrl: e.target.value }))} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
          <div>
            <FieldLabelDark>Project Title</FieldLabelDark>
            <input style={darkInputStyle} placeholder="Brand Story Reel" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
          </div>
          <div>
            <FieldLabelDark>Client Name (internal only)</FieldLabelDark>
            <input style={darkInputStyle} placeholder="Lumio Skincare" value={form.client} onChange={(e) => setForm((f) => ({ ...f, client: e.target.value }))} />
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <FieldLabelDark>Description</FieldLabelDark>
          <textarea style={darkTextareaStyle} placeholder="What was the goal? What result did this achieve?" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
          <div>
            <FieldLabelDark>Category</FieldLabelDark>
            <input style={darkInputStyle} list="cat-suggestions" placeholder="Short Form" value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} />
            <datalist id="cat-suggestions">{CATEGORY_SUGGESTIONS.map((c) => <option key={c} value={c} />)}</datalist>
          </div>
          <div>
            <FieldLabelDark>Video Type</FieldLabelDark>
            <select style={darkInputStyle} value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}>
              <option value="">Select type</option>
              {VIDEO_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
          <div>
            <FieldLabelDark>Orientation</FieldLabelDark>
            <select style={darkInputStyle} value={form.orientation} onChange={(e) => setForm((f) => ({ ...f, orientation: e.target.value }))}>
              {ORIENTATIONS.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <FieldLabelDark>Thumbnail Image</FieldLabelDark>
            <label style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, border: `1px dashed ${C.border}`, borderRadius: 10, padding: "11px", cursor: "pointer", background: "#0F0D0B" }}>
              {busy ? <Loader2 size={16} className="ring-spin" color={C.muted} /> : form.thumbnail ? <img src={form.thumbnail} alt="thumb" style={{ width: 24, height: 24, borderRadius: 4, objectFit: "cover" }} /> : <ImageIcon size={16} color={C.muted} />}
              <span style={{ color: C.muted, fontSize: 13, textDecoration: "underline" }}>Choose thumbnail</span>
              <input type="file" accept={IMAGE_ACCEPT} style={{ display: "none" }} onChange={(e) => handleThumbFile(e.target.files?.[0])} />
            </label>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button disabled={busy} onClick={submit} style={primaryBtn}>
            {busy ? <Loader2 size={16} className="ring-spin" /> : <Plus size={16} />} {editingId ? "Save Changes" : "Add Video"}
          </button>
          {editingId && <button onClick={reset} style={{ ...ghostBtn, padding: "13px 18px" }}>Cancel</button>}
        </div>
      </div>

      <div style={darkCard}>
        <h3 style={{ margin: "0 0 16px", color: C.text, fontSize: 15, fontWeight: 800 }}>All Videos ({videos.length})</h3>
        {videos.length === 0 ? (
          <div style={{ color: C.muted, fontSize: 13.5, textAlign: "center", padding: "24px 0" }}>No videos yet — add your first one above.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {videos.map((v) => (
              <div key={v.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: 12, borderRadius: 12, border: `1px solid ${C.border}` }}>
                <div style={{ width: 52, height: 52, borderRadius: 8, overflow: "hidden", background: `linear-gradient(135deg, ${C.gold}, #0F0D0B)`, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {v.thumbnail ? <img src={v.thumbnail} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <VideoIcon size={18} color="#fff" />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: C.text, fontWeight: 700, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v.title}</div>
                  <div style={{ color: C.muted, fontSize: 12 }}>{v.client || "No client set"} · {v.category} · {v.type}</div>
                </div>
                <button onClick={() => startEdit(v)} style={iconBtnDark}><Pencil size={14} /></button>
                <button onClick={() => remove(v)} style={iconBtnDark}><Trash2 size={14} color={C.danger} /></button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------
   TESTIMONIALS TAB
--------------------------------------------------------------- */
function AdminTestimonials({ testimonials, notify }) {
  const [form, setForm] = useState({ name: "", role: "", text: "", rating: 5 });

  const add = async () => {
    if (!form.name.trim() || !form.text.trim()) { notify("Add a client name and review text."); return; }
    await addTestimonial({ name: form.name.trim(), role: form.role.trim(), text: form.text.trim(), rating: form.rating, source: "admin", approved: true });
    setForm({ name: "", role: "", text: "", rating: 5 });
    notify("Testimonial added.");
  };
  const toggleApprove = async (t) => { await updateTestimonial(t.id, { approved: !t.approved }); };
  const remove = async (id) => { await deleteTestimonial(id); notify("Testimonial removed."); };

  const pending = testimonials.filter((t) => t.source === "viewer" && !t.approved);
  const rest = testimonials.filter((t) => !(t.source === "viewer" && !t.approved));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={darkCard}>
        <h2 style={{ margin: 0, color: C.text, fontSize: 18, fontWeight: 800 }}>Testimonials</h2>
        <p style={{ color: C.muted, fontSize: 13, marginTop: 4, marginBottom: 20 }}>Add Upwork or client reviews shown in the scrolling carousel.</p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
          <div>
            <FieldLabelDark>Client Name</FieldLabelDark>
            <input style={darkInputStyle} placeholder="Marcus Rowe" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </div>
          <div>
            <FieldLabelDark>Role / Platform</FieldLabelDark>
            <input style={darkInputStyle} placeholder="Upwork Client · E-commerce" value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))} />
          </div>
        </div>
        <div style={{ marginBottom: 16 }}>
          <FieldLabelDark>Review Text</FieldLabelDark>
          <textarea style={darkTextareaStyle} placeholder="Write the review exactly as the client said it..." value={form.text} onChange={(e) => setForm((f) => ({ ...f, text: e.target.value }))} />
        </div>
        <div style={{ marginBottom: 20 }}>
          <FieldLabelDark>Star Rating</FieldLabelDark>
          <div style={{ display: "flex", gap: 4 }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <button key={i} onClick={() => setForm((f) => ({ ...f, rating: i + 1 }))} style={{ background: "none", border: "none", cursor: "pointer", padding: 2 }}>
                <Star size={22} color={C.gold} fill={i < form.rating ? C.gold : "none"} />
              </button>
            ))}
          </div>
        </div>
        <button onClick={add} style={primaryBtn}><Plus size={16} /> Add Testimonial</button>
      </div>

      {pending.length > 0 && (
        <div style={darkCard}>
          <h3 style={{ margin: "0 0 14px", color: C.text, fontSize: 15, fontWeight: 800 }}>Pending approval ({pending.length})</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {pending.map((t) => (
              <div key={t.id} style={{ border: `1px solid ${C.gold}`, borderRadius: 12, padding: 14 }}>
                <TestimonialAdminRow t={t} onApprove={() => toggleApprove(t)} onRemove={() => remove(t.id)} />
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={darkCard}>
        <h3 style={{ margin: "0 0 14px", color: C.text, fontSize: 15, fontWeight: 800 }}>Published ({rest.filter((t) => t.approved).length})</h3>
        {rest.length === 0 ? (
          <div style={{ color: C.muted, fontSize: 13.5, textAlign: "center", padding: "24px 0" }}>No testimonials yet.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {rest.map((t) => (
              <div key={t.id} style={{ border: `1px solid ${C.border}`, borderRadius: 12, padding: 14 }}>
                <TestimonialAdminRow t={t} onApprove={() => toggleApprove(t)} onRemove={() => remove(t.id)} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TestimonialAdminRow({ t, onApprove, onRemove }) {
  return (
    <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4, flexWrap: "wrap" }}>
          <span style={{ color: C.text, fontWeight: 700, fontSize: 13.5 }}>{t.name}</span>
          <span style={{ color: C.muted, fontSize: 11.5 }}>{t.role}</span>
          {t.source === "viewer" && (
            <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 999, background: t.approved ? "rgba(212,160,58,.15)" : "rgba(255,255,255,.08)", color: t.approved ? C.gold : C.muted }}>
              {t.approved ? "Published" : "Pending"}
            </span>
          )}
        </div>
        <div style={{ display: "flex", gap: 2, marginBottom: 6 }}>
          {Array.from({ length: 5 }).map((_, i) => <Star key={i} size={12} color={C.gold} fill={i < t.rating ? C.gold : "none"} />)}
        </div>
        <p style={{ margin: 0, color: C.muted, fontSize: 13, lineHeight: 1.5 }}>{t.text}</p>
        <div style={{ fontSize: 11, color: C.muted, marginTop: 6 }}>{timeAgo(t.createdAt)}</div>
      </div>
      <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
        <button onClick={onApprove} style={iconBtnDark} title={t.approved ? "Unpublish" : "Approve"}>
          <Check size={14} color={t.approved ? C.gold : C.muted} />
        </button>
        <button onClick={onRemove} style={iconBtnDark} title="Delete"><Trash2 size={14} color={C.danger} /></button>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------
   MESSAGES TAB
--------------------------------------------------------------- */
function AdminMessages({ messages, notify }) {
  const remove = async (id) => { await deleteMessage(id); notify("Message deleted."); };
  return (
    <div style={darkCard}>
      <h2 style={{ margin: 0, color: C.text, fontSize: 18, fontWeight: 800 }}>Offer Requests</h2>
      <p style={{ color: C.muted, fontSize: 13, marginTop: 4, marginBottom: 20 }}>Messages sent from the "Customize Offer" button on your site.</p>
      {messages.length === 0 ? (
        <div style={{ color: C.muted, fontSize: 13.5, textAlign: "center", padding: "36px 0" }}>
          <Inbox size={22} style={{ marginBottom: 8 }} />
          <div>No messages yet — offers will land here.</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {messages.map((m) => (
            <div key={m.id} style={{ border: `1px solid ${C.border}`, borderRadius: 12, padding: 14, display: "flex", gap: 12, alignItems: "flex-start" }}>
              <div style={{ width: 34, height: 34, borderRadius: "50%", background: C.goldDim, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Mail size={15} color={C.gold} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                  <a href={`mailto:${m.email}`} style={{ color: C.text, fontWeight: 700, fontSize: 13.5, textDecoration: "none" }}>{m.email}</a>
                  <span style={{ color: C.muted, fontSize: 11.5 }}>{timeAgo(m.createdAt)}</span>
                </div>
                <p style={{ margin: "6px 0 0", color: C.muted, fontSize: 13, lineHeight: 1.5 }}>{m.message}</p>
              </div>
              <button onClick={() => remove(m.id)} style={iconBtnDark}><Trash2 size={14} color={C.danger} /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------
   PROFILE TAB
--------------------------------------------------------------- */
function AdminProfile({ profile, user, notify }) {
  const [form, setForm] = useState(profile);
  const [pwForm, setPwForm] = useState({ current: "", next: "", confirm: "" });
  const [pwError, setPwError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { setForm(profile); }, [profile]);

  // Compresses to base64 and saves straight to your profile document — no
  // Storage bucket involved, and it saves the instant it finishes so it
  // can never get "stuck" waiting on a separate Save click.
  const handleAvatar = async (file) => {
    if (!file) return;
    setBusy(true);
    try {
      const dataUrl = await resizeImageToDataUrl(file, { maxWidth: 400, quality: 0.85 });
      setForm((f) => ({ ...f, avatar: dataUrl }));
      await saveProfile({ avatar: dataUrl });
      notify("Photo updated.");
    } catch (e) {
      notify("Photo upload failed: " + e.message);
    } finally {
      setBusy(false);
    }
  };

  const save = async () => { await saveProfile(form); notify("Profile updated."); };

  const changePassword = async () => {
    setPwError("");
    if (pwForm.next.length < 6) { setPwError("New password must be at least 6 characters."); return; }
    if (pwForm.next !== pwForm.confirm) { setPwError("Passwords don't match."); return; }
    try {
      const cred = EmailAuthProvider.credential(user.email, pwForm.current);
      await reauthenticateWithCredential(user, cred);
      await updatePassword(user, pwForm.next);
      setPwForm({ current: "", next: "", confirm: "" });
      notify("Password updated.");
    } catch (e) {
      setPwError(e.code === "auth/wrong-password" ? "Current password is incorrect." : e.message);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={darkCard}>
        <h2 style={{ margin: "0 0 20px", color: C.text, fontSize: 18, fontWeight: 800 }}>Profile</h2>

        <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 8 }}>
          <div style={{ width: 72, height: 72, borderRadius: "50%", overflow: "hidden", background: "#0F0D0B", border: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            {form.avatar ? <img src={form.avatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <Users size={26} color={C.muted} />}
          </div>
          <label style={{ ...ghostBtn, cursor: "pointer" }}>
            {busy ? <Loader2 size={13} className="ring-spin" /> : <Upload size={13} />} Change photo
            <input type="file" accept={IMAGE_ACCEPT} style={{ display: "none" }} onChange={(e) => handleAvatar(e.target.files?.[0])} />
          </label>
        </div>
        <div style={{ fontSize: 11.5, color: C.muted, marginBottom: 22 }}>Saves automatically as soon as it uploads.</div>

        <div style={{ marginBottom: 16 }}>
          <FieldLabelDark>Name</FieldLabelDark>
          <input style={darkInputStyle} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
        </div>
        <div style={{ marginBottom: 16 }}>
          <FieldLabelDark>Eyebrow / Title</FieldLabelDark>
          <input style={darkInputStyle} value={form.eyebrow} onChange={(e) => setForm((f) => ({ ...f, eyebrow: e.target.value }))} placeholder="Video Editor · Short-Form Specialist" />
        </div>
        <div style={{ marginBottom: 16 }}>
          <FieldLabelDark>Bio</FieldLabelDark>
          <textarea style={darkTextareaStyle} value={form.bio} onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))} />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
          <input id="avail" type="checkbox" checked={!!form.available} onChange={(e) => setForm((f) => ({ ...f, available: e.target.checked }))} />
          <label htmlFor="avail" style={{ color: C.text, fontSize: 13.5 }}>Show "Available for new projects" badge</label>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
          <div>
            <FieldLabelDark>Instagram URL</FieldLabelDark>
            <input style={darkInputStyle} value={form.instagram} onChange={(e) => setForm((f) => ({ ...f, instagram: e.target.value }))} />
          </div>
          <div>
            <FieldLabelDark>LinkedIn URL</FieldLabelDark>
            <input style={darkInputStyle} value={form.linkedin} onChange={(e) => setForm((f) => ({ ...f, linkedin: e.target.value }))} />
          </div>
          <div>
            <FieldLabelDark>Upwork URL</FieldLabelDark>
            <input style={darkInputStyle} value={form.upwork} onChange={(e) => setForm((f) => ({ ...f, upwork: e.target.value }))} />
          </div>
          <div>
            <FieldLabelDark>WhatsApp Link</FieldLabelDark>
            <input style={darkInputStyle} value={form.whatsapp} onChange={(e) => setForm((f) => ({ ...f, whatsapp: e.target.value }))} placeholder="https://wa.me/1234567890" />
          </div>
        </div>

        <FieldLabelDark>Stat Numbers Shown On Site</FieldLabelDark>
        <p style={{ color: C.muted, fontSize: 12, marginTop: -2, marginBottom: 10 }}>Edits and Reviews auto-calculate from your real data if left blank. Success Rate defaults to 100% if left blank.</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 20 }}>
          <div>
            <FieldLabelDark>Edits</FieldLabelDark>
            <input type="number" style={darkInputStyle} value={form.editsCount ?? ""} placeholder="Auto"
              onChange={(e) => setForm((f) => ({ ...f, editsCount: e.target.value === "" ? null : Number(e.target.value) }))} />
          </div>
          <div>
            <FieldLabelDark>Reviews</FieldLabelDark>
            <input type="number" style={darkInputStyle} value={form.reviewsCount ?? ""} placeholder="Auto"
              onChange={(e) => setForm((f) => ({ ...f, reviewsCount: e.target.value === "" ? null : Number(e.target.value) }))} />
          </div>
          <div>
            <FieldLabelDark>Success Rate (%)</FieldLabelDark>
            <input type="number" style={darkInputStyle} value={form.formatsCount ?? ""} placeholder="100"
              onChange={(e) => setForm((f) => ({ ...f, formatsCount: e.target.value === "" ? null : Number(e.target.value) }))} />
          </div>
        </div>

        <button onClick={save} style={primaryBtn}><Check size={16} /> Save Profile</button>
      </div>

      <div style={darkCard}>
        <h3 style={{ margin: "0 0 6px", color: C.text, fontSize: 15, fontWeight: 800 }}>Change Admin Password</h3>
        <p style={{ color: C.muted, fontSize: 12.5, marginTop: 0, marginBottom: 16 }}>Signed in as {user.email}</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 12 }}>
          <div>
            <FieldLabelDark>Current</FieldLabelDark>
            <input type="password" style={darkInputStyle} value={pwForm.current} onChange={(e) => setPwForm((f) => ({ ...f, current: e.target.value }))} />
          </div>
          <div>
            <FieldLabelDark>New</FieldLabelDark>
            <input type="password" style={darkInputStyle} value={pwForm.next} onChange={(e) => setPwForm((f) => ({ ...f, next: e.target.value }))} />
          </div>
          <div>
            <FieldLabelDark>Confirm</FieldLabelDark>
            <input type="password" style={darkInputStyle} value={pwForm.confirm} onChange={(e) => setPwForm((f) => ({ ...f, confirm: e.target.value }))} />
          </div>
        </div>
        {pwError && <div style={{ color: C.danger, fontSize: 12.5, marginBottom: 10 }}>{pwError}</div>}
        <button onClick={changePassword} style={{ ...ghostBtn, padding: "11px 18px" }}>Update password</button>
      </div>
    </div>
  );
}