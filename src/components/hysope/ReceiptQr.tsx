import { useEffect, useState } from "react";
import QRCode from "qrcode";

export const TRACK_BASE = "https://hysopemanager.lovable.app/suivi";

export function trackUrl(number: number | null | undefined) {
  return `${TRACK_BASE}?n=${String(number ?? "").padStart(6, "0")}`;
}

export function ReceiptQr({ number, className }: { number: number | null | undefined; className?: string }) {
  const [src, setSrc] = useState("");
  useEffect(() => {
    QRCode.toDataURL(trackUrl(number), { margin: 0, width: 160, color: { dark: "#0a2c48", light: "#ffffff" } }).then(setSrc).catch(() => setSrc(""));
  }, [number]);
  if (!src) return null;
  return <img src={src} alt="QR code de suivi" className={className} />;
}
