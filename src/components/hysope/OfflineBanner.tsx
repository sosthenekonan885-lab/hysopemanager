import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

export function OfflineBanner() {
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  if (!offline) return null;
  return (
    <div role="status" className="no-print sticky top-0 z-[60] flex items-center justify-center gap-2 bg-accent px-4 py-2 text-sm font-medium text-accent-foreground">
      <WifiOff className="h-4 w-4" />
      Pas d'internet : vous consultez les dernières données enregistrées. Les nouveaux dépôts et paiements attendent le retour de la connexion.
    </div>
  );
}
