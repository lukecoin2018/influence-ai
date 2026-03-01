"use client";

// Place at: app/creator-dashboard/media-kit/page.tsx

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";

interface MediaKitInfo {
  url: string;
  name: string;
  size: number;
  uploadedAt: string;
}

export default function MediaKitPage() {
  const { user, creatorProfile, userRole } = useAuth();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [mediaKit, setMediaKit] = useState<MediaKitInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);

  // Auth guard
  useEffect(() => {
    if (!user) { router.push("/login"); return; }
    if (userRole && userRole !== "creator") router.push("/creator-dashboard");
  }, [user, userRole, router]);

  // Load existing media kit
  useEffect(() => {
    if (!user) return;
    loadMediaKit();
  }, [user]);

  async function loadMediaKit() {
    setLoading(true);
    try {
      const { data, error } = await supabase.storage
        .from("media-kits")
        .list(user!.id, { limit: 1, sortBy: { column: "created_at", order: "desc" } });

      if (error) throw error;

      if (data && data.length > 0) {
        const file = data[0];
        const { data: urlData } = supabase.storage
          .from("media-kits")
          .getPublicUrl(`${user!.id}/${file.name}`);

        setMediaKit({
          url: urlData.publicUrl,
          name: file.name,
          size: file.metadata?.size ?? 0,
          uploadedAt: file.created_at ?? "",
        });
      } else {
        setMediaKit(null);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpload(file: File) {
    if (!file) return;
    if (file.type !== "application/pdf") {
      setError("Only PDF files are supported.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("File size must be under 10MB.");
      return;
    }

    setError("");
    setUploading(true);

    try {
      // Delete existing if any
      if (mediaKit) {
        await supabase.storage
          .from("media-kits")
          .remove([`${user!.id}/${mediaKit.name}`]);
      }

      const fileName = `media-kit-${Date.now()}.pdf`;
      const { error: uploadError } = await supabase.storage
        .from("media-kits")
        .upload(`${user!.id}/${fileName}`, file, { contentType: "application/pdf" });

      if (uploadError) throw uploadError;

      await loadMediaKit();
    } catch (e: any) {
      setError(e.message || "Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete() {
    if (!mediaKit) return;
    setDeleting(true);
    try {
      await supabase.storage
        .from("media-kits")
        .remove([`${user!.id}/${mediaKit.name}`]);
      setMediaKit(null);
    } catch (e: any) {
      setError(e.message || "Delete failed.");
    } finally {
      setDeleting(false);
    }
  }

  function handleCopyLink() {
    if (!mediaKit) return;
    navigator.clipboard.writeText(mediaKit.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function formatSize(bytes: number) {
    if (bytes === 0) return "Unknown size";
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function formatDate(dateStr: string) {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "numeric", month: "short", year: "numeric",
    });
  }

  if (!user) return null;

  return (
    <div style={{ maxWidth: "640px" }}>
      {/* Header */}
      <div style={{ marginBottom: "28px" }}>
        <h1 style={{ fontSize: "24px", fontWeight: 700, color: "#3A3A3A", margin: "0 0 4px 0", letterSpacing: "-0.02em" }}>
          📎 Media Kit
        </h1>
        <p style={{ fontSize: "14px", color: "#6B7280", margin: 0 }}>
          Upload your media kit PDF so brands can download it from your public profile.
        </p>
      </div>

      {loading ? (
        <div style={{ backgroundColor: "#fff", borderRadius: "16px", padding: "40px", border: "1px solid #E5E7EB", textAlign: "center" }}>
          <p style={{ color: "#9CA3AF", fontSize: "14px" }}>Loading...</p>
        </div>
      ) : mediaKit ? (
        /* ── Existing media kit ── */
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {/* File card */}
          <div style={{
            backgroundColor: "#fff", borderRadius: "16px", padding: "24px",
            border: "1px solid #E5E7EB", boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              <div style={{
                width: "52px", height: "52px", borderRadius: "12px",
                backgroundColor: "#FFF0F0", display: "flex", alignItems: "center",
                justifyContent: "center", flexShrink: 0, fontSize: "24px",
              }}>
                📄
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: "15px", fontWeight: 600, color: "#3A3A3A", margin: "0 0 2px 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {mediaKit.name}
                </p>
                <p style={{ fontSize: "12px", color: "#9CA3AF", margin: 0 }}>
                  {formatSize(mediaKit.size)} · Uploaded {formatDate(mediaKit.uploadedAt)}
                </p>
              </div>
              <a
                href={mediaKit.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  padding: "7px 14px", borderRadius: "8px", backgroundColor: "#F9FAFB",
                  border: "1px solid #E5E7EB", fontSize: "13px", fontWeight: 600,
                  color: "#3A3A3A", textDecoration: "none", flexShrink: 0,
                }}
              >
                Preview ↗
              </a>
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
            <button
              onClick={handleCopyLink}
              style={{
                padding: "12px", borderRadius: "10px", border: "1px solid #E5E7EB",
                backgroundColor: copied ? "#ECFDF5" : "#fff", cursor: "pointer",
                fontSize: "13px", fontWeight: 600,
                color: copied ? "#065F46" : "#3A3A3A",
              }}
            >
              {copied ? "✅ Copied!" : "🔗 Copy Link"}
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              style={{
                padding: "12px", borderRadius: "10px", border: "1px solid #E5E7EB",
                backgroundColor: "#fff", cursor: "pointer",
                fontSize: "13px", fontWeight: 600, color: "#3A3A3A",
              }}
            >
              {uploading ? "Uploading..." : "🔄 Replace"}
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              style={{
                padding: "12px", borderRadius: "10px", border: "1px solid #FFE4E4",
                backgroundColor: "#FFF5F5", cursor: "pointer",
                fontSize: "13px", fontWeight: 600, color: "#DC2626",
              }}
            >
              {deleting ? "Deleting..." : "🗑️ Delete"}
            </button>
          </div>

          {/* Share link box */}
          <div style={{
            backgroundColor: "#F9FAFB", borderRadius: "12px", padding: "16px",
            border: "1px solid #E5E7EB",
          }}>
            <p style={{ fontSize: "11px", fontWeight: 600, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 8px 0" }}>
              Share link
            </p>
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <p style={{
                fontSize: "12px", color: "#6B7280", margin: 0, flex: 1,
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                backgroundColor: "#fff", padding: "8px 10px", borderRadius: "6px",
                border: "1px solid #E5E7EB",
              }}>
                {mediaKit.url}
              </p>
              <button
                onClick={handleCopyLink}
                style={{
                  padding: "8px 12px", borderRadius: "6px", backgroundColor: "#FFD700",
                  border: "none", cursor: "pointer", fontSize: "12px", fontWeight: 600,
                  color: "#3A3A3A", flexShrink: 0,
                }}
              >
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
          </div>

          {/* Visibility note */}
          <div style={{
            backgroundColor: "#FFFBEB", borderRadius: "12px", padding: "14px 16px",
            border: "1px solid #FDE68A", display: "flex", alignItems: "center", gap: "10px",
          }}>
            <span style={{ fontSize: "16px" }}>👁️</span>
            <p style={{ fontSize: "13px", color: "#92400E", margin: 0 }}>
              Your media kit is visible to brands on your public profile.
            </p>
          </div>
        </div>
      ) : (
        /* ── Upload area ── */
        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => {
            e.preventDefault();
            setDragOver(false);
            const file = e.dataTransfer.files[0];
            if (file) handleUpload(file);
          }}
          style={{
            backgroundColor: dragOver ? "#FFFBEB" : "#fff",
            borderRadius: "16px", padding: "48px 32px",
            border: `2px dashed ${dragOver ? "#FFD700" : "#E5E7EB"}`,
            textAlign: "center", transition: "all 0.15s",
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
          }}
        >
          <div style={{ fontSize: "40px", marginBottom: "16px" }}>📎</div>
          <p style={{ fontSize: "16px", fontWeight: 600, color: "#3A3A3A", margin: "0 0 8px 0" }}>
            Upload your media kit
          </p>
          <p style={{ fontSize: "13px", color: "#6B7280", margin: "0 0 24px 0" }}>
            Drag and drop a PDF here, or click to browse
          </p>
          <p style={{ fontSize: "11px", color: "#9CA3AF", margin: "0 0 24px 0" }}>
            PDF only · Max 10MB
          </p>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            style={{
              padding: "10px 24px", borderRadius: "10px",
              backgroundColor: uploading ? "#F9FAFB" : "#FFD700",
              border: "none", cursor: uploading ? "not-allowed" : "pointer",
              fontSize: "14px", fontWeight: 700, color: "#3A3A3A",
            }}
          >
            {uploading ? "Uploading..." : "Choose PDF"}
          </button>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div style={{
          marginTop: "12px", padding: "12px 16px", backgroundColor: "#FFF5F5",
          border: "1px solid #FFE4E4", borderRadius: "10px",
        }}>
          <p style={{ fontSize: "13px", color: "#DC2626", margin: 0 }}>⚠️ {error}</p>
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        style={{ display: "none" }}
        onChange={e => {
          const file = e.target.files?.[0];
          if (file) handleUpload(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}
