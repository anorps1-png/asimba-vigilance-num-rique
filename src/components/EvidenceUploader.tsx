import { useRef, useState } from "react";
import { UploadCloud, X, Loader2, FileIcon } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export type EvidenceFile = {
  path: string;
  name: string;
  mime: string;
  size: number;
};

const ACCEPTED = "image/*,video/*,audio/*,application/pdf,.doc,.docx";
const MAX_BYTES = 100 * 1024 * 1024; // doit rester cohérent avec le bucket "preuves-signalements"

export function EvidenceUploader({
  signalementId,
  files,
  onFilesChange,
}: {
  signalementId: string;
  files: EvidenceFile[];
  onFilesChange: (files: EvidenceFile[]) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFiles(selected: FileList | null) {
    if (!selected || selected.length === 0) return;
    setUploading(true);
    const uploaded: EvidenceFile[] = [];
    for (const file of Array.from(selected)) {
      if (file.size > MAX_BYTES) {
        toast.error(`${file.name} dépasse 100 Mo`, { description: "Fichier ignoré." });
        continue;
      }
      const path = `${signalementId}/${crypto.randomUUID()}-${file.name}`;
      const { error } = await supabase.storage
        .from("preuves-signalements")
        .upload(path, file, { contentType: file.type || undefined });
      if (error) {
        toast.error(`Échec de l'envoi de ${file.name}`, { description: error.message });
        continue;
      }
      uploaded.push({ path, name: file.name, mime: file.type, size: file.size });
    }
    if (uploaded.length > 0) onFilesChange([...files, ...uploaded]);
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function removeFile(path: string) {
    onFilesChange(files.filter((f) => f.path !== path));
    const { error } = await supabase.storage.from("preuves-signalements").remove([path]);
    if (error) {
      toast.error("Impossible de retirer ce fichier du serveur", { description: error.message });
    }
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ACCEPTED}
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="w-full rounded-lg border-2 border-dashed border-border p-8 text-center hover:border-primary/40 transition-colors cursor-pointer disabled:opacity-60"
      >
        {uploading ? (
          <Loader2 className="mx-auto h-8 w-8 text-muted-foreground animate-spin" />
        ) : (
          <UploadCloud className="mx-auto h-8 w-8 text-muted-foreground" />
        )}
        <div className="mt-2 text-[13px] font-medium">
          {uploading ? "Envoi en cours…" : "Glissez-déposez ou cliquez pour téléverser"}
        </div>
        <div className="mt-1 text-[11.5px] text-muted-foreground">
          JPG, PNG, MP4, MP3, PDF, DOCX · 100 Mo max par fichier
        </div>
      </button>
      {files.length > 0 && (
        <ul className="mt-3 space-y-2">
          {files.map((f) => (
            <li
              key={f.path}
              className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-[12.5px]"
            >
              <span className="flex min-w-0 items-center gap-2">
                <FileIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <span className="truncate">{f.name}</span>
                <span className="shrink-0 text-muted-foreground">
                  ({Math.max(1, Math.round(f.size / 1024))} Ko)
                </span>
              </span>
              <button
                type="button"
                onClick={() => removeFile(f.path)}
                aria-label={`Retirer ${f.name}`}
                className="shrink-0 text-muted-foreground hover:text-destructive"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
