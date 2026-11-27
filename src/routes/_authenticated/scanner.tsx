import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { parseTrackQr } from "@/components/hysope/ReceiptQr";
import { findScannedOrder } from "@/lib/scan.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/scanner")({
  head: () => ({ meta: [{ title: "Scanner un reçu — Hysope Manager" }, { name: "description", content: "Scannez le QR code d'un reçu pour ouvrir la commande et son paiement." }, { property: "og:title", content: "Scanner un reçu — Hysope Manager" }, { property: "og:description", content: "Ouvrir une commande en scannant son reçu." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Scanner,
});

function Scanner() {
  const navigate = useNavigate();
  const [num, setNum] = useState("");
  const [err, setErr] = useState("");
  const busy = useRef(false);

  async function open(text: string) {
    if (busy.current) return;
    const p = parseTrackQr(text);
    if (!p) return void toast.error("Ce QR code n'est pas un reçu Hysope");
    busy.current = true;
    try {
      const { id } = await findScannedOrder({ data: p });
      if (!id) { toast.error("Aucune commande trouvée pour ce reçu"); return; }
      navigate({ to: "/commandes/$id", params: { id } });
    } finally { setTimeout(() => (busy.current = false), 1500); }
  }

  useEffect(() => {
    let scanner: { stop: () => Promise<void>; isScanning: boolean } | null = null;
    let stopped = false;
    import("html5-qrcode").then(async ({ Html5Qrcode }) => {
      if (stopped) return;
      const s = new Html5Qrcode("qr-reader");
      scanner = s;
      try {
        await s.start({ facingMode: "environment" }, { fps: 10, qrbox: 240 }, (t) => void open(t), () => {});
      } catch { setErr("Impossible d'ouvrir la caméra. Autorisez la caméra ou saisissez le numéro du reçu."); }
    });
    return () => { stopped = true; if (scanner?.isScanning) scanner.stop().catch(() => {}); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <h1 className="text-2xl font-bold">Scanner un reçu</h1>
      <p className="text-muted-foreground">Placez le QR code du reçu devant la caméra : la commande et son paiement s'ouvrent automatiquement.</p>
      <Card><CardContent className="p-3"><div id="qr-reader" className="overflow-hidden rounded-md" />{err && <p className="p-2 text-sm text-destructive">{err}</p>}</CardContent></Card>
      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); void open(num); }}>
        <Input placeholder="Ou numéro du reçu, ex. 000047" value={num} onChange={(e) => setNum(e.target.value)} />
        <Button>Ouvrir</Button>
      </form>
    </div>
  );
}
