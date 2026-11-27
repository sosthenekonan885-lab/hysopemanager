import { useEffect, useState } from "react";
import QRCode from "qrcode";

export const TRACK_BASE = "https://hysopemanager.lovable.app/suivi";

export function trackUrl(token: string) {
  return `${TRACK_BASE}?t=${token}`;
}

/** Lit un QR de reçu : nouveau format (?t=code secret) ou ancien (?n=numéro). */
export function parseTrackQr(text: string): { token?: string; number?: number } | null {
  try {
    const u = new URL(text.trim());
    const t = u.searchParams.get("t");
    if (t && /^[0-9a-f-]{36}$/i.test(t)) return { token: t };
    const n = Number((u.searchParams.get("n") ?? "").replace(/\D/g, ""));
    if (n > 0) return { number: n };
  } catch { /* pas une adresse */ }
  const n = Number(text.replace(/\D/g, ""));
  return n > 0 ? { number: n } : null;
}

export function ReceiptQr({ token, className }: { token: string | null | undefined; className?: string }) {
  const [src, setSrc] = useState("");
  useEffect(() => {
    if (!token) return;
    QRCode.toDataURL(trackUrl(token), { margin: 0, width: 160, color: { dark: "#0a2c48", light: "#ffffff" } }).then(setSrc).catch(() => setSrc(""));
  }, [token]);
  if (!src) return null;
  return <img src={src} alt="QR code de suivi" className={className} />;
}
