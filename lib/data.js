import { db } from "./firebase";
import {
  doc, getDoc, setDoc, collection, addDoc, updateDoc, deleteDoc,
  onSnapshot, query, orderBy,
} from "firebase/firestore";

/* ---------------- IDs ---------------- */
export function uid() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

/* ---------------- Profile (single doc) ---------------- */
const profileRef = doc(db, "site", "profile");

export function subscribeProfile(cb) {
  return onSnapshot(profileRef, (snap) => cb(snap.exists() ? snap.data() : null), () => cb(null));
}

export async function getProfileOnce() {
  const snap = await getDoc(profileRef);
  return snap.exists() ? snap.data() : null;
}

export async function saveProfile(data) {
  await setDoc(profileRef, data, { merge: true });
}

/* ---------------- Videos ---------------- */
const videosCol = collection(db, "videos");

export function subscribeVideos(cb) {
  const q = query(videosCol, orderBy("createdAt", "desc"));
  return onSnapshot(q, (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))), () => cb([]));
}

export async function addVideo(data) {
  return addDoc(videosCol, { ...data, createdAt: Date.now() });
}
export async function updateVideo(id, data) {
  return updateDoc(doc(db, "videos", id), data);
}
export async function deleteVideo(id) {
  return deleteDoc(doc(db, "videos", id));
}

/* ---------------- Testimonials ---------------- */
const testimonialsCol = collection(db, "testimonials");

export function subscribeTestimonials(cb) {
  const q = query(testimonialsCol, orderBy("createdAt", "desc"));
  return onSnapshot(q, (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))), () => cb([]));
}
export async function addTestimonial(data) {
  return addDoc(testimonialsCol, { ...data, createdAt: Date.now() });
}
export async function updateTestimonial(id, data) {
  return updateDoc(doc(db, "testimonials", id), data);
}
export async function deleteTestimonial(id) {
  return deleteDoc(doc(db, "testimonials", id));
}

/* ---------------- Messages (offer requests) ---------------- */
const messagesCol = collection(db, "messages");

export function subscribeMessages(cb) {
  const q = query(messagesCol, orderBy("createdAt", "desc"));
  return onSnapshot(q, (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))), () => cb([]));
}
export async function addMessage(data) {
  return addDoc(messagesCol, { ...data, createdAt: Date.now() });
}
export async function deleteMessage(id) {
  return deleteDoc(doc(db, "messages", id));
}

/* ---------------- Image handling — no Firebase Storage ----------------
   Storage requires the paid Blaze plan, so instead we compress images in
   the browser and store them as base64 text directly inside the Firestore
   document (profile.avatar, video.thumbnail). Firestore documents cap out
   around 1MB total, so this stays well under that as long as we keep
   images small — this function actively re-compresses if the first pass
   comes out too large, and rejects with a clear reason if it still can't
   fit rather than silently failing. Actual video FILES can't go through
   this path (too big for a document) — those stay link-only. */
const SUPPORTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_DATA_URL_LENGTH = 700_000; // ~525KB raw, safely under Firestore's ~1MB doc cap

export function resizeImageToDataUrl(file, { maxWidth = 640, quality = 0.8 } = {}) {
  return new Promise((resolve, reject) => {
    if (!SUPPORTED_IMAGE_TYPES.includes(file.type)) {
      reject(new Error(
        `Unsupported image format${file.type ? ` (${file.type})` : ""}. Please use a JPG, PNG, WEBP, or GIF — ` +
        `iPhone photos are often saved as HEIC, which browsers can't read. In Photos, use "Share → Copy" or ` +
        `re-export as JPEG first.`
      ));
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      reject(new Error("That image is too large (over 20MB). Please use a smaller file."));
      return;
    }

    let settled = false;
    const finish = (fn, arg) => { if (!settled) { settled = true; clearTimeout(timeoutId); fn(arg); } };
    const timeoutId = setTimeout(() => {
      finish(reject, new Error("Image took too long to process — try a different photo."));
    }, 15000);

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        try {
          const render = (width, q) => {
            const scale = Math.min(1, width / img.width);
            const canvas = document.createElement("canvas");
            canvas.width = Math.max(1, Math.round(img.width * scale));
            canvas.height = Math.max(1, Math.round(img.height * scale));
            canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
            return canvas.toDataURL("image/jpeg", q);
          };

          let dataUrl = render(maxWidth, quality);
          if (dataUrl.length > MAX_DATA_URL_LENGTH) {
            // First pass came out too big — compress harder once before giving up.
            dataUrl = render(Math.round(maxWidth * 0.6), 0.55);
          }
          if (dataUrl.length > MAX_DATA_URL_LENGTH) {
            finish(reject, new Error("This image is still too large even after compression — please use a smaller or simpler photo."));
            return;
          }
          finish(resolve, dataUrl);
        } catch (err) {
          finish(reject, err);
        }
      };
      img.onerror = () => finish(reject, new Error("This image could not be read — it may be corrupted or in an unsupported format."));
      img.src = reader.result;
    };
    reader.onerror = () => finish(reject, new Error("Could not read the selected file."));
    reader.readAsDataURL(file);
  });
}