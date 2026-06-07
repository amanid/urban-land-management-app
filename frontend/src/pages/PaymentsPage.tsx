import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Link } from "react-router-dom";
import { formatDate, formatMoney } from "@/lib/format";
import { openAuthenticatedPdf } from "@/lib/pdf";
import ExportButton from "@/components/ExportButton";
import { useState } from "react";

export default function PaymentsPage() {
  const [search, setSearch] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: ["payments", search],
    queryFn: async () => (await api.get("/transactions/payments/", { params: { search } })).data,
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold">Versements</h1>
          <p className="text-sm text-slate-500">{data?.count ?? 0} reçus enregistrés</p>
        </div>
        <ExportButton path="/export/payments/" filename="urban-land-versements" />
      </div>

      <div className="card p-3">
        <input className="input max-w-md" placeholder="Rechercher (N° reçu, référence, client…)"
               value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {isLoading ? <div className="h-64 skeleton rounded-2xl" /> : (
        <div className="card overflow-hidden">
          <table className="table-clean">
            <thead><tr>
              <th>Reçu</th><th>Date</th><th>Vente</th><th>Client</th>
              <th>Mode</th><th>Référence</th>
              <th className="text-right">Montant</th><th></th>
            </tr></thead>
            <tbody>
              {(data?.results || []).map((p: any) => (
                <tr key={p.id} className={p.is_void ? "opacity-50" : ""}>
                  <td className="font-mono text-xs font-semibold">{p.receipt_number}</td>
                  <td>{formatDate(p.paid_on)}</td>
                  <td><Link className="text-brand-700 hover:underline font-mono text-xs" to={`/sales/${p.sale}`}>{p.sale_reference}</Link></td>
                  <td>{p.client_name}</td>
                  <td>{p.method_label}</td>
                  <td className="text-xs">{p.reference || "—"}</td>
                  <td className="text-right font-semibold">{formatMoney(p.amount, p.currency)}</td>
                  <td className="text-right">
                    <button onClick={() => openAuthenticatedPdf(`/reports/receipt/${p.id}/`, `recu-${p.receipt_number}.pdf`)} className="text-brand-700 text-xs font-semibold hover:underline">Reçu PDF</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
