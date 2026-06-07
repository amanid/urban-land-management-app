import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useState } from "react";
import { ArrowLeft, Receipt, FileSignature, Wallet, CircleCheck, X, FileText, Upload, UserX } from "lucide-react";
import toast from "react-hot-toast";
import { formatMoney, formatDate } from "@/lib/format";
import { openAuthenticatedPdf } from "@/lib/pdf";
import Can from "@/components/Can";
import ReasonModal from "@/components/ReasonModal";
import DocumentCard from "@/components/DocumentCard";
import NotesAndTags from "@/components/NotesAndTags";
import clsx from "clsx";

const INSTALLMENT_CLS: Record<string, string> = {
  paid: "pill-success", pending: "pill-warning",
  partial: "pill-info", overdue: "pill-danger",
};

export default function SaleDetailPage() {
  const { id } = useParams();
  const qc = useQueryClient();
  const [showPay, setShowPay] = useState(false);
  const [showRenegotiate, setShowRenegotiate] = useState(false);
  const [withdrawBy, setWithdrawBy] = useState<null | "buyer" | "seller">(null);

  const { data: sale, isLoading } = useQuery({
    queryKey: ["sale", id],
    queryFn: async () => (await api.get(`/transactions/sales/${id}/`)).data,
  });

  const confirm = useMutation({
    mutationFn: async () => (await api.post(`/transactions/sales/${id}/confirm/`)).data,
    onSuccess: () => { toast.success("Vente confirmée."); qc.invalidateQueries({ queryKey: ["sale", id] }); },
    onError: (e: any) => toast.error(JSON.stringify(e.response?.data)),
  });
  const settle = useMutation({
    mutationFn: async () => (await api.post(`/transactions/sales/${id}/settle_in_full/`, { method: "cash" })).data,
    onSuccess: () => { toast.success("Vente soldée intégralement."); qc.invalidateQueries({ queryKey: ["sale", id] }); },
    onError: (e: any) => toast.error(JSON.stringify(e.response?.data)),
  });
  const cancel = useMutation({
    mutationFn: async () => (await api.post(`/transactions/sales/${id}/cancel/`)).data,
    onSuccess: () => { toast.success("Vente annulée."); qc.invalidateQueries({ queryKey: ["sale", id] }); },
  });
  const withdraw = useMutation({
    mutationFn: async (payload: { by: "buyer" | "seller"; reason: string; penalty_amount?: number }) =>
      (await api.post(`/transactions/sales/${id}/withdraw/`, payload)).data,
    onSuccess: () => {
      toast.success("Désistement enregistré. Le lot est de nouveau disponible.");
      qc.invalidateQueries({ queryKey: ["sale", id] });
      qc.invalidateQueries({ queryKey: ["lots"] });
    },
    onError: (e: any) => toast.error(e.response?.data?.reason || e.response?.data?.detail || "Échec du désistement."),
  });

  if (isLoading || !sale) return <div className="h-72 skeleton rounded-2xl" />;

  return (
    <div className="space-y-6">
      <Link to="/sales" className="btn-ghost"><ArrowLeft size={16} /> Retour</Link>

      {sale.withdrawal && (
        <div className="card-glow border-l-4 border-amber-500 p-5 bg-amber-50/40">
          <div className="flex items-start gap-3">
            <UserX size={24} className="text-amber-700 shrink-0" />
            <div className="flex-1">
              <h3 className="font-display font-bold text-amber-800">
                Désistement enregistré · {sale.withdrawal.by_label}
              </h3>
              <p className="text-sm text-slate-700 mt-1.5">
                <strong>Motif :</strong> {sale.withdrawal.reason}
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3 text-xs">
                <div><div className="text-slate-500">Déclaré le</div><div className="font-semibold">{formatDate(sale.withdrawal.declared_on)}</div></div>
                <div><div className="text-slate-500">Pénalité retenue</div><div className="font-semibold">{formatMoney(sale.withdrawal.penalty_amount, sale.currency)}</div></div>
                <div><div className="text-slate-500">Montant à rembourser</div><div className="font-semibold text-rose-700">{formatMoney(sale.withdrawal.refund_amount, sale.currency)}</div></div>
                <div><div className="text-slate-500">Remboursement</div><div className="font-semibold">{sale.withdrawal.refund_completed ? "Effectué" : "À effectuer"}</div></div>
              </div>
              <p className="text-xs text-emerald-700 mt-3 flex items-center gap-1.5">
                <CircleCheck size={12} /> Le lot {sale.lot_detail?.reference} est de nouveau disponible au catalogue.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="card-glow p-6 bg-gradient-to-br from-white to-brand-50/30">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-xs font-mono text-slate-400">{sale.reference}</div>
            <h1 className="text-2xl font-display font-bold">{sale.client_detail?.display_name}</h1>
            <p className="text-sm text-slate-500">Lot {sale.lot_detail?.reference} · {sale.lot_detail?.title}</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {sale.status === "draft" && (
              <Can capability="edit_sale">
                <button onClick={() => confirm.mutate()} className="btn-primary"><CircleCheck size={16} /> Confirmer</button>
              </Can>
            )}
            {!["completed", "cancelled"].includes(sale.status) && (
              <>
                <Can capability="record_payment">
                  <button onClick={() => setShowPay(true)} className="btn-primary"><Wallet size={16} /> Versement</button>
                </Can>
                <Can capability="settle_sale_in_full">
                  <button onClick={() => settle.mutate()} className="btn-secondary">Solder intégralement</button>
                </Can>
                <Can capability="renegotiate_sale">
                  <button onClick={() => setShowRenegotiate(true)} className="btn-secondary">Renégocier</button>
                </Can>
              </>
            )}
            <Can capability="print_contract">
              <button onClick={() => openAuthenticatedPdf(`/reports/contract/${sale.id}/`, `contrat-${sale.reference}.pdf`)} className="btn-secondary"><FileSignature size={16} /> Contrat PDF</button>
            </Can>
            <Can capability="print_statement">
              <button onClick={() => openAuthenticatedPdf(`/reports/statement/${sale.id}/`, `releve-${sale.reference}.pdf`)} className="btn-secondary"><FileText size={16} /> Relevé PDF</button>
            </Can>
            {!["completed", "cancelled", "withdrawn_buyer", "withdrawn_seller"].includes(sale.status) && (
              <Can capability="cancel_sale">
                <button onClick={() => setWithdrawBy("buyer")} className="btn-ghost text-amber-700">
                  <UserX size={16} /> Désistement acheteur
                </button>
                <button onClick={() => setWithdrawBy("seller")} className="btn-ghost text-amber-700">
                  <UserX size={16} /> Désistement vendeur
                </button>
                <button onClick={() => cancel.mutate()} className="btn-ghost text-rose-600">
                  <X size={16} /> Annuler la vente
                </button>
              </Can>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <div><div className="text-xs text-slate-500">Prix net</div><div className="text-lg font-bold">{formatMoney(sale.net_amount, sale.currency)}</div></div>
          <div><div className="text-xs text-slate-500">Versé</div><div className="text-lg font-bold text-emerald-700">{formatMoney(sale.total_paid, sale.currency)}</div></div>
          <div><div className="text-xs text-slate-500">Solde dû</div><div className="text-lg font-bold text-rose-700">{formatMoney(sale.balance_due, sale.currency)}</div></div>
          <div><div className="text-xs text-slate-500">Avancement</div>
            <div className="mt-1 w-full h-2 rounded-full bg-slate-100 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-brand-600 to-accent-600" style={{ width: `${Math.min(100, sale.progress_pct)}%` }} />
            </div>
            <div className="text-xs text-slate-500 mt-1">{sale.progress_pct?.toFixed(1)}%</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-5">
          <h3 className="font-display font-semibold mb-3">Échéancier</h3>
          <table className="table-clean">
            <thead><tr><th>#</th><th>Échéance</th><th className="text-right">Dû</th><th className="text-right">Versé</th><th className="text-right">Reste</th><th>Statut</th></tr></thead>
            <tbody>
              {(sale.payment_plan?.installments || []).map((i: any) => (
                <tr key={i.id}>
                  <td>{i.position}</td>
                  <td>{formatDate(i.due_on)}</td>
                  <td className="text-right">{formatMoney(i.amount_due, sale.currency)}</td>
                  <td className="text-right text-emerald-700">{formatMoney(i.amount_paid, sale.currency)}</td>
                  <td className="text-right font-semibold">{formatMoney(i.balance, sale.currency)}</td>
                  <td><span className={clsx(INSTALLMENT_CLS[i.status])}>{i.status_label}</span></td>
                </tr>
              ))}
              {(!sale.payment_plan?.installments || sale.payment_plan.installments.length === 0) && (
                <tr><td colSpan={6} className="text-center text-slate-400 py-4">Pas d'échéancier (vente non confirmée ?)</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="card p-5">
          <h3 className="font-display font-semibold mb-3">Versements enregistrés</h3>
          <table className="table-clean">
            <thead><tr><th>Reçu</th><th>Date</th><th>Mode</th><th className="text-right">Montant</th><th></th></tr></thead>
            <tbody>
              {(sale.payments || []).map((p: any) => (
                <tr key={p.id} className={clsx(p.is_void && "opacity-50", p.is_refund && "bg-rose-50/40")}>
                  <td className="font-mono text-xs">
                    {p.receipt_number}
                    {p.is_refund && <span className="pill-danger ml-2">Remboursement</span>}
                  </td>
                  <td>{formatDate(p.paid_on)}</td>
                  <td>{p.method_label}</td>
                  <td className={clsx("text-right font-semibold", p.is_refund && "text-rose-700")}>
                    {p.is_refund ? "− " : ""}{formatMoney(p.amount, p.currency)}
                  </td>
                  <td className="text-right">
                    <button onClick={() => openAuthenticatedPdf(`/reports/receipt/${p.id}/`, `recu-${p.receipt_number}.pdf`)} className="text-brand-700 text-xs font-semibold hover:underline">Reçu PDF</button>
                  </td>
                </tr>
              ))}
              {(!sale.payments || sale.payments.length === 0) && (
                <tr><td colSpan={5} className="text-center text-slate-400 py-4">Aucun versement.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION DOCUMENTS DE LA VENTE ------------------------------- */}
      <SaleDocumentsSection sale={sale} />

      <NotesAndTags entity="sale" entityId={sale.id} />

      {showPay && <PaymentForm sale={sale} onClose={() => setShowPay(false)} onSaved={() => { setShowPay(false); qc.invalidateQueries({ queryKey: ["sale", id] }); }} />}
      {showRenegotiate && <RenegotiateForm sale={sale} onClose={() => setShowRenegotiate(false)} onSaved={() => { setShowRenegotiate(false); qc.invalidateQueries({ queryKey: ["sale", id] }); }} />}
      {withdrawBy && (
        <ReasonModal
          title={`Désistement ${withdrawBy === "buyer" ? "de l'acheteur" : "du vendeur"}`}
          description={`Le lot redeviendra immédiatement disponible. ${sale.total_paid > 0 ? `Une pénalité de 10% (${formatMoney(Number(sale.total_paid) * 0.1, sale.currency)}) sera retenue par défaut.` : ""} Cette opération est tracée et irréversible.`}
          confirmLabel="Enregistrer le désistement"
          tone="warning"
          onClose={() => setWithdrawBy(null)}
          onConfirm={async (reason) => { await withdraw.mutateAsync({ by: withdrawBy, reason }); setWithdrawBy(null); }}
        />
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* DOCUMENTS DE LA VENTE                                                      */
/* -------------------------------------------------------------------------- */
function SaleDocumentsSection({ sale }: { sale: any }) {
  const qc = useQueryClient();
  const fileRef = useState<HTMLInputElement | null>(null)[0];
  const [docKind, setDocKind] = useState("signed_contract");
  const inputRef = (window as any).__sale_doc_input || { current: null };

  const upload = useMutation({
    mutationFn: async (fd: FormData) =>
      (await api.post(`/transactions/sales/${sale.id}/upload-document/`, fd,
        { headers: { "Content-Type": "multipart/form-data" } })).data,
    onSuccess: () => {
      toast.success("Document joint à la vente.");
      qc.invalidateQueries({ queryKey: ["sale", String(sale.id)] });
    },
    onError: () => toast.error("Échec de l'envoi du document."),
  });

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    fd.append("kind", docKind);
    fd.append("label", file.name);
    upload.mutate(fd);
    e.target.value = "";
  };

  return (
    <div className="card-glow p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="font-display font-semibold flex items-center gap-2">
            <FileText size={18} /> Pièces du dossier de vente
          </h3>
          <p className="text-xs text-slate-500">Contrat signé, copie de pièce d'identité, justificatifs, etc.</p>
        </div>
        <Can capability="upload_sale_document">
          <div className="flex gap-2 items-center">
            <select className="input !py-1.5 !px-2 text-xs max-w-[220px]" value={docKind} onChange={(e) => setDocKind(e.target.value)}>
              <option value="signed_contract">Contrat signé</option>
              <option value="buyer_id">Pièce d'identité de l'acheteur</option>
              <option value="buyer_proof_of_address">Justificatif de domicile</option>
              <option value="seller_document">Document du vendeur</option>
              <option value="payment_proof">Preuve de paiement</option>
              <option value="cadastral">Plan cadastral / titre</option>
              <option value="power_of_attorney">Procuration</option>
              <option value="other">Autre</option>
            </select>
            <label className="btn-primary cursor-pointer !py-1.5 text-xs">
              <Upload size={14} /> Joindre un document
              <input type="file" hidden onChange={onFileChange} accept="image/*,.pdf,.doc,.docx" />
            </label>
          </div>
        </Can>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {(sale.documents || []).map((d: any) => (
          <DocumentCard key={d.id} doc={d}
            deleteEndpoint={`/transactions/sale-documents/${d.id}/`}
            deleteCapability="delete_sale_document"
            onDeleted={() => qc.invalidateQueries({ queryKey: ["sale", String(sale.id)] })} />
        ))}
        {(!sale.documents || sale.documents.length === 0) && (
          <div className="col-span-full text-sm text-slate-400 text-center py-6">
            Aucune pièce attachée à cette vente. Joignez le contrat signé, la pièce d'identité de l'acheteur, le justificatif de domicile, ou tout autre document utile au dossier.
          </div>
        )}
      </div>
    </div>
  );
}

function PaymentForm({ sale, onClose, onSaved }: { sale: any; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    sale: sale.id, amount: sale.balance_due, method: "cash", reference: "",
  });
  const m = useMutation({
    mutationFn: async () => (await api.post("/transactions/payments/", form)).data,
    onSuccess: () => { toast.success("Versement enregistré."); onSaved(); },
    onError: (e: any) => toast.error(JSON.stringify(e.response?.data)),
  });
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="card-glow w-full max-w-md p-6">
        <h3 className="font-display font-bold text-xl flex items-center gap-2"><Receipt size={18} /> Nouveau versement</h3>
        <p className="text-sm text-slate-500 mb-4">Solde restant : <strong>{formatMoney(sale.balance_due, sale.currency)}</strong></p>
        <div className="space-y-3">
          <div><label className="label">Montant</label><input className="input" type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value as any })} /></div>
          <div><label className="label">Mode</label>
            <select className="input" value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })}>
              <option value="cash">Espèces</option>
              <option value="check">Chèque</option>
              <option value="bill_of_exchange">Traite</option>
              <option value="bank_transfer">Virement bancaire</option>
              <option value="mobile_money">Mobile Money</option>
              <option value="card">Carte bancaire</option>
              <option value="other">Autre</option>
            </select></div>
          <div><label className="label">Référence (n° chèque, n° traite, ref Mobile Money…)</label><input className="input" value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} placeholder="ex: CHQ-123456, MM-TRX-789…" /></div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="btn-secondary">Annuler</button>
          <button onClick={() => m.mutate()} disabled={m.isPending} className="btn-primary">Enregistrer</button>
        </div>
      </div>
    </div>
  );
}

function RenegotiateForm({ sale, onClose, onSaved }: { sale: any; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    payment_mode: sale.payment_mode, installment_count: sale.installment_count,
    installment_frequency_days: sale.installment_frequency_days,
  });
  const m = useMutation({
    mutationFn: async () => (await api.post(`/transactions/sales/${sale.id}/renegotiate/`, form)).data,
    onSuccess: () => { toast.success("Plan renégocié."); onSaved(); },
    onError: (e: any) => toast.error(JSON.stringify(e.response?.data)),
  });
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="card-glow w-full max-w-md p-6">
        <h3 className="font-display font-bold text-xl">Renégocier les conditions</h3>
        <p className="text-sm text-slate-500 mb-4">Les versements déjà encaissés restent intacts.</p>
        <div className="space-y-3">
          <div><label className="label">Mode</label>
            <select className="input" value={form.payment_mode} onChange={(e) => setForm({ ...form, payment_mode: e.target.value })}>
              <option value="cash">Comptant</option>
              <option value="installment">Échelonné</option>
            </select></div>
          {form.payment_mode === "installment" && (
            <>
              <div><label className="label">Nb échéances</label><input className="input" type="number" value={form.installment_count} onChange={(e) => setForm({ ...form, installment_count: +e.target.value })} /></div>
              <div><label className="label">Fréquence (jours)</label><input className="input" type="number" value={form.installment_frequency_days} onChange={(e) => setForm({ ...form, installment_frequency_days: +e.target.value })} /></div>
            </>
          )}
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="btn-secondary">Annuler</button>
          <button onClick={() => m.mutate()} disabled={m.isPending} className="btn-primary">Renégocier</button>
        </div>
      </div>
    </div>
  );
}
