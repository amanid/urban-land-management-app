import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/lib/api";
import { formatMoney, formatDate } from "@/lib/format";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Building2, MapPinned, FileText, Upload, Pencil, Trash2 } from "lucide-react";
import Can from "@/components/Can";
import DocumentCard from "@/components/DocumentCard";
import EditLotModal from "@/components/EditLotModal";
import ReasonModal from "@/components/ReasonModal";
import NotesAndTags from "@/components/NotesAndTags";
import toast from "react-hot-toast";

// Fix default icon path for Leaflet under Vite
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

export default function LotDetailPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  const { data: lot, isLoading } = useQuery({
    queryKey: ["lot", id],
    queryFn: async () => (await api.get(`/lots/${id}/`)).data,
  });
  const { data: history } = useQuery({
    queryKey: ["lot-history", id],
    queryFn: async () => (await api.get(`/lots/${id}/history/`)).data,
  });

  const deleteLot = useMutation({
    mutationFn: async (reason: string) =>
      (await api.delete(`/lots/${id}/`, { headers: { "X-Change-Reason": reason } })).data,
    onSuccess: () => { toast.success("Lot supprimé."); nav("/lots"); },
    onError: (e: any) => toast.error(e.response?.data?.detail || "Échec de la suppression."),
  });

  if (isLoading || !lot) return <div className="h-64 skeleton rounded-2xl" />;

  return (
    <div className="space-y-6">
      <Link to="/lots" className="btn-ghost"><ArrowLeft size={16} /> Retour</Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs font-mono text-slate-400">{lot.reference}</div>
          <h1 className="text-2xl font-display font-bold">{lot.title}</h1>
          <p className="text-sm text-slate-500 flex items-center gap-1"><MapPinned size={14} /> {lot.city_name} {lot.neighborhood_name && `— ${lot.neighborhood_name}`}</p>
        </div>
        <div className="flex flex-col items-end gap-3">
          <div className="text-right">
            <div className="text-xs text-slate-500">Prix affiché</div>
            <div className="text-3xl font-bold gradient-text">{formatMoney(lot.asking_price, lot.currency)}</div>
            <div className="text-xs text-slate-500">{formatMoney(lot.price_per_m2, lot.currency)}/m²</div>
          </div>
          <div className="flex gap-2">
            <Can capability="manage_lots">
              <button onClick={() => setShowEdit(true)} className="btn-secondary"><Pencil size={14} /> Modifier</button>
            </Can>
            <Can capability="delete_lot">
              <button onClick={() => setShowDelete(true)} className="btn-ghost text-rose-600"><Trash2 size={14} /> Supprimer</button>
            </Can>
          </div>
        </div>
      </div>

      {showEdit && <EditLotModal lot={lot} onClose={() => setShowEdit(false)} />}
      {showDelete && (
        <ReasonModal
          title={`Supprimer le lot ${lot.reference} ?`}
          description="Cette suppression est définitive et tracée dans le journal d'audit. Tous les documents attachés seront également retirés."
          tone="danger"
          confirmLabel="Supprimer définitivement"
          onClose={() => setShowDelete(false)}
          onConfirm={(reason) => deleteLot.mutateAsync(reason)}
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card overflow-hidden">
          {lot.latitude && lot.longitude ? (
            <MapContainer center={[+lot.latitude, +lot.longitude]} zoom={15} className="h-80 w-full">
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <Marker position={[+lot.latitude, +lot.longitude]}>
                <Popup>{lot.reference} — {lot.title}</Popup>
              </Marker>
            </MapContainer>
          ) : (
            <div className="h-80 bg-gradient-to-br from-brand-100 to-accent-400/20 grid place-items-center text-brand-300">
              <Building2 size={64} />
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="card p-5">
            <h3 className="font-display font-semibold mb-3">Caractéristiques</h3>
            <dl className="text-sm space-y-1.5">
              <div className="flex justify-between"><dt className="text-slate-500">Surface</dt><dd className="font-semibold">{lot.surface_m2} m²</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Type</dt><dd>{lot.lot_type_label}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Cadastral</dt><dd>{lot.cadastral_ref || "—"}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Statut</dt><dd>{lot.status_label}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Viabilisé</dt><dd>{lot.is_serviced ? "Oui" : "Partiel"}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Titre foncier</dt><dd>{lot.has_title_deed ? "Oui" : "Non"}</dd></div>
            </dl>
          </div>
          <div className="card p-5">
            <h3 className="font-display font-semibold mb-3">Viabilisation</h3>
            <div className="flex flex-wrap gap-2">
              {lot.has_water && <span className="pill-success">Eau</span>}
              {lot.has_electricity && <span className="pill-success">Électricité</span>}
              {lot.has_road_access && <span className="pill-success">Voirie</span>}
              {lot.has_sewage && <span className="pill-success">Assainissement</span>}
              {lot.has_internet && <span className="pill-info">Internet</span>}
              {!lot.is_serviced && <span className="pill-warning">Partiellement viabilisé</span>}
            </div>
          </div>
        </div>
      </div>

      <LotDocumentsSection lotId={lot.id} documents={lot.documents || []} />

      <NotesAndTags entity="lot" entityId={lot.id} />

      <div className="card p-5">
        <h3 className="font-display font-semibold mb-3 flex items-center gap-2"><FileText size={16} /> Historique du lot</h3>
        <ul className="space-y-3">
          {(history?.events || []).map((e: any, i: number) => (
            <li key={i} className="flex gap-3 text-sm">
              <div className="w-2 h-2 rounded-full bg-brand-500 mt-1.5 shrink-0" />
              <div className="flex-1">
                <div className="font-medium">{e.title}</div>
                <div className="text-slate-500 text-xs">{e.detail}</div>
              </div>
              <div className="text-xs text-slate-400">{formatDate(e.ts)}</div>
            </li>
          ))}
          {(!history?.events || history.events.length === 0) && (
            <li className="text-sm text-slate-400">Aucun événement enregistré.</li>
          )}
        </ul>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
function LotDocumentsSection({ lotId, documents }: { lotId: number; documents: any[] }) {
  const qc = useQueryClient();
  const [kind, setKind] = useState("title_deed");

  const upload = useMutation({
    mutationFn: async (fd: FormData) =>
      (await api.post(`/lots/${lotId}/upload-document/`, fd,
        { headers: { "Content-Type": "multipart/form-data" } })).data,
    onSuccess: () => {
      toast.success("Document ajouté au lot.");
      qc.invalidateQueries({ queryKey: ["lot", String(lotId)] });
    },
    onError: () => toast.error("Échec de l'envoi du document."),
  });

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    fd.append("kind", kind);
    fd.append("label", file.name);
    upload.mutate(fd);
    e.target.value = "";
  };

  return (
    <div className="card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div>
          <h3 className="font-display font-semibold flex items-center gap-2"><FileText size={16} /> Documents du lot</h3>
          <p className="text-xs text-slate-500">Titre foncier, plan cadastral, levés topographiques, attestations.</p>
        </div>
        <Can capability="upload_sale_document">
          <div className="flex items-center gap-2">
            <select value={kind} onChange={(e) => setKind(e.target.value)} className="input !py-1.5 !px-2 text-xs max-w-[200px]">
              <option value="title_deed">Titre foncier</option>
              <option value="cadastral_plan">Plan cadastral</option>
              <option value="land_survey">Levé topographique</option>
              <option value="purchase_deed">Acte d'achat</option>
              <option value="evaluation">Évaluation</option>
              <option value="building_permit">Permis de construire</option>
              <option value="occupancy_permit">Permis d'occupation</option>
              <option value="aerial_photo">Photo aérienne</option>
              <option value="utility_letter">Attestation de viabilisation</option>
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
        {documents.map((d: any) => (
          <DocumentCard key={d.id} doc={d}
            deleteEndpoint={`/lots/documents/${d.id}/`}
            deleteCapability="delete_lot"
            onDeleted={() => qc.invalidateQueries({ queryKey: ["lot", String(lotId)] })} />
        ))}
        {documents.length === 0 && (
          <div className="col-span-full text-sm text-slate-400 text-center py-6">
            Aucun document attaché à ce lot. Cliquez sur « Joindre un document » pour ajouter le titre foncier, le plan cadastral ou une attestation.
          </div>
        )}
      </div>
    </div>
  );
}
