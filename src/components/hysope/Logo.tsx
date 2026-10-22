import { Sprout } from "lucide-react";
import { cn } from "@/lib/utils";

export function Logo({ light, className }: { light?: boolean; className?: string }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl", light ? "bg-accent text-accent-foreground" : "bg-primary text-primary-foreground")}>
        <Sprout className="h-5 w-5" />
      </div>
      <div className="leading-tight">
        <div className="font-display text-lg font-bold">L'Hysope</div>
        <div className={cn("text-xs", light ? "opacity-75" : "text-muted-foreground")}>Hysope Manager</div>
      </div>
    </div>
  );
}
