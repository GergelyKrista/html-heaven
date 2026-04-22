"use client";

import { useState, useRef } from "react";

interface Props {
  /** Current avatar URL (GitHub or previously-uploaded data URL). */
  current: string | null;
  /** Fallback initial when there's no image at all. */
  name: string;
  /** Called after a successful upload/reset with the new avatar URL. */
  onChange?: (newAvatar: string | null) => void;
}

const TARGET_SIZE = 400;         // max dimension — scales down, never up
const JPEG_QUALITY = 0.85;
const MAX_FILE_BYTES = 8 * 1024 * 1024; // reject pictures bigger than 8MB even before compression

/**
 * Reads the file, draws it to a canvas scaled to TARGET_SIZE, and exports
 * as a JPEG data URL. This keeps the stored avatar small (~30-80 KB).
 */
async function compressImage(file: File): Promise<string> {
  const img = new Image();
  const url = URL.createObjectURL(file);
  try {
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Couldn't decode image."));
      img.src = url;
    });

    const srcW = img.naturalWidth;
    const srcH = img.naturalHeight;
    const scale = Math.min(1, TARGET_SIZE / Math.max(srcW, srcH));
    const outW = Math.round(srcW * scale);
    const outH = Math.round(srcH * scale);

    const canvas = document.createElement("canvas");
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas not available.");
    ctx.drawImage(img, 0, 0, outW, outH);
    return canvas.toDataURL("image/jpeg", JPEG_QUALITY);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function AvatarUploader({ current, name, onChange }: Props) {
  const [preview, setPreview] = useState<string | null>(current);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = ""; // allow picking the same file again

    setError("");
    if (file.size > MAX_FILE_BYTES) {
      setError("Image is too big. Please pick one smaller than 8 MB.");
      return;
    }
    if (!file.type.startsWith("image/")) {
      setError("Please pick an image file.");
      return;
    }

    setUploading(true);
    try {
      const dataUrl = await compressImage(file);
      setPreview(dataUrl);

      const res = await fetch("/api/profile/avatar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataUrl }),
      });
      const data = (await res.json()) as { avatar?: string | null; error?: string };
      if (!res.ok) {
        setError(data.error || "Upload failed.");
        setPreview(current);
      } else {
        onChange?.(data.avatar ?? null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
      setPreview(current);
    }
    setUploading(false);
  }

  async function handleReset() {
    setError("");
    setUploading(true);
    try {
      const res = await fetch("/api/profile/avatar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataUrl: null }),
      });
      const data = (await res.json()) as { avatar?: string | null; error?: string };
      if (!res.ok) {
        setError(data.error || "Reset failed.");
      } else {
        setPreview(data.avatar ?? null);
        onChange?.(data.avatar ?? null);
      }
    } catch {
      setError("Network error.");
    }
    setUploading(false);
  }

  return (
    <div className="flex items-start gap-4">
      <div className="relative">
        {preview ? (
          <img
            src={preview}
            alt="Your avatar"
            className="h-20 w-20 rounded-full border-2 border-border object-cover"
          />
        ) : (
          <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-border bg-surface-2 text-2xl font-semibold text-muted">
            {name[0]?.toUpperCase() || "?"}
          </div>
        )}
        {uploading && (
          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 text-[11px] font-medium text-white">
            ...
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1.5">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="h-8 rounded-md border border-border bg-surface px-3 text-[12px] font-medium text-foreground hover:bg-surface-2 disabled:opacity-50"
          >
            Upload new
          </button>
          {preview && (
            <button
              type="button"
              onClick={handleReset}
              disabled={uploading}
              className="h-8 rounded-md border border-border px-3 text-[12px] font-medium text-muted-light hover:text-foreground disabled:opacity-50"
            >
              Use GitHub avatar
            </button>
          )}
        </div>
        <p className="text-[11px] text-muted">
          JPEG, PNG, WebP, or GIF. We&apos;ll resize it to fit.
        </p>
        {error && <p className="text-[12px] text-red-400">{error}</p>}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFile}
        />
      </div>
    </div>
  );
}
