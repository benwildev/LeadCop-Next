import React, { useRef, useState } from "react";
import { Upload, X, Image as ImageIcon, Loader2, ExternalLink } from "lucide-react";

interface Props {
  value: string | null;
  onChange: (url: string | null) => void;
  label: string;
  hint?: string;
  accept?: string;
}

export default function CloudinaryUpload({ value, onChange, label, hint, accept = "image/*" }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    setError(null);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Upload failed");
      onChange(json.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  };

  const isImage = value && /\.(png|jpe?g|gif|webp|svg)(\?.*)?$/i.test(value);

  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-foreground">{label}</label>

      <div
        onDrop={handleDrop}
        onDragOver={e => e.preventDefault()}
        className="relative rounded-xl border-2 border-dashed border-border bg-muted/20 transition-colors hover:border-primary/40 hover:bg-primary/5"
      >
        {/* Preview area */}
        {value ? (
          <div className="flex items-center gap-3 p-3">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-border bg-muted overflow-hidden">
              {isImage ? (
                <img src={value ?? undefined} alt="preview" className="h-full w-full object-contain" />
              ) : (
                <ImageIcon className="h-6 w-6 text-muted-foreground" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs text-muted-foreground font-mono">{value}</p>
              <a
                href={value}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-0.5 flex items-center gap-1 text-[10px] text-primary hover:underline"
              >
                <ExternalLink className="h-2.5 w-2.5" /> Open in new tab
              </a>
            </div>
            <div className="flex shrink-0 gap-1.5">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={uploading}
                className="flex h-7 items-center gap-1.5 rounded-md border border-border bg-background px-2.5 text-xs text-foreground hover:bg-muted transition-colors disabled:opacity-50"
              >
                {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                Replace
              </button>
              <button
                type="button"
                onClick={() => onChange(null)}
                className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-background text-muted-foreground hover:text-destructive hover:border-destructive/50 transition-colors"
                title="Remove"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="flex w-full flex-col items-center gap-2 py-8 text-center disabled:opacity-60"
          >
            {uploading ? (
              <>
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="text-sm text-muted-foreground">Uploading…</span>
              </>
            ) : (
              <>
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <Upload className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Click to upload</p>
                  <p className="text-xs text-muted-foreground">or drag and drop</p>
                </div>
                <p className="text-[10px] text-muted-foreground">PNG, JPG, GIF, WebP, SVG, ICO — max 5 MB</p>
              </>
            )}
          </button>
        )}

        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={handleChange}
        />
      </div>

      {error && (
        <p className="flex items-center gap-1 text-xs text-destructive">
          <X className="h-3 w-3" /> {error}
        </p>
      )}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
