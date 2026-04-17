"use client";

import { useState, useRef } from "react";
import { AIGuide } from "./AIGuide";

const AVAILABLE_TAGS = [
  "games", "creative", "art", "tools", "design",
  "productivity", "utilities", "education", "fun",
];

type Step = "upload" | "metadata" | "preview" | "submitting" | "done";

export function SubmitForm() {
  const [step, setStep] = useState<Step>("upload");
  const [htmlFile, setHtmlFile] = useState<File | null>(null);
  const [htmlContent, setHtmlContent] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [prUrl, setPrUrl] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFile(file: File | null | undefined) {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setError("File too large. Maximum size is 2MB.");
      return;
    }
    if (!file.name.endsWith(".html") && !file.name.endsWith(".htm")) {
      setError("HTML files only (.html or .htm).");
      return;
    }
    setError("");
    setHtmlFile(file);
    file.text().then(setHtmlContent);
  }

  function handleFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    handleFile(e.target.files?.[0]);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    handleFile(file);
  }

  function toggleTag(tag: string) {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }

  async function handleSubmit() {
    if (!htmlFile) return;
    setStep("submitting");
    setError("");
    const formData = new FormData();
    formData.append("html", htmlFile);
    formData.append("title", title);
    formData.append("description", description);
    formData.append("tags", JSON.stringify(selectedTags));
    try {
      const res = await fetch("/api/submit", { method: "POST", body: formData });
      const data = await res.json() as { error?: string; prUrl?: string };
      if (!res.ok) throw new Error(data.error || "Failed");
      setPrUrl(data.prUrl || "");
      setStep("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setStep("preview");
    }
  }

  const steps: Step[] = ["upload", "metadata", "preview"];
  const currentIdx = steps.indexOf(
    step === "submitting" || step === "done" ? "preview" : step
  );

  return (
    <div className="mx-auto max-w-xl">
      {/* Steps */}
      <div className="mb-6 flex items-center gap-1">
        {["File", "Details", "Review"].map((label, i) => (
          <div key={label} className="flex items-center gap-1">
            <span
              className={`flex h-6 w-6 items-center justify-center rounded text-[11px] font-semibold ${
                i <= currentIdx ? "bg-primary text-white" : "bg-surface-2 text-muted"
              }`}
            >
              {i + 1}
            </span>
            <span className={`text-[12px] ${i <= currentIdx ? "text-foreground" : "text-muted"}`}>
              {label}
            </span>
            {i < 2 && <span className={`mx-1.5 h-px w-6 ${i < currentIdx ? "bg-primary/50" : "bg-border"}`} />}
          </div>
        ))}
      </div>

      {/* Upload */}
      {step === "upload" && (
        <div className="space-y-4">
          <AIGuide />

          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`cursor-pointer rounded-lg border-2 border-dashed px-6 py-12 text-center transition-all ${
              dragActive
                ? "border-primary bg-primary-soft scale-[1.01]"
                : htmlFile
                  ? "border-primary/60 bg-surface"
                  : "border-border bg-surface hover:border-border-light"
            }`}
          >
            {htmlFile ? (
              <>
                <div className="mb-2 text-2xl">📄</div>
                <p className="text-[14px] font-medium text-foreground">{htmlFile.name}</p>
                <p className="mt-0.5 text-[12px] text-muted">
                  {(htmlFile.size / 1024).toFixed(1)} KB
                </p>
                <p className="mt-2 text-[11px] text-primary-light">Click or drop another file to replace</p>
              </>
            ) : dragActive ? (
              <>
                <div className="mb-2 text-2xl">✨</div>
                <p className="text-[14px] font-semibold text-primary-light">Drop it here</p>
              </>
            ) : (
              <>
                <div className="mb-2 text-2xl">⬆️</div>
                <p className="text-[14px] font-medium text-foreground">
                  Drag & drop your HTML file
                </p>
                <p className="mt-0.5 text-[12px] text-muted">or click to browse · max 2MB</p>
              </>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".html,.htm"
            onChange={handleFileInputChange}
            className="hidden"
          />
          {error && <p className="text-center text-[12px] text-red-400">{error}</p>}
          <button
            disabled={!htmlFile}
            onClick={() => setStep("metadata")}
            className="h-9 w-full rounded-lg bg-primary text-[13px] font-semibold text-white transition-colors hover:bg-primary-hover disabled:opacity-30"
          >
            Continue
          </button>
        </div>
      )}

      {/* Metadata */}
      {step === "metadata" && (
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-[13px] font-medium">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
              placeholder="My App"
              className="h-9 w-full rounded-lg border border-border bg-surface px-3 text-[13px] text-foreground placeholder:text-muted focus:border-border-light focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-[13px] font-medium">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={1000}
              rows={3}
              placeholder="What does it do?"
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-[13px] text-foreground placeholder:text-muted focus:border-border-light focus:outline-none resize-none"
            />
            <p className="mt-0.5 text-right text-[11px] text-muted">{description.length}/1000</p>
          </div>
          <div>
            <label className="mb-1.5 block text-[13px] font-medium">Tags</label>
            <div className="flex flex-wrap gap-1.5">
              {AVAILABLE_TAGS.map((tag) => (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={`rounded-md px-2.5 py-1 text-[12px] font-medium transition-all ${
                    selectedTags.includes(tag)
                      ? "bg-primary text-white"
                      : "bg-surface-2 text-muted hover:text-foreground"
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
          {error && <p className="text-[12px] text-red-400">{error}</p>}
          <div className="flex gap-2">
            <button
              onClick={() => setStep("upload")}
              className="h-9 flex-1 rounded-lg border border-border text-[13px] font-medium text-muted-light hover:text-foreground"
            >
              Back
            </button>
            <button
              disabled={!title || !description}
              onClick={() => setStep("preview")}
              className="h-9 flex-1 rounded-lg bg-primary text-[13px] font-semibold text-white hover:bg-primary-hover disabled:opacity-30"
            >
              Preview
            </button>
          </div>
        </div>
      )}

      {/* Preview */}
      {step === "preview" && (
        <div className="space-y-4">
          <div className="overflow-hidden rounded-lg border border-border">
            <div className="flex items-center gap-1.5 border-b border-border bg-surface-2 px-3 py-1.5">
              <span className="h-2 w-2 rounded-full bg-border-light" />
              <span className="h-2 w-2 rounded-full bg-border-light" />
              <span className="h-2 w-2 rounded-full bg-border-light" />
              <span className="ml-1 text-[11px] text-muted">{title}</span>
            </div>
            <iframe
              srcDoc={htmlContent}
              title="Preview"
              sandbox="allow-scripts"
              className="h-[350px] w-full bg-white"
            />
          </div>
          <div className="rounded-lg border border-border bg-surface p-3">
            <p className="text-[14px] font-medium">{title}</p>
            <p className="mt-0.5 text-[12px] text-muted">{description}</p>
            {selectedTags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {selectedTags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-md bg-surface-2 px-2 py-0.5 text-[11px] text-muted"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
          {error && <p className="text-[12px] text-red-400">{error}</p>}
          <div className="flex gap-2">
            <button
              onClick={() => setStep("metadata")}
              className="h-9 flex-1 rounded-lg border border-border text-[13px] font-medium text-muted-light hover:text-foreground"
            >
              Back
            </button>
            <button
              onClick={handleSubmit}
              className="h-9 flex-1 rounded-lg bg-primary text-[13px] font-semibold text-white hover:bg-primary-hover"
            >
              Submit for review
            </button>
          </div>
        </div>
      )}

      {/* Submitting */}
      {step === "submitting" && (
        <div className="py-16 text-center">
          <p className="text-[14px] font-medium">Creating pull request...</p>
          <p className="mt-1 text-[13px] text-muted">This takes a few seconds.</p>
        </div>
      )}

      {/* Done */}
      {step === "done" && (
        <div className="py-16 text-center">
          <p className="text-[15px] font-semibold">Submitted</p>
          <p className="mt-1 text-[13px] text-muted">
            Your app is pending review. It&apos;ll go live once approved.
          </p>
          {prUrl && (
            <a
              href={prUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-block text-[13px] text-primary-light hover:underline"
            >
              View pull request
            </a>
          )}
        </div>
      )}
    </div>
  );
}
