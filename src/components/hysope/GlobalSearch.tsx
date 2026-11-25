import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Search, User, ShoppingBag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { clientName } from "@/lib/article-language";
import { orderNo, STATUS_LABEL, type OrderStatus } from "@/lib/format";

export function GlobalSearch() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [term, setTerm] = useState("");
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLFormElement>(null);

  useEffect(() => { const t = setTimeout(() => setTerm(q.trim()), 250); return () => clearTimeout(t); }, [q]);
  useEffect(() => {
    const close = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    const key = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); box.current?.querySelector("input")?.focus(); } };
    document.addEventListener("mousedown", close); document.addEventListener("keydown", key);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", key); };
  }, []);

  const { data, isFetching } = useQuery({
    queryKey: ["global-search", term],
    enabled: term.length >= 2,
    queryFn: async () => {
      const safe = term.replace(/[%,()]/g, " ");
      const n = Number(term.replace(/\D/g, ""));
      const ors = [`client_name.ilike.%${safe}%`, `client_phone.ilike.%${safe}%`];
      if (n && /^[\sN°#0-9]+$/i.test(term)) ors.push(`number.eq.${n}`);
      const [c, o] = await Promise.all([
        supabase.from("clients").select("id,name,phone").or(`name.ilike.%${safe}%,phone.ilike.%${safe}%`).limit(5),
        supabase.from("order_summary").select("id,number,client_name,status").or(ors.join(",")).order("number", { ascending: false }).limit(6),
      ]);
      return { clients: c.data ?? [], orders: o.data ?? [] };
    },
  });

  const go = () => setOpen(false);
  const empty = data && !data.clients.length && !data.orders.length;
  return (
    <form ref={box} className="relative max-w-md flex-1" onSubmit={(e) => { e.preventDefault(); setOpen(false); navigate({ to: "/commandes", search: { q } }); }}>
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input value={q} onChange={(e) => { setQ(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)} aria-label="Recherche globale" placeholder="Client, téléphone ou N° de reçu… (Ctrl+K)" className="h-10 w-full rounded-lg border bg-background pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
      {open && term.length >= 2 && (
        <div className="absolute left-0 right-0 top-12 z-50 max-h-96 overflow-y-auto rounded-lg border bg-popover p-2 text-popover-foreground shadow-lg">
          {isFetching && !data && <p className="p-2 text-sm text-muted-foreground">Recherche…</p>}
          {empty && <p className="p-2 text-sm text-muted-foreground">Aucun résultat.</p>}
          {!!data?.clients.length && <div className="px-2 pb-1 pt-1 text-xs font-semibold uppercase text-muted-foreground">Clients</div>}
          {data?.clients.map((c) => (
            <Link key={c.id} to="/clients/$id" params={{ id: c.id }} onClick={go} className="flex items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-accent">
              <User className="h-4 w-4 text-muted-foreground" /><span className="font-medium">{clientName(c.name)}</span><span className="ml-auto text-xs text-muted-foreground">{c.phone}</span>
            </Link>
          ))}
          {!!data?.orders.length && <div className="px-2 pb-1 pt-2 text-xs font-semibold uppercase text-muted-foreground">Commandes et reçus</div>}
          {data?.orders.map((o) => (
            <Link key={o.id} to="/commandes/$id" params={{ id: o.id! }} onClick={go} className="flex items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-accent">
              <ShoppingBag className="h-4 w-4 text-muted-foreground" /><b>{orderNo(o.number)}</b><span>{clientName(o.client_name)}</span><span className="ml-auto text-xs text-muted-foreground">{STATUS_LABEL[o.status as OrderStatus]}</span>
            </Link>
          ))}
        </div>
      )}
    </form>
  );
}
