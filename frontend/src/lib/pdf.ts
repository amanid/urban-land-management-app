import { api } from "./api";
import toast from "react-hot-toast";

/**
 * Telecharge un document PDF authentifie (JWT) et l'ouvre dans un nouvel onglet.
 * Resout le probleme des <a href="/api/..."> qui n'envoient pas le token.
 */
export async function openAuthenticatedPdf(path: string, filename = "document.pdf") {
  const id = toast.loading("Génération du document…");
  try {
    const r = await api.get(path, { responseType: "blob" });
    const contentType = String(r.headers["content-type"] || "application/pdf");
    const blob = new Blob([r.data], { type: contentType });
    const url = URL.createObjectURL(blob);

    // Open in new tab. If popups are blocked, fall back to a download.
    const win = window.open(url, "_blank");
    if (!win) {
      const a = document.createElement("a");
      a.href = url; a.download = filename;
      document.body.appendChild(a); a.click(); a.remove();
    }
    // Release the object URL after a delay so the new tab can load it.
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
    toast.success("Document prêt", { id });
  } catch (e: any) {
    toast.error(e.response?.data?.detail || "Impossible de générer le document.", { id });
  }
}
