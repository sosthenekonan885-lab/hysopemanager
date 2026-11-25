import logoAsset from "@/assets/logo-hysope-pressing.jpg.asset.json";
import { cn } from "@/lib/utils";

export function Logo({ light, className }: { light?: boolean; className?: string }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <span
        className={cn(
          "block h-10 w-10 shrink-0 overflow-hidden rounded-full ring-1",
          light ? "ring-white/25" : "ring-black/10",
        )}
      >
        <img
          src={logoAsset.url}
          alt="Pressing L'Hysope"
          width={40}
          height={40}
          className="h-full w-full scale-[1.06] object-cover"
        />
      </span>
      <div className="leading-tight">
        <div className="font-display text-lg font-bold">L'Hysope</div>
        <div className={cn("text-xs", light ? "opacity-75" : "text-muted-foreground")}>Hysope Manager</div>
      </div>
    </div>
  );
}
