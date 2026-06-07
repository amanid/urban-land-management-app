import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { MessageSquare, Pin, Plus, Tag as TagIcon, Trash2, Lock, Users } from "lucide-react";
import toast from "react-hot-toast";
import { formatDateTime } from "@/lib/format";
import { useAuthStore } from "@/store/auth";
import clsx from "clsx";

interface Props {
  entity: "lot" | "client" | "sale" | "payment";
  entityId: number | string;
}

const COLORS: Record<string, string> = {
  brand: "bg-brand-100 text-brand-800 border-brand-200",
  emerald: "bg-emerald-100 text-emerald-800 border-emerald-200",
  amber: "bg-amber-100 text-amber-800 border-amber-200",
  rose: "bg-rose-100 text-rose-800 border-rose-200",
  violet: "bg-violet-100 text-violet-800 border-violet-200",
  slate: "bg-slate-100 text-slate-700 border-slate-200",
};

export default function NotesAndTags({ entity, entityId }: Props) {
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const [body, setBody] = useState("");
  const [visibility, setVisibility] = useState<"internal" | "private">("internal");

  const { data } = useQuery({
    queryKey: ["entity-notes", entity, entityId],
    queryFn: async () => (await api.get(`/notes/entity/${entity}/${entityId}/`)).data,
  });

  const { data: allTags } = useQuery({
    queryKey: ["tags"],
    queryFn: async () => (await api.get("/notes/tags/")).data,
  });

  const addNote = useMutation({
    mutationFn: async () => {
      return (await api.post("/notes/notes/", {
        entity, entity_id: entityId, body: body.trim(), visibility,
      })).data;
    },
    onSuccess: () => {
      setBody("");
      qc.invalidateQueries({ queryKey: ["entity-notes", entity, entityId] });
      toast.success("Note ajoutée");
    },
    onError: () => toast.error("Échec d'ajout de la note"),
  });

  const deleteNote = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/notes/notes/${id}/`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["entity-notes", entity, entityId] }),
  });

  const togglePin = useMutation({
    mutationFn: async ({ id, pinned }: { id: number; pinned: boolean }) =>
      (await api.patch(`/notes/notes/${id}/`, { pinned })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["entity-notes", entity, entityId] }),
  });

  const attachTag = useMutation({
    mutationFn: async (tagId: number) =>
      (await api.post("/notes/tagged-items/", { tag: tagId, entity, entity_id: entityId })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["entity-notes", entity, entityId] }),
  });

  const removeTag = useMutation({
    mutationFn: async (taggedId: number) =>
      (await api.delete(`/notes/tagged-items/${taggedId}/`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["entity-notes", entity, entityId] }),
  });

  const tagsApplied: any[] = data?.tags || [];
  const tagIdsApplied = new Set(tagsApplied.map((t) => t.tag));
  const availableTags = (allTags?.results || allTags || []).filter((t: any) => !tagIdsApplied.has(t.id));

  return (
    <div className="card-glow p-5 space-y-5">
      <div>
        <h3 className="font-display font-semibold mb-2 flex items-center gap-2">
          <TagIcon size={16} /> Étiquettes
        </h3>
        <div className="flex flex-wrap gap-2">
          {tagsApplied.map((ti) => (
            <span key={ti.id} className={clsx(
              "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border",
              COLORS[ti.tag_color] || COLORS.slate,
            )}>
              {ti.tag_name}
              <button onClick={() => removeTag.mutate(ti.id)} className="hover:bg-black/10 rounded-full w-4 h-4 grid place-items-center"
                      title="Retirer">×</button>
            </span>
          ))}
          {availableTags.length > 0 && (
            <details className="relative">
              <summary className="list-none inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 border border-slate-200 cursor-pointer hover:bg-slate-200">
                <Plus size={12} /> Ajouter
              </summary>
              <div className="absolute mt-1 left-0 z-10 card-glow p-2 w-56 max-h-64 overflow-y-auto">
                {availableTags.map((t: any) => (
                  <button key={t.id} onClick={() => attachTag.mutate(t.id)}
                          className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-slate-50 text-xs flex items-center gap-2">
                    <span className={clsx("w-2 h-2 rounded-full",
                      `bg-${t.color}-500` in COLORS ? `` : "bg-slate-400")} />
                    {t.name}
                  </button>
                ))}
              </div>
            </details>
          )}
          {tagsApplied.length === 0 && availableTags.length === 0 && (
            <span className="text-xs text-slate-400">Aucune étiquette définie (créez-en via API).</span>
          )}
        </div>
      </div>

      <div className="border-t border-slate-100 pt-4">
        <h3 className="font-display font-semibold mb-3 flex items-center gap-2">
          <MessageSquare size={16} /> Notes ({data?.notes?.length || 0})
        </h3>
        <div className="flex gap-2 mb-3">
          <textarea
            value={body} onChange={(e) => setBody(e.target.value)}
            placeholder="Ajouter une note (visible par votre équipe)…"
            className="input min-h-[60px] flex-1 text-sm"
          />
          <div className="flex flex-col gap-2">
            <select value={visibility} onChange={(e) => setVisibility(e.target.value as any)}
                    className="input !py-1 !px-2 text-xs">
              <option value="internal">🤝 Équipe</option>
              <option value="private">🔒 Privée</option>
            </select>
            <button onClick={() => addNote.mutate()}
                    disabled={body.trim().length < 2 || addNote.isPending}
                    className="btn-primary text-xs !py-1.5">
              {addNote.isPending ? "…" : "Publier"}
            </button>
          </div>
        </div>

        <ul className="space-y-2">
          {(data?.notes || []).map((n: any) => (
            <li key={n.id} className={clsx(
              "rounded-xl p-3 border",
              n.pinned ? "bg-amber-50/60 border-amber-200" : "bg-white border-slate-200",
            )}>
              <div className="flex items-start justify-between gap-2 text-xs text-slate-500 mb-1">
                <div className="flex items-center gap-1.5">
                  <strong className="text-slate-700">{n.author_name}</strong>
                  <span>·</span>
                  <span>{formatDateTime(n.created_at)}</span>
                  {n.visibility === "private" && <Lock size={11} className="text-slate-400" />}
                  {n.visibility === "internal" && <Users size={11} className="text-slate-400" />}
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => togglePin.mutate({ id: n.id, pinned: !n.pinned })}
                          className={clsx("p-1 rounded hover:bg-slate-100",
                            n.pinned && "text-amber-600")}
                          title={n.pinned ? "Désépingler" : "Épingler"}>
                    <Pin size={12} />
                  </button>
                  {n.author === user?.id && (
                    <button onClick={() => deleteNote.mutate(n.id)}
                            className="p-1 rounded hover:bg-rose-50 text-rose-600"
                            title="Supprimer">
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              </div>
              <div className="text-sm whitespace-pre-wrap text-slate-800">{n.body}</div>
            </li>
          ))}
          {(!data?.notes || data.notes.length === 0) && (
            <li className="text-sm text-slate-400 text-center py-4">
              Aucune note pour le moment. Soyez le premier à en laisser une.
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}
