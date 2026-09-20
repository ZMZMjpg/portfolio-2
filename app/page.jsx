"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  Instagram, Linkedin, Briefcase, MessageCircle, Send, Play, X, Star,
  Film, Users, Quote, Loader2, Video as VideoIcon, ExternalLink, CircleDot, Check,
  ChevronLeft, ChevronRight,
} from "lucide-react";
import { subscribeProfile, subscribeVideos, subscribeTestimonials, addMessage, addTestimonial } from "../lib/data";

/* ---------------------------------------------------------------
   TOKENS — black + gold
--------------------------------------------------------------- */
const C = {
  bg: "#0A0908",
  bgAlt: "#151310",
  border: "#2A2721",
  text: "#F5F1E8",
  textMuted: "#9B9488",
  gold: "#D4A03A",
  goldDeep: "#B5842A",
  goldGlow: "#F0C775",
  goldDim: "rgba(212,160,58,.14)",
};

const reducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const defaultProfile = {
  name: "Your Name",
  eyebrow: "Video Editor · Short-Form Specialist",
  bio: "Add your bio from the admin dashboard.",
  avatar: "",
  available: true,
  instagram: "", linkedin: "", upwork: "", whatsapp: "",
};

/* ---------------------------------------------------------------
   UTILITIES
--------------------------------------------------------------- */
function parseEmbed(url) {
  if (!url) return null;
  const yt = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{11})/);
  if (yt) return { kind: "iframe", src: `https://www.youtube.com/embed/${yt[1]}` };
  const vim = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vim) return { kind: "iframe", src: `https://player.vimeo.com/video/${vim[1]}` };
  const drv = url.match(/drive\.google\.com\/file\/d\/([\w-]+)/);
  if (drv) return { kind: "iframe", src: `https://drive.google.com/file/d/${drv[1]}/preview` };
  return { kind: "link", src: url };
}

/* ---------------------------------------------------------------
   3D / SCROLL HOOKS
--------------------------------------------------------------- */
function useReveal(threshold = 0.15) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (reducedMotion()) { setVisible(true); return; }
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); io.unobserve(el); } },
      { threshold }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);
  return [ref, visible];
}

