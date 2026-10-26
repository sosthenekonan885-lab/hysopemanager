import { createFileRoute, Link, Outlet, redirect, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  LayoutDashboard, ShoppingBag, Users, Archive, PackageCheck, Truck, MessageSquareWarning,
  Wallet, Receipt, BarChart3, Tags, Bell, UserCog, History, Settings, KeyRound, LogOut, Menu, Search, X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/hooks/use-me";
import { logLogout } from "@/lib/auth.functions";
import { Logo } from "@/components/hysope/Logo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/" });
  },
  component: Shell,
});

const NAV = [
  { to: "/tableau-de-bord", label: "Tableau de bord", icon: LayoutDashboard },
  { to: "/commandes", label: "Commandes", icon: ShoppingBag },
  { to: "/clients", label: "Clients", icon: Users },
  { to: "/casiers", label: "Casiers & sacs", icon: Archive },
  { to: "/retraits", label: "Retraits", icon: PackageCheck },
  { to: "/livraisons", label: "Livraisons", icon: Truck },
  { to: "/reclamations", label: "Réclamations", icon: MessageSquareWarning },
  { to: "/caisse", label: "Caisse", icon: Wallet },
  { to: "/tarifs", label: "Tarifs", icon: Tags },
] as const;
const ADMIN_NAV = [
  { to: "/depenses", label: "Dépenses", icon: Receipt },
  { to: "/rapports", label: "Rapports", icon: BarChart3 },
  { to: "/notifications", label: "Notifications", icon: Bell },
  { to: "/utilisateurs", label: "Utilisateurs", icon: UserCog },
  { to: "/historique", label: "Historique", icon: History },
  { to: "/parametres", label: "Paramètres", icon: Settings },
] as const;

function Shell() {
  const { data: me } = useMe();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const { data: unread } = useQuery({
    queryKey: ["notif-count"],
    enabled: !!me?.isAdmin,
    refetchInterval: 30000,
    queryFn: async () => {
      const { count } = await supabase.from("notifications").select("id", { count: "exact", head: true }).eq("read", false);
      return count ?? 0;
    },
  });

  async function logout() {
    try { await logLogout(); } catch { /* ignore */ }
    await supabase.auth.signOut();
    navigate({ to: "/" });
  }

  const linkCls = "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground/80 transition hover:bg-sidebar-accent hover:text-sidebar-accent-foreground";
  const activeCls = "bg-sidebar-accent text-sidebar-primary";

  const nav = (
    <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3" onClick={() => setOpen(false)}>
      {NAV.map((n) => (
        <Link key={n.to} to={n.to} className={linkCls} activeProps={{ className: activeCls }}>
          <n.icon className="h-4 w-4" />{n.label}
        </Link>
      ))}
      {me?.isAdmin && (
        <>
          <div className="mt-4 px-3 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/50">Administration</div>
          {ADMIN_NAV.map((n) => (
            <Link key={n.to} to={n.to} className={linkCls} activeProps={{ className: activeCls }}>
              <n.icon className="h-4 w-4" />{n.label}
              {n.to === "/notifications" && !!unread && (
                <span className="ml-auto rounded-full bg-sidebar-primary px-2 text-xs text-sidebar-primary-foreground">{unread}</span>
              )}
            </Link>
          ))}
        </>
      )}
      <div className="mt-auto space-y-1 border-t border-sidebar-border pt-3">
        <Link to="/compte" className={linkCls} activeProps={{ className: activeCls }}><KeyRound className="h-4 w-4" />Mon compte</Link>
        <button onClick={logout} className={cn(linkCls, "w-full")}><LogOut className="h-4 w-4" />Déconnexion</button>
      </div>
    </nav>
  );

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="no-print sticky top-0 hidden h-screen w-64 shrink-0 flex-col bg-sidebar lg:flex">
        <div className="p-5 text-sidebar-foreground"><Logo light /></div>
        {nav}
      </aside>
      {open && (
        <div className="no-print fixed inset-0 z-50 flex lg:hidden">
          <aside className="flex w-72 flex-col bg-sidebar">
            <div className="flex items-center justify-between p-5 text-sidebar-foreground">
              <Logo light /><button onClick={() => setOpen(false)}><X className="h-5 w-5" /></button>
            </div>
            {nav}
          </aside>
          <div className="flex-1 bg-foreground/40" onClick={() => setOpen(false)} />
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="no-print sticky top-0 z-30 flex items-center gap-3 border-b bg-card/90 px-4 py-3 backdrop-blur">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setOpen(true)}><Menu /></Button>
          <form
            className="relative max-w-md flex-1"
            onSubmit={(e) => {
              e.preventDefault();
              const q = new FormData(e.currentTarget).get("q")?.toString() ?? "";
              navigate({ to: "/commandes", search: { q } });
            }}
          >
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input name="q" placeholder="Client, téléphone ou N° de commande…" className="h-10 w-full rounded-lg border bg-background pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
          </form>
          <Button asChild className="hidden sm:inline-flex"><Link to="/commandes/nouvelle">+ Nouveau dépôt</Link></Button>
          <div className="ml-auto text-right text-sm">
            <div className="font-semibold">{me?.profile?.full_name}</div>
            <div className="text-xs text-muted-foreground">{me?.isAdmin ? "Administrateur" : "Gérante"}</div>
          </div>
        </header>
        <main className="flex-1 p-4 md:p-8"><Outlet /></main>
      </div>
    </div>
  );
}
