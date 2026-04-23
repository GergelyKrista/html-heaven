"use client";

import { useState, useRef, useMemo } from "react";
import { AIGuide } from "./AIGuide";
import { CATEGORIES, SUGGESTED_TAGS, TAG_RULES, normalizeTag, type CategoryId } from "@/lib/categories";

type HostingType = "bundled" | "external";
type Step = "type" | "source" | "metadata" | "preview" | "submitting" | "done";

export function SubmitForm() {
  const [step, setStep] = useState<Step>("type");
  const [hostingType, setHostingType] = useState<HostingType | null>(null);
  const [htmlFile, setHtmlFile] = useState<File | null>(null);
  const [htmlContent, setHtmlContent] = useState("");
  const [externalUrl, setExternalUrl] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<CategoryId | "">("");
  const [tags, setTags] = useState<string[]>([]);
  const [customTagInput, setCustomTagInput] = useState("");
  const [error, setError] = useState("");
  const [prUrl, setPrUrl] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const suggestedTags = useMemo(() => {
    if (!category) return [];
    return SUGGESTED_TAGS[category] || [];
  }, [category]);

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
    handleFile(e.dataTransfer.files?.[0]);
  }

  function toggleTag(tag: string) {
    setError("");
    setTags((prev) => {
      if (prev.includes(tag)) return prev.filter((t) => t !== tag);
      if (prev.length >= TAG_RULES.maxCount) {
        setError(`Max ${TAG_RULES.maxCount} tags.`);
        return prev;
      }
      return [...prev, tag];
    });
  }

  function addCustomTag() {
    const normalized = normalizeTag(customTagInput);
    if (!normalized) {
      setError(`Tag must be ${TAG_RULES.minLength}-${TAG_RULES.maxLength} chars, lowercase letters/numbers/hyphens only.`);
      return;
    }
    if (tags.includes(normalized)) {
      setError("Tag already added.");
      return;
    }
    if (tags.length >= TAG_RULES.maxCount) {
      setError(`Max ${TAG_RULES.maxCount} tags.`);
      return;
    }
    setTags([...tags, normalized]);
    setCustomTagInput("");
    setError("");
  }

  function handleCustomTagKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addCustomTag();
    } else if (e.key === "Backspace" && !customTagInput && tags.length > 0) {
      setTags(tags.slice(0, -1));
    }
  }

  // Returns the trimmed + normalized URL, or an error message.
  function validateExternalUrl(raw: string): { url?: string; error?: string } {
    const trimmed = raw.trim();
    if (!trimmed) return { error: "Enter the URL where your app is hosted." };
    if (!/^https:\/\//i.test(trimmed)) {
      return { error: "URL must start with https://" };
    }
    try {
      const parsed = new URL(trimmed);
      if (/(^|\.)htmlheaven\.com$/i.test(parsed.hostname)) {
        return { error: "Use the bundled path for htmlheaven.com — external is for your own domain." };
      }
      return { url: parsed.toString() };
    } catch {
      return { error: "That doesn't look like a valid URL." };
    }
  }

  async function handleSubmit() {
    if (!hostingType) return;
    if (!category) {
      setError("Pick a category.");
      return;
    }
    if (hostingType === "bundled" && !htmlFile) {
      setError("Upload an HTML file.");
      return;
    }
    if (hostingType === "external") {
      const r = validateExternalUrl(externalUrl);
      if (r.error) {
        setError(r.error);
        return;
      }
    }

    setStep("submitting");
    setError("");

    const finalTags = [category, ...tags.filter((t) => t !== category)];

    const formData = new FormData();
    formData.append("hostingType", hostingType);
    formData.append("title", title);
    formData.append("description", description);
    formData.append("category", category);
    formData.append("tags", JSON.stringify(finalTags));
    if (hostingType === "bundled" && htmlFile) {
      formData.append("html", htmlFile);
    }
    if (hostingType === "external") {
      formData.append("externalUrl", externalUrl.trim());
    }

    try {
      const res = await fetch("/api/submit", { method: "POST", body: formData });
      const data = (await res.json()) as { error?: string; prUrl?: string };
      if (!res.ok) throw new Error(data.error || "Failed");
      setPrUrl(data.prUrl || "");
      setStep("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setStep("preview");
    }
  }

  // Step indicator: folding Type + Source into the first pill keeps the
  // count at 3 for both paths.
  const currentIdx = (() => {
    if (step === "type" || step === "source") return 0;
    if (step === "metadata") return 1;
    return 2;
  })();

  return (
    <div className="mx-auto max-w-xl">
      <div className="mb-6 flex items-center gap-1">
        {["Source", "Details", "Review"].map((label, i) => (
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

      {/* Type picker */}
      {step === "type" && (
        <div className="space-y-4">
          <p className="text-[13px] text-muted-light">
            Two ways to add an app. Pick whichever fits.
          </p>

          <button
            onClick={() => {
              setHostingType("bundled");
              setStep("source");
            }}
            className="group flex w-full items-start gap-3 rounded-lg border border-border bg-surface p-4 text-left transition-all hover:border-border-light hover:bg-surface-2"
          >
            <div className="mt-0.5 text-xl">📄</div>
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-semibold text-foreground">Host it here</p>
              <p className="mt-0.5 text-[12px] text-muted-light">
                Upload a single <code>.html</code> file. Lives under{" "}
                <code>htmlheaven.com/apps/&lt;your-slug&gt;</code>. Sandboxed iframe,
                auto-scanned for secrets and trackers before merge.
              </p>
            </div>
            <span className="mt-1 text-[14px] text-muted opacity-0 transition-opacity group-hover:opacity-100">→</span>
          </button>

          <button
            onClick={() => {
              setHostingType("external");
              setStep("source");
            }}
            className="group flex w-full items-start gap-3 rounded-lg border border-border bg-surface p-4 text-left transition-all hover:border-border-light hover:bg-surface-2"
          >
            <div className="mt-0.5 text-xl">🔗</div>
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-semibold text-foreground">I&apos;m already hosting it</p>
              <p className="mt-0.5 text-[12px] text-muted-light">
                Link an app on your own domain. We list it in the catalog; clicking
                Launch opens your site in a new tab. Must be{" "}
                <code>https</code> and publicly viewable (no login wall).
              </p>
            </div>
            <span className="mt-1 text-[14px] text-muted opacity-0 transition-opacity group-hover:opacity-100">→</span>
          </button>
        </div>
      )}

      {/* Source — file drop (bundled) or URL input (external) */}
      {step === "source" && hostingType === "bundled" && (
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
                <p className="mt-0.5 text-[12px] text-muted">{(htmlFile.size / 1024).toFixed(1)} KB</p>
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
                <p className="text-[14px] font-medium text-foreground">Drag & drop your HTML file</p>
                <p className="mt-0.5 text-[12px] text-muted">or click to browse · max 2MB</p>
              </>
            )}
          </div>
          <input ref={fileInputRef} type="file" accept=".html,.htm" onChange={handleFileInputChange} className="hidden" />
          {error && <p className="text-center text-[12px] text-red-400">{error}</p>}
          <div className="flex gap-2">
            <button
              onClick={() => setStep("type")}
              className="h-9 flex-1 rounded-lg border border-border text-[13px] font-medium text-muted-light hover:text-foreground"
            >
              Back
            </button>
            <button
              disabled={!htmlFile}
              onClick={() => setStep("metadata")}
              className="h-9 flex-1 rounded-lg bg-primary text-[13px] font-semibold text-white transition-colors hover:bg-primary-hover disabled:opacity-30"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {step === "source" && hostingType === "external" && (
        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-surface-2 p-3 text-[12px] text-muted-light">
            Paste the public URL of the app you&apos;re hosting elsewhere. It should
            load without a login wall, be served over <code>https</code>, and keep
            working — broken links get removed.
          </div>
          <div>
            <label className="mb-1 block text-[13px] font-medium">URL</label>
            <input
              type="url"
              value={externalUrl}
              onChange={(e) => setExternalUrl(e.target.value)}
              placeholder="https://example.com/my-app"
              maxLength={500}
              className="h-9 w-full rounded-lg border border-border bg-surface px-3 text-[13px] text-foreground placeholder:text-muted focus:border-border-light focus:outline-none"
            />
          </div>
          {error && <p className="text-[12px] text-red-400">{error}</p>}
          <div className="flex gap-2">
            <button
              onClick={() => setStep("type")}
              className="h-9 flex-1 rounded-lg border border-border text-[13px] font-medium text-muted-light hover:text-foreground"
            >
              Back
            </button>
            <button
              disabled={!externalUrl.trim()}
              onClick={() => {
                const r = validateExternalUrl(externalUrl);
                if (r.error) {
                  setError(r.error);
                  return;
                }
                setError("");
                setStep("metadata");
              }}
              className="h-9 flex-1 rounded-lg bg-primary text-[13px] font-semibold text-white transition-colors hover:bg-primary-hover disabled:opacity-30"
            >
              Continue
            </button>
          </div>
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
            <label className="mb-1.5 block text-[13px] font-medium">
              Category <span className="text-red-400">*</span>
              <span className="ml-1.5 font-normal text-muted">Pick the best fit</span>
            </label>
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
              {CATEGORIES.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setCategory(c.id)}
                  title={c.description}
                  className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 text-left text-[12px] transition-all ${
                    category === c.id
                      ? "border-primary bg-primary-soft text-foreground"
                      : "border-border bg-surface text-muted hover:border-border-light hover:text-foreground"
                  }`}
                >
                  <span className="text-base leading-none">{c.icon}</span>
                  <span className="font-medium">{c.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-[13px] font-medium">
              Tags <span className="font-normal text-muted">Optional · up to {TAG_RULES.maxCount}</span>
            </label>

            {tags.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-1.5">
                {tags.map((tag) => (
                  <span key={tag} className="inline-flex items-center gap-1 rounded-md bg-primary-soft px-2 py-1 text-[11px] font-medium text-primary-light">
                    {tag}
                    <button onClick={() => toggleTag(tag)} className="ml-0.5 text-muted hover:text-foreground" aria-label={`Remove ${tag}`}>
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}

            <div className="mb-2 flex gap-1.5">
              <input
                type="text"
                value={customTagInput}
                onChange={(e) => setCustomTagInput(e.target.value)}
                onKeyDown={handleCustomTagKey}
                placeholder="Add a custom tag (e.g. 'retro-arcade')"
                maxLength={TAG_RULES.maxLength + 5}
                className="h-8 flex-1 rounded-md border border-border bg-surface px-2.5 text-[12px] text-foreground placeholder:text-muted focus:border-border-light focus:outline-none"
              />
              <button
                onClick={addCustomTag}
                disabled={!customTagInput.trim()}
                className="h-8 rounded-md border border-border px-3 text-[12px] font-medium text-muted-light transition-colors hover:text-foreground disabled:opacity-30"
              >
                Add
              </button>
            </div>

            {suggestedTags.length > 0 && (
              <div>
                <p className="mb-1 text-[11px] text-muted">Suggestions</p>
                <div className="flex flex-wrap gap-1.5">
                  {suggestedTags.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => toggleTag(tag)}
                      disabled={tags.includes(tag)}
                      className={`rounded-md px-2 py-0.5 text-[11px] font-medium transition-all ${
                        tags.includes(tag)
                          ? "bg-surface-3 text-muted opacity-40"
                          : "bg-surface-2 text-muted hover:text-foreground"
                      }`}
                    >
                      + {tag}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {error && <p className="text-[12px] text-red-400">{error}</p>}
          <div className="flex gap-2">
            <button
              onClick={() => setStep("source")}
              className="h-9 flex-1 rounded-lg border border-border text-[13px] font-medium text-muted-light hover:text-foreground"
            >
              Back
            </button>
            <button
              disabled={!title || !description || !category}
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
          {hostingType === "bundled" ? (
            <div className="overflow-hidden rounded-lg border border-border">
              <div className="flex items-center gap-1.5 border-b border-border bg-surface-2 px-3 py-1.5">
                <span className="h-2 w-2 rounded-full bg-border-light" />
                <span className="h-2 w-2 rounded-full bg-border-light" />
                <span className="h-2 w-2 rounded-full bg-border-light" />
                <span className="ml-1 text-[11px] text-muted">{title}</span>
              </div>
              <iframe srcDoc={htmlContent} title="Preview" sandbox="allow-scripts" className="h-[350px] w-full bg-white" />
            </div>
          ) : (
            <div className="rounded-lg border border-border bg-surface p-4">
              <div className="mb-1 text-[11px] font-medium uppercase tracking-wider text-muted">
                External link
              </div>
              <a
                href={externalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="break-all text-[13px] text-primary-light hover:underline"
              >
                {externalUrl} ↗
              </a>
              <p className="mt-2 text-[11px] text-muted">
                Opens in a new tab when someone hits Launch from the catalog.
              </p>
            </div>
          )}
          <div className="rounded-lg border border-border bg-surface p-3">
            <div className="flex items-center gap-2">
              <p className="text-[14px] font-medium">{title}</p>
              {hostingType === "external" && (
                <span className="rounded-md bg-surface-2 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted">
                  external ↗
                </span>
              )}
            </div>
            <p className="mt-0.5 text-[12px] text-muted">{description}</p>
            <div className="mt-2 flex flex-wrap items-center gap-1">
              {category && (
                <span className="rounded-md bg-primary-soft px-2 py-0.5 text-[11px] font-semibold text-primary-light">
                  {CATEGORIES.find((c) => c.id === category)?.icon} {CATEGORIES.find((c) => c.id === category)?.label}
                </span>
              )}
              {tags.map((tag) => (
                <span key={tag} className="rounded-md bg-surface-2 px-2 py-0.5 text-[11px] text-muted">
                  {tag}
                </span>
              ))}
            </div>
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

      {step === "submitting" && (
        <div className="py-16 text-center">
          <p className="text-[14px] font-medium">Creating pull request...</p>
          <p className="mt-1 text-[13px] text-muted">This takes a few seconds.</p>
        </div>
      )}

      {step === "done" && (
        <div className="py-16 text-center">
          <p className="text-[15px] font-semibold">Submitted</p>
          <p className="mt-1 text-[13px] text-muted">
            Your app is pending review. It&apos;ll go live once approved.
          </p>
          {prUrl && (
            <a href={prUrl} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block text-[13px] text-primary-light hover:underline">
              View pull request
            </a>
          )}
        </div>
      )}
    </div>
  );
}