function Reveal({ children, delay = 0, y = 40, style = {} }) {
  const [ref, visible] = useReveal();
  return (
    <div
      ref={ref}
      style={{
        transform: visible ? "perspective(1200px) rotateX(0deg) translateY(0)" : `perspective(1200px) rotateX(8deg) translateY(${y}px)`,
        opacity: visible ? 1 : 0,
        transition: `transform .9s cubic-bezier(.16,.84,.44,1) ${delay}s, opacity .9s ease ${delay}s`,
        transformStyle: "preserve-3d",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function useTilt(maxTilt = 8) {
  const ref = useRef(null);
  const disabled = reducedMotion();
  const onMouseMove = (e) => {
    if (disabled || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    const rx = (py - 0.5) * -maxTilt;
    const ry = (px - 0.5) * maxTilt;
    ref.current.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) scale3d(1.015,1.015,1.015)`;
  };
  const onMouseLeave = () => {
    if (!ref.current) return;
    ref.current.style.transform = "perspective(900px) rotateX(0deg) rotateY(0deg) scale3d(1,1,1)";
  };
  return { ref, onMouseMove, onMouseLeave };
}

function useParallax(speed = 0.15) {
  const ref = useRef(null);
  useEffect(() => {
    if (reducedMotion()) return;
    let raf;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        if (ref.current) ref.current.style.transform = `translate3d(0, ${window.scrollY * speed}px, 0)`;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { window.removeEventListener("scroll", onScroll); cancelAnimationFrame(raf); };
  }, [speed]);
  return ref;
}

/* ---------------------------------------------------------------
   TOAST
--------------------------------------------------------------- */
function Toast({ message }) {
  if (!message) return null;
  return (
    <div style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", zIndex: 200 }} className="pop-in">
      <div style={{ background: C.gold, color: "#0A0908", padding: "12px 20px", borderRadius: 999, fontSize: 14, fontWeight: 700, boxShadow: "0 10px 30px rgba(0,0,0,.4)", display: "flex", alignItems: "center", gap: 8 }}>
        <Check size={16} />
        {message}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------
   PAGE
--------------------------------------------------------------- */
export default function PublicSite() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(defaultProfile);
  const [videos, setVideos] = useState([]);
  const [testimonials, setTestimonials] = useState([]);
  const [toast, setToast] = useState("");
  const toastTimer = useRef(null);
  const [activeVideo, setActiveVideo] = useState(null);
  const [offerOpen, setOfferOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);

  const notify = useCallback((msg) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 3200);
  }, []);

  useEffect(() => {
    let got = { p: false, v: false, t: false };
    const check = () => { if (got.p && got.v && got.t) setLoading(false); };
    const unsubP = subscribeProfile((p) => { setProfile(p || defaultProfile); got.p = true; check(); });
    const unsubV = subscribeVideos((v) => { setVideos(v); got.v = true; check(); });
    const unsubT = subscribeTestimonials((t) => { setTestimonials(t); got.t = true; check(); });
    return () => { unsubP(); unsubV(); unsubT(); };
  }, []);

  const approvedTestimonials = testimonials.filter((t) => t.approved);
  const submitOffer = async (entry) => { await addMessage(entry); };
  const submitReview = async (entry) => { await addTestimonial({ ...entry, source: "viewer", approved: false }); };

  const blobA = useParallax(0.12);
  const blobB = useParallax(-0.08);
  const heroTilt = useTilt(6);

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: C.bg }}>
        <Loader2 size={28} className="ring-spin" color={C.gold} />
      </div>
    );
  }

  return (
    <div style={{ background: C.bg, minHeight: "100vh", position: "relative", overflow: "hidden" }}>
      <div ref={blobA} style={{ position: "absolute", top: -120, right: -140, width: 420, height: 420, borderRadius: "50%", background: `radial-gradient(circle at 30% 30%, ${C.goldGlow}30, transparent 70%)`, filter: "blur(10px)", pointerEvents: "none", zIndex: 0 }} />
      <div ref={blobB} style={{ position: "absolute", top: 480, left: -160, width: 380, height: 380, borderRadius: "50%", background: `radial-gradient(circle at 60% 40%, ${C.gold}22, transparent 70%)`, filter: "blur(10px)", pointerEvents: "none", zIndex: 0 }} />
      <FloatingDots />

      <div style={{ maxWidth: 1080, margin: "0 auto", padding: "48px 20px 90px", position: "relative", zIndex: 1 }}>
        <div
          {...heroTilt}
          style={{
            background: C.bgAlt, borderRadius: 28, border: `1px solid ${C.border}`,
            boxShadow: "0 30px 60px -30px rgba(0,0,0,.6)", padding: "40px 34px",
            display: "flex", gap: 32, flexWrap: "wrap", alignItems: "center",
            transformStyle: "preserve-3d", transition: "transform .25s ease-out", willChange: "transform",
          }}
        >
          <div className="floaty" style={{ position: "relative", width: 148, height: 148, flexShrink: 0, margin: "0 auto", transform: "translateZ(50px)" }}>
            <div className="ring-spin" style={{ position: "absolute", inset: 0, borderRadius: "50%", background: `conic-gradient(from 0deg, ${C.gold}, ${C.goldGlow}, #000, ${C.gold})`, padding: 4 }} />
            <div style={{ position: "absolute", inset: 4, borderRadius: "50%", background: C.bgAlt, padding: 4 }}>
              <div style={{ width: "100%", height: "100%", borderRadius: "50%", overflow: "hidden", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {profile.avatar ? (
                  <img src={profile.avatar} alt={profile.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <span style={{ fontSize: 42, fontWeight: 800, color: C.gold }}>{(profile.name || "?").charAt(0)}</span>
                )}
              </div>
            </div>
          </div>

          <div style={{ flex: 1, minWidth: 260, transform: "translateZ(24px)" }}>
            <div style={{ fontSize: 12, letterSpacing: 2, textTransform: "uppercase", color: C.gold, fontWeight: 700, marginBottom: 8 }}>{profile.eyebrow || "Video Editor"}</div>
            <h1 style={{ margin: 0, fontSize: "clamp(24px, 6.5vw, 36px)", fontWeight: 800, color: C.text, letterSpacing: -0.5 }}>{profile.name}</h1>
            <p style={{ marginTop: 10, marginBottom: 18, color: C.textMuted, fontSize: 15.5, lineHeight: 1.6, maxWidth: 480 }}>{profile.bio}</p>

            {profile.available && (
              <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: C.goldDim, color: C.goldGlow, padding: "5px 12px", borderRadius: 999, fontSize: 12.5, fontWeight: 600, marginBottom: 18, border: `1px solid ${C.goldDeep}44` }}>
                <CircleDot size={12} /> Available for new projects
              </div>
            )}

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <SocialIcon href={profile.instagram} label="Instagram"><Instagram size={17} /></SocialIcon>
              <SocialIcon href={profile.linkedin} label="LinkedIn"><Linkedin size={17} /></SocialIcon>
              <SocialIcon href={profile.upwork} label="Upwork"><Briefcase size={17} /></SocialIcon>
              <SocialIcon href={profile.whatsapp} label="WhatsApp"><MessageCircle size={17} /></SocialIcon>
              <button onClick={() => setOfferOpen(true)} style={{ background: C.gold, color: "#0A0908", border: "none", padding: "11px 22px", borderRadius: 999, fontWeight: 700, fontSize: 14.5, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, boxShadow: `0 12px 24px -10px rgba(212,160,58,.5)` }}>
                Customize Offer <Send size={15} />
              </button>
            </div>
          </div>

          <div className="hero-stats" style={{ display: "flex", gap: 24, transform: "translateZ(10px)" }}>
            <Stat icon={<Film size={16} />} value={videos.length} label="Edits" />
            <Stat icon={<Star size={16} />} value={approvedTestimonials.length} label="Reviews" />
            <Stat icon={<Users size={16} />} value={new Set(videos.flatMap((v) => [v.category, v.type]).filter(Boolean)).size} label="Formats" />
          </div>
        </div>

        <Reveal delay={0.05} y={26} style={{ marginTop: 40 }}>
          <VideoBrowser videos={videos} onPlay={setActiveVideo} />
        </Reveal>

        <Reveal delay={0.05}>
          <div style={{ marginTop: 72 }}>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
              <h2 style={{ fontSize: 22, fontWeight: 800, color: C.text, margin: 0 }}>What clients say</h2>
              <button onClick={() => setReviewOpen(true)} style={{ background: "none", border: "none", color: C.gold, fontWeight: 700, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                <Quote size={14} /> Leave a review
              </button>
            </div>

            {approvedTestimonials.length === 0 ? (
              <EmptyState icon={<Star size={20} />} title="No reviews yet" desc="Be the first to leave one." />
            ) : (
              <div className="marquee-wrap no-scrollbar" style={{ overflow: "hidden", maskImage: "linear-gradient(90deg, transparent, black 4%, black 96%, transparent)" }}>
                <div className="marquee-track" style={{ display: "flex", gap: 14, width: "max-content" }}>
                  {[...approvedTestimonials, ...approvedTestimonials].map((t, i) => (<TestimonialCard key={t.id + i} t={t} />))}
                </div>
              </div>
            )}
          </div>
        </Reveal>

        <div style={{ marginTop: 80, textAlign: "center", color: C.textMuted, fontSize: 13 }}>
          <div style={{ display: "flex", gap: 10, justifyContent: "center", marginBottom: 14 }}>
            <SocialIcon href={profile.instagram} label="Instagram" small><Instagram size={14} /></SocialIcon>
            <SocialIcon href={profile.linkedin} label="LinkedIn" small><Linkedin size={14} /></SocialIcon>
            <SocialIcon href={profile.upwork} label="Upwork" small><Briefcase size={14} /></SocialIcon>
            <SocialIcon href={profile.whatsapp} label="WhatsApp" small><MessageCircle size={14} /></SocialIcon>
          </div>
          © {new Date().getFullYear()} {profile.name} — cut with care.
        </div>
      </div>

      {activeVideo && <VideoModal video={activeVideo} onClose={() => setActiveVideo(null)} />}
      {offerOpen && (
        <OfferModal onClose={() => setOfferOpen(false)} onSubmit={async (data) => { await submitOffer(data); setOfferOpen(false); notify("Your offer request was sent."); }} />
      )}
      {reviewOpen && (
        <ReviewModal onClose={() => setReviewOpen(false)} onSubmit={async (data) => { await submitReview(data); setReviewOpen(false); notify("Thanks! Your review is pending approval."); }} />
      )}
      <Toast message={toast} />
    </div>
  );
}

/* ---------------------------------------------------------------
   DECORATIVE FLOATING DOTS (like the Vyral hero)
--------------------------------------------------------------- */
function FloatingDots() {
  return (
    <div style={{ position: "absolute", top: 60, left: "50%", transform: "translateX(-220px)", pointerEvents: "none", zIndex: 0 }} aria-hidden="true">
      <div style={{ width: 10, height: 10, borderRadius: "50%", background: C.gold, marginBottom: 40 }} />
      <div style={{ width: 34, height: 34, borderRadius: "50%", border: `1px solid ${C.border}`, marginLeft: 60, marginTop: -30 }} />
    </div>
  );
}

/* ---------------------------------------------------------------
   VIDEO BROWSER — sidebar categories + vertical carousel preview
--------------------------------------------------------------- */
function VideoBrowser({ videos, onPlay }) {
  const filters = useMemo(() => {
    const set = new Set();
    videos.forEach((v) => { if (v.type) set.add(v.type); });
    return ["All Videos", ...Array.from(set)];
  }, [videos]);

  const [active, setActive] = useState("All Videos");
  const filtered = useMemo(
    () => (active === "All Videos" ? videos : videos.filter((v) => v.type === active)),
    [videos, active]
  );
  const [index, setIndex] = useState(0);
  useEffect(() => { setIndex(0); }, [active]);
  useEffect(() => { if (index >= filtered.length) setIndex(0); }, [filtered.length, index]);

  const current = filtered[index];
  const goPrev = () => setIndex((i) => (filtered.length ? (i - 1 + filtered.length) % filtered.length : 0));
  const goNext = () => setIndex((i) => (filtered.length ? (i + 1) % filtered.length : 0));

  return (
    <div style={{ background: C.bgAlt, border: `1px solid ${C.border}`, borderRadius: 28, padding: 24, boxShadow: "0 30px 60px -30px rgba(0,0,0,.6)" }}>
      <div className="browser-layout">
        <div className="browser-sidebar no-scrollbar">
          <div style={{ fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: C.textMuted, fontWeight: 700, marginBottom: 14, padding: "0 4px" }}>Categories</div>
          <div className="browser-sidebar-list">
            {filters.map((f) => (
              <button key={f} onClick={() => setActive(f)} style={{
                textAlign: "left", padding: "10px 14px", borderRadius: 8, fontSize: 13.5, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap",
                border: "none", borderLeft: active === f ? `3px solid ${C.gold}` : "3px solid transparent",
                background: active === f ? C.goldDim : "transparent",
                color: active === f ? C.gold : C.textMuted, flexShrink: 0,
              }}>
                {f}
              </button>
            ))}
          </div>
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          {!current ? (
            <EmptyState icon={<Film size={22} />} title="No edits here yet" desc="This category is empty for now — check back soon." />
          ) : (
            <div style={{ display: "flex", gap: 30, flexWrap: "wrap", alignItems: "flex-start" }}>
              <div style={{ flexShrink: 0, margin: "0 auto" }}>
                <button onClick={() => onPlay(current)} style={{
                  position: "relative", width: 260, maxWidth: "100%",
                  aspectRatio: current.orientation === "horizontal" ? "16/9" : "9/16",
                  borderRadius: 20, overflow: "hidden", border: `1px solid ${C.border}`, cursor: "pointer", padding: 0,
                  background: `linear-gradient(160deg, ${C.bgAlt}, #000)`, display: "block",
                }}>
                  {current.thumbnail ? (
                    <img src={current.thumbnail} alt={current.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <VideoIcon color={C.textMuted} size={34} />
                    </div>
                  )}
                  <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at center, transparent 40%, rgba(0,0,0,.35) 100%)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <div style={{ width: 46, height: 46, borderRadius: "50%", background: "rgba(0,0,0,.5)", border: `1px solid ${C.gold}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Play size={18} color={C.gold} fill={C.gold} />
                    </div>
                  </div>
                </button>

                {filtered.length > 1 && (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 14, marginTop: 14 }}>
                    <button onClick={goPrev} aria-label="Previous video" style={pagerBtn}><ChevronLeft size={15} color={C.text} /></button>
                    <span style={{ color: C.textMuted, fontSize: 12.5, fontWeight: 600, minWidth: 44, textAlign: "center" }}>{index + 1} / {filtered.length}</span>
                    <button onClick={goNext} aria-label="Next video" style={pagerBtn}><ChevronRight size={15} color={C.text} /></button>
                  </div>
                )}
              </div>

              <div style={{ flex: 1, minWidth: 240 }}>
                <span style={{ display: "inline-block", fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: C.gold, border: `1px solid ${C.goldDeep}`, borderRadius: 999, padding: "5px 12px", marginBottom: 14 }}>
                  {current.type || "Edit"}
                </span>
                <h3 style={{ margin: "0 0 12px", fontSize: 26, fontWeight: 800, color: C.text }}>{current.title}</h3>
                <p style={{ margin: 0, color: C.textMuted, fontSize: 14.5, lineHeight: 1.7 }}>{current.description}</p>

                {filtered.length > 1 && (
                  <div className="no-scrollbar" style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 22 }}>
                    {filtered.map((v, i) => (
                      <button key={v.id} onClick={() => setIndex(i)} aria-label={`Go to video ${i + 1}`} style={{
                        width: i === index ? 20 : 7, height: 7, borderRadius: 999, border: "none", cursor: "pointer",
                        background: i === index ? C.gold : C.border, transition: "all .2s",
                      }} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
const pagerBtn = { width: 30, height: 30, borderRadius: "50%", border: `1px solid ${C.border}`, background: C.bg, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" };

/* ---------------------------------------------------------------
   SUBCOMPONENTS
--------------------------------------------------------------- */
function Stat({ icon, value, label }) {
  return (
    <div style={{ textAlign: "center", minWidth: 56 }}>
      <div style={{ color: C.gold, display: "flex", justifyContent: "center", marginBottom: 4 }}>{icon}</div>
      <div style={{ fontWeight: 800, fontSize: 17, color: C.text }}>{value}</div>
      <div style={{ fontSize: 11, color: C.textMuted, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</div>
    </div>
  );
}

function SocialIcon({ href, label, children, small }) {
  const size = small ? 30 : 38;
  const disabled = !href;
  const Comp = disabled ? "span" : "a";
  return (
    <Comp href={disabled ? undefined : href} target="_blank" rel="noopener noreferrer" aria-label={label} title={label}
      style={{ width: size, height: size, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: disabled ? C.bg : C.bgAlt, border: `1px solid ${C.border}`, color: disabled ? "#4A463D" : C.text, cursor: disabled ? "default" : "pointer", flexShrink: 0 }}>
      {children}
    </Comp>
  );
}

function EmptyState({ icon, title, desc }) {
  return (
    <div style={{ textAlign: "center", padding: "48px 20px", color: C.textMuted, background: C.bg, borderRadius: 20, border: `1px dashed ${C.border}` }}>
      <div style={{ color: C.gold, marginBottom: 8, display: "flex", justifyContent: "center" }}>{icon}</div>
      <div style={{ fontWeight: 700, color: C.text, marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: 13.5 }}>{desc}</div>
    </div>
  );
}

function VideoModal({ video, onClose }) {
  const embed = parseEmbed(video.videoUrl);
  const hasUpload = video.sourceType === "upload" && video.videoUrl;
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.8)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} className="pop-in" style={{ background: C.bgAlt, border: `1px solid ${C.border}`, borderRadius: 20, maxWidth: 640, width: "100%", maxHeight: "90vh", overflow: "auto" }}>
        <div style={{ background: "#000", borderRadius: "20px 20px 0 0", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", maxHeight: "75vh" }}>
          <div style={{
            position: "relative", flexShrink: 0,
            aspectRatio: video.orientation === "vertical" ? "9/16" : "16/9",
            height: video.orientation === "vertical" ? "min(75vh, 640px)" : "auto",
            width: video.orientation === "vertical" ? "auto" : "100%",
            maxWidth: "100%",
          }}>
            {hasUpload ? (
              <video src={video.videoUrl} controls autoPlay style={{ width: "100%", height: "100%", objectFit: "contain" }} />
            ) : embed && embed.kind === "iframe" ? (
              <iframe src={embed.src} title={video.title} allow="autoplay; fullscreen; picture-in-picture" allowFullScreen style={{ width: "100%", height: "100%", border: "none", display: "block" }} />
            ) : embed && embed.kind === "link" ? (
              <a href={embed.src} target="_blank" rel="noopener noreferrer" style={{ position: "absolute", inset: 0, color: "#fff", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, textDecoration: "none" }}>
                <ExternalLink size={22} /> Open video
              </a>
            ) : (
              <div style={{ position: "absolute", inset: 0, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", padding: 24, fontSize: 13.5 }}>No video source set for this project yet.</div>
            )}
            <button onClick={onClose} aria-label="Close" style={{ position: "absolute", top: 10, left: 10, width: 32, height: 32, borderRadius: "50%", background: "rgba(0,0,0,.6)", border: "none", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2 }}>
              <X size={16} />
            </button>
          </div>
        </div>
        <div style={{ padding: 22 }}>
          <div style={{ marginBottom: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: C.gold, background: C.goldDim, padding: "3px 9px", borderRadius: 999 }}>{video.type}</span>
          </div>
          <h3 style={{ margin: "0 0 8px", fontSize: 20, fontWeight: 800, color: C.text }}>{video.title}</h3>
          <p style={{ margin: 0, color: C.textMuted, fontSize: 14.5, lineHeight: 1.6 }}>{video.description}</p>
        </div>
      </div>
    </div>
  );
}

function TestimonialCard({ t }) {
  return (
    <div style={{ width: 300, flexShrink: 0, background: C.bgAlt, border: `1px solid ${C.border}`, borderRadius: 18, padding: 20 }}>
      <div style={{ display: "flex", gap: 2, marginBottom: 10 }}>
        {Array.from({ length: 5 }).map((_, i) => (<Star key={i} size={14} color={C.gold} fill={i < t.rating ? C.gold : "none"} />))}
      </div>
      <p style={{ margin: 0, color: C.text, fontSize: 14, lineHeight: 1.55, minHeight: 66 }}>{t.text}</p>
      <div style={{ marginTop: 14, fontWeight: 700, fontSize: 13.5, color: C.text }}>{t.name}</div>
      <div style={{ fontSize: 12, color: C.textMuted }}>{t.role}</div>
    </div>
  );
}

function ModalShell({ onClose, children, width = 420 }) {
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.8)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} className="pop-in" style={{ background: C.bgAlt, border: `1px solid ${C.border}`, borderRadius: 20, width: "100%", maxWidth: width, padding: 26, maxHeight: "90vh", overflow: "auto" }}>
        {children}
      </div>
    </div>
  );
}
function FieldLabel({ children }) {
  return <label style={{ display: "block", fontSize: 11.5, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase", color: C.textMuted, marginBottom: 6 }}>{children}</label>;
}
const inputStyle = { width: "100%", padding: "11px 13px", borderRadius: 10, border: `1px solid ${C.border}`, fontSize: 14, background: C.bg, color: C.text };

function OfferModal({ onClose, onSubmit }) {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const valid = /\S+@\S+\.\S+/.test(email) && message.trim().length > 0;
  return (
    <ModalShell onClose={onClose}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
        <h3 style={{ margin: 0, fontSize: 19, fontWeight: 800, color: C.text }}>Customize your offer</h3>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: C.textMuted }}><X size={18} /></button>
      </div>
      <div style={{ marginBottom: 14 }}>
        <FieldLabel>Your email</FieldLabel>
        <input style={inputStyle} type="email" placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div style={{ marginBottom: 18 }}>
        <FieldLabel>What do you need edited?</FieldLabel>
        <textarea style={{ ...inputStyle, minHeight: 100, resize: "vertical" }} placeholder="Tell me about the project, timeline, and budget..." value={message} onChange={(e) => setMessage(e.target.value)} />
      </div>
      <button disabled={!valid || sending} onClick={async () => { setSending(true); await onSubmit({ email, message }); setSending(false); }}
        style={{ width: "100%", padding: "13px", borderRadius: 12, border: "none", background: valid ? C.gold : C.border, color: "#0A0908", fontWeight: 700, fontSize: 14.5, cursor: valid ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
        {sending ? <Loader2 size={16} className="ring-spin" /> : <Send size={15} />} Send request
      </button>
    </ModalShell>
  );
}

function ReviewModal({ onClose, onSubmit }) {
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [text, setText] = useState("");
  const [rating, setRating] = useState(5);
  const [sending, setSending] = useState(false);
  const valid = name.trim() && text.trim();
  return (
    <ModalShell onClose={onClose}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
        <h3 style={{ margin: 0, fontSize: 19, fontWeight: 800, color: C.text }}>Leave a review</h3>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: C.textMuted }}><X size={18} /></button>
      </div>
      <div style={{ marginBottom: 14 }}>
        <FieldLabel>Your name</FieldLabel>
        <input style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Doe" />
      </div>
      <div style={{ marginBottom: 14 }}>
        <FieldLabel>Role / company (optional)</FieldLabel>
        <input style={inputStyle} value={role} onChange={(e) => setRole(e.target.value)} placeholder="Founder, Brand Co." />
      </div>
      <div style={{ marginBottom: 14 }}>
        <FieldLabel>Rating</FieldLabel>
        <div style={{ display: "flex", gap: 4 }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <button key={i} onClick={() => setRating(i + 1)} style={{ background: "none", border: "none", cursor: "pointer", padding: 2 }}>
              <Star size={22} color={C.gold} fill={i < rating ? C.gold : "none"} />
            </button>
          ))}
        </div>
      </div>
      <div style={{ marginBottom: 18 }}>
        <FieldLabel>Review</FieldLabel>
        <textarea style={{ ...inputStyle, minHeight: 90, resize: "vertical" }} value={text} onChange={(e) => setText(e.target.value)} placeholder="How was the experience?" />
      </div>
      <button disabled={!valid || sending} onClick={async () => { setSending(true); await onSubmit({ name, role, text, rating }); setSending(false); }}
        style={{ width: "100%", padding: "13px", borderRadius: 12, border: "none", background: valid ? C.gold : C.border, color: "#0A0908", fontWeight: 700, fontSize: 14.5, cursor: valid ? "pointer" : "not-allowed" }}>
        {sending ? "Submitting..." : "Submit review"}
      </button>
      <div style={{ fontSize: 11.5, color: C.textMuted, marginTop: 10, textAlign: "center" }}>Reviews are shown after approval.</div>
    </ModalShell>
  );
}