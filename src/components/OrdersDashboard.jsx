import { useEffect, useState } from "react";
import { api } from "@/api/client";
import { useToast } from "@/components/ui/use-toast";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const RANGES = [
  { id: "today", label: "Hoje" },
  { id: "7d", label: "7 dias" },
  { id: "30d", label: "30 dias" },
];

const money = (value) =>
  Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function OrdersDashboard() {
  const { toast } = useToast();
  const [range, setRange] = useState("today");
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    api.orders.summary(range)
      .then((data) => {
        if (active) setSummary(data);
      })
      .catch((error) => {
        if (active) {
          setSummary(null);
          toast({ title: "Não foi possível carregar os pedidos.", description: error.message, variant: "destructive" });
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [range, toast]);

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        {RANGES.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setRange(item.id)}
            className={`px-4 py-2 rounded-xl font-inter text-sm font-medium border ${
              range === item.id
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-foreground border-border"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      ) : !summary ? (
        <p className="text-sm text-muted-foreground">Não foi possível carregar os pedidos.</p>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-2xl border border-border bg-card p-5">
              <p className="text-sm text-muted-foreground">Pedidos</p>
              <p className="font-inter font-extrabold text-3xl text-foreground">{summary.order_count}</p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-5">
              <p className="text-sm text-muted-foreground">Total</p>
              <p className="font-inter font-extrabold text-3xl text-foreground">{money(summary.revenue)}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="font-inter font-semibold text-foreground mb-4">Linha do tempo</h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={summary.timeline}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} interval={range === "today" ? 2 : 0} />
                  <YAxis allowDecimals={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} width={32} />
                  <Tooltip />
                  <Line type="monotone" dataKey="count" name="Pedidos" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="font-inter font-semibold text-foreground mb-4">Pedidos por atendente</h2>
            {summary.by_attendant.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum pedido neste período.</p>
            ) : (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={summary.by_attendant} layout="vertical" margin={{ left: 16 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" allowDecimals={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                    <YAxis type="category" dataKey="name" width={120} tick={{ fill: "hsl(var(--foreground))", fontSize: 12 }} />
                    <Tooltip formatter={(value, key) => (key === "revenue" ? money(value) : value)} />
                    <Bar dataKey="count" name="Pedidos" fill="hsl(var(--primary))" radius={6} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <h2 className="font-inter font-semibold text-foreground px-5 pt-5">Pedidos recentes</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground">
                    <th className="px-5 py-3 font-medium">Hora</th>
                    <th className="px-5 py-3 font-medium">Atendente</th>
                    <th className="px-5 py-3 font-medium">Comanda</th>
                    <th className="px-5 py-3 font-medium text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.recent.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-5 py-6 text-muted-foreground">Nenhum pedido neste período.</td>
                    </tr>
                  )}
                  {summary.recent.map((order) => (
                    <tr key={order.id} className="border-t border-border">
                      <td className="px-5 py-3 text-foreground">
                        {new Date(order.created_at).toLocaleString("pt-BR", {
                          day: "2-digit",
                          month: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="px-5 py-3 text-foreground">{order.attendant_name || "—"}</td>
                      <td className="px-5 py-3 text-foreground">{order.is_estufa ? "Estufa" : order.order_number}</td>
                      <td className="px-5 py-3 text-right text-foreground">{money(order.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
