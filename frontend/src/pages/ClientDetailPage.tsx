import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Upload, FileText, Pencil, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { formatDate } from "@/lib/format";
import DocumentCard from "@/components/DocumentCard";
import EditClientModal from "@/components/EditClientModal";
import ReasonModal from "@/components/ReasonModal";
import NotesAndTags from "@/components/NotesAndTags";
import Can from "@/components/Can";

export default function ClientDetailPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [docKind, setDocKind] = useState("cni");
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  const { data: client, isLoading } = useQuery({
    queryKey: ["client", id],
    queryFn: async () => (await api.get(`/clients/${id}/`)).data,
  });
  const { data: history } = useQuery({
    queryKey: ["client-history", id],
    queryFn: async () => (await api.get(`/clients/${id}/history/`)).data,
  });

  const uploadDoc = useMutation({
    mutationFn: async (formData: FormData) =>
      (await api.post(`/clients/${id}/upload-document/`, formData,
        { headers: { "Content-Type": "multipart/form-data" } })).data,
    onSuccess: () => {
      toast.success("Document ajouté.");
      qc.invalidateQueries({ queryKey: ["client", id] });
      qc.invalidateQueries({ queryKey: ["client-history", id] });
    },
    onError: () => toast.error("Échec de l'upload."),
  });

  const deleteClient = useMutation({
    mutationFn: async (reason: string) =>
      (await api.delete(`/clients/${id}/`, { headers: { "X-Change-Reason": reason } })).data,
    onSuccess: () => { toast.success("Client supprimé."); nav("/clients"); },
    onError: (e: any) => toast.error(e.response?.data?.detail || "Échec de la suppression."),
  });

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    fd.append("kind", docKind);
    fd.append("label", file.name);
    uploadDoc.mutate(fd);
    e.target.value = "";
  };

  if (isLoading || !client) return <div className="h-72 skeleton rounded-2xl" />;

  return (
    <div className="space-y-6">
      <Link to="/clients" className="btn-ghost"><ArrowLeft size={16} /> Retour</Link>

      {showEdit && <EditClientModal client={client} onClose={() => setShowEdit(false)} />}
      {showDelete && (
        <ReasonModal
          title={`Supprimer ${client.display_name} ?`}
          description="Cette action supprimera définitivement la fiche client et tous ses documents. L'opération est tracée dans le journal d'audit."
          tone="danger"
          confirmLabel="Supprimer définitivement"
          onClose={() => setShowDelete(false)}
          onConfirm={(reason) => deleteClient.mutateAsync(reason)}
        />
      )}

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs font-mono text-slate-400">{client.code}</div>
          <h1 className="text-2xl font-display font-bold">{client.display_name}</h1>
          <p className="text-sm text-slate-500">{client.kind_label}</p>
        </div>
        <div className="flex flex-col items-end gap-3">
          <div className="text-sm text-slate-600 text-right">
            {client.email && <div>{client.email}</div>}
            {client.phone && <div>{client.phone}</div>}
            {client.id_number && <div>{client.id_kind_label} · {client.id_number}</div>}
          </div>
          <div className="flex gap-2">
            <Can capability="manage_clients">
              <button onClick={() => setShowEdit(true)} className="btn-secondary"><Pencil size={14} /> Modifier</button>
            </Can>
            <Can capability="delete_client_document">
              <button onClick={() => setShowDelete(true)} className="btn-ghost text-rose-600"><Trash2 size={14} /> Supprimer</button>
            </Can>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card p-5">
          <h3 className="font-display font-semibold mb-3">Identité</h3>
          <dl className="text-sm space-y-1.5">
            <div className="flex justify-between"><dt className="text-slate-500">Date naissance</dt><dd>{formatDate(client.birth_date)}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Lieu</dt><dd>{client.birth_place || "—"}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Nationalité</dt><dd>{client.nationality}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Profession</dt><dd>{client.profession || "—"}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Adresse</dt><dd>{client.address || "—"}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Ville</dt><dd>{client.city}</dd></div>
          </dl>
        </div>

        <div className="card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display font-semibold">Documents</h3>
            <div className="flex gap-2 items-center">
              <select className="input !py-1.5 !px-2 text-xs max-w-[200px]" value={docKind} onChange={(e) => setDocKind(e.target.value)}>
                <option value="cni">CNI</option>
                <option value="passport">Passeport</option>
                <option value="driver_license">Permis</option>
                <option value="resident_card">Carte séjour</option>
                <option value="sale_contract">Contrat de vente</option>
                <option value="purchase_contract">Contrat d'achat</option>
                <option value="proof_of_address">Justif domicile</option>
                <option value="other">Autre</option>
              </select>
              <button onClick={() => fileRef.current?.click()} className="btn-primary !py-1.5 text-xs">
                <Upload size={14} /> Uploader
              </button>
              <input ref={fileRef} type="file" hidden onChange={onFile} />
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {(client.documents || []).map((d: any) => (
              <DocumentCard key={d.id} doc={d}
                deleteEndpoint={`/clients/documents/${d.id}/`}
                deleteCapability="delete_client_document"
                onDeleted={() => qc.invalidateQueries({ queryKey: ["client", id] })} />
            ))}
            {(!client.documents || client.documents.length === 0) && (
              <div className="col-span-full text-sm text-slate-400 text-center py-6">
                Aucun document n'est attaché à ce client pour le moment.
              </div>
            )}
          </div>
        </div>
      </div>

      <NotesAndTags entity="client" entityId={Number(id)} />

      <div className="card p-5">
        <h3 className="font-display font-semibold mb-3">Historique</h3>
        <ul className="space-y-3">
          {(history?.events || []).map((e: any, i: number) => (
            <li key={i} className="flex gap-3 text-sm">
              <div className="w-2 h-2 rounded-full bg-accent-500 mt-1.5 shrink-0" />
              <div className="flex-1">
                <div className="font-medium">{e.title}</div>
                <div className="text-slate-500 text-xs">{e.detail}</div>
              </div>
              <div className="text-xs text-slate-400">{formatDate(e.ts)}</div>
            </li>
          ))}
          {(!history?.events || history.events.length === 0) && (
            <li className="text-sm text-slate-400">Aucun événement.</li>
          )}
        </ul>
      </div>
    </div>
  );
}
