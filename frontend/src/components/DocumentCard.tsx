import { FileText, Eye, Download, Trash2, FileImage, FileSpreadsheet, File } from "lucide-react";
import { api } from "@/lib/api";
import toast from "react-hot-toast";
import Can from "@/components/Can";
import { Capability } from "@/lib/permissions";
import { formatDate } from "@/lib/format";

export interface DocLike {
  id: number | string;
  kind_label?: string;
  label?: string;
  file?: string | null;
  file_url?: string | null;
  uploaded_at?: string;
  issued_on?: string | null;
}

interface Props {
  doc: DocLike;
  deleteEndpoint?: string;        // ex: /clients/documents/123/
  onDeleted?: () => void;
  deleteCapability?: Capability;  // who can delete
}

function extOf(url?: string | null) {
  return (url || "").split(/[?#]/)[0].split(".").pop()?.toLowerCase() || "";
}

function IconFor({ url }: { url?: string | null }) {
  const e = extOf(url);
  if (["png", "jpg", "jpeg", "webp", "gif", "bmp", "svg"].includes(e))
    return <FileImage size={36} className="text-brand-500" />;
  if (["xls", "xlsx", "csv"].includes(e))
    return <FileSpreadsheet size={36} className="text-emerald-600" />;
  if (e === "pdf")
    return <FileText size={36} className="text-rose-500" />;
  if (["doc", "docx"].includes(e))
    return <FileText size={36} className="text-blue-500" />;
  return <File size={36} className="text-slate-400" />;
}

export default function DocumentCard({ doc, deleteEndpoint, onDeleted, deleteCapability }: Props) {
  const url = doc.file_url || doc.file || "";
  const isImg = ["png", "jpg", "jpeg", "webp", "gif"].includes(extOf(url));

  async function downloadDoc() {
    const id = toast.loading("Téléchargement…");
    try {
      // Use axios so it goes via the Vite proxy + auth header
      const r = await api.get(url.replace(/^\/api\/v1/, ""), { responseType: "blob", baseURL: "" });
      const blob = new Blob([r.data]);
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = (doc.label || `${doc.kind_label || "document"}-${doc.id}`).replace(/[^\w.\- ]/g, "_");
      document.body.appendChild(a);
      a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(objectUrl), 30_000);
      toast.success("Document téléchargé.", { id });
    } catch (e) {
      toast.error("Échec du téléchargement.", { id });
    }
  }

  async function deleteDoc() {
    if (!deleteEndpoint) return;
    if (!confirm("Supprimer définitivement ce document ?")) return;
    const id = toast.loading("Suppression…");
    try {
      await api.delete(deleteEndpoint, {
        headers: { "X-Change-Reason": "Suppression document via interface" },
      });
      toast.success("Document supprimé.", { id });
      onDeleted?.();
    } catch (e: any) {
      toast.error(e.response?.data?.detail || "Échec de la suppression.", { id });
    }
  }

  return (
    <div className="card p-3 group hover:shadow-glow transition flex flex-col">
      <a href={url} target="_blank" rel="noreferrer" className="block">
        <div className="aspect-[4/3] rounded-lg bg-slate-100 grid place-items-center overflow-hidden">
          {isImg ? (
            <img src={url} alt={doc.label || ""} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
          ) : (
            <IconFor url={url} />
          )}
        </div>
        <div className="text-xs font-semibold mt-2 truncate text-slate-800">{doc.kind_label || "Document"}</div>
        <div className="text-[10px] text-slate-400 truncate">{doc.label || extOf(url).toUpperCase()}</div>
        <div className="text-[10px] text-slate-400 mt-0.5">{formatDate(doc.uploaded_at)}</div>
      </a>
      <div className="mt-2 flex gap-1.5">
        <a href={url} target="_blank" rel="noreferrer"
           className="btn-secondary !py-1 !px-2 text-[11px] flex-1 justify-center" title="Visualiser">
          <Eye size={12} /> Voir
        </a>
        <button onClick={downloadDoc}
                className="btn-secondary !py-1 !px-2 text-[11px] flex-1 justify-center" title="Télécharger">
          <Download size={12} /> Télécharger
        </button>
        {deleteEndpoint && (
          <Can capability={deleteCapability || "delete_sale_document"}>
            <button onClick={deleteDoc}
                    className="!py-1 !px-2 rounded-xl text-rose-600 hover:bg-rose-50 border border-slate-200 text-[11px]"
                    title="Supprimer">
              <Trash2 size={12} />
            </button>
          </Can>
        )}
      </div>
    </div>
  );
}
