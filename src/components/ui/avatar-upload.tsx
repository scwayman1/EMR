"use client";

import { useRef, useState } from "react";
import { cn } from "@/lib/utils/cn";

interface AvatarUploadProps {
  initialSrc?: string | null;
  initials?: string;
  className?: string;
  /** Placeholder upload handler — wire up a real server action here later. */
  onUpload?: (dataUrl: string, file: File) => void | Promise<void>;
}

/**
 * AvatarUpload — circular avatar with camera icon overlay.
 *
 * Click to open file picker; reads the selected image via FileReader and
 * previews it client-side. Calls the optional onUpload placeholder for
 * future server-side persistence wiring.
 */
export function AvatarUpload({
  initialSrc = null,
  initials = "",
  className,
  onUpload,
}: AvatarUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(initialSrc);
  const [busy, setBusy] = useState(false);

  function openPicker() {
    inputRef.current?.click();
  }

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      alert("Please choose an image file.");
      return;
    }
    setBusy(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = typeof reader.result === "string" ? reader.result : null;
      if (dataUrl) {
        setPreview(dataUrl);
        try {
          await onUpload?.(dataUrl, file);
        } catch {
          // Placeholder — swallow errors until real upload wired up.
        }
      }
      setBusy(false);
    };
    reader.onerror = () => {
      setBusy(false);
      alert("Sorry, we couldn't read that file.");
    };
    reader.readAsDataURL(file);
    // Reset the value so picking the same file twice still fires onChange.
    e.target.value = "";
  }

  return (
    <div className={cn("flex flex-col items-center gap-3", className)}>
      <button
        type="button"
        onClick={openPicker}
        disabled={busy}
        aria-label="Upload profile photo"
        className={cn(
          "group relative h-28 w-28 rounded-full overflow-hidden",
          "border-2 border-border-strong bg-surface-muted",
          "transition-transform duration-200 ease-smooth",
          "hover:scale-[1.02] active:scale-[0.98]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2",
          busy && "opacity-60 cursor-wait"
        )}
      >
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preview}
            alt="Profile avatar preview"
            className="h-full w-full object-cover"
          />
        ) : initials ? (
          <span className="flex h-full w-full items-center justify-center font-display text-3xl text-text-muted">
            {initials}
          </span>
        ) : (
          <svg
            width="40"
            height="40"
            viewBox="0 0 24 24"
            fill="none"
            className="mx-auto my-auto h-full w-full p-6 text-text-subtle"
            aria-hidden="true"
          >
            <path
              d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"
              fill="currentColor"
              opacity="0.55"
            />
          </svg>
        )}
        {/* Camera overlay */}
        <span
          className={cn(
            "absolute bottom-1 right-1 flex h-9 w-9 items-center justify-center rounded-full",
            "bg-accent text-accent-ink shadow-lg border-2 border-surface",
            "transition-transform duration-200 ease-smooth",
            "group-hover:scale-110"
          )}
          aria-hidden="true"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
            <circle cx="12" cy="13" r="4" />
          </svg>
        </span>
      </button>
      <p className="text-[11px] text-text-subtle uppercase tracking-wide font-medium">
        {busy ? "Uploading…" : preview ? "Tap to change" : "Tap to upload photo"}
      </p>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleChange}
      />
    </div>
  );
}
