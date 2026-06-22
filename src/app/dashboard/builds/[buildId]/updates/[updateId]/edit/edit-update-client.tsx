"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LoadingButton } from "@/components/action-buttons";
import { IconArrowLeft } from "@tabler/icons-react";

export type EditableMilestoneOption = {
  id: string;
  title: string;
};

export function EditUpdateClient({
  buildId,
  update,
  milestones,
  returnTo,
}: {
  buildId: string;
  update: { id: string; content: string | null; milestone_id: string | null };
  milestones: EditableMilestoneOption[];
  returnTo: string;
}) {
  const router = useRouter();
  const [content, setContent] = useState(update.content ?? "");
  const [milestoneId, setMilestoneId] = useState(update.milestone_id ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const save = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch(`/api/build-updates/${update.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: content.trim() || null,
          milestone_id: milestoneId || null,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? "Save failed.");
        return;
      }
      setSaved(true);
      router.push(returnTo);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="dashboard-page">
      <div className="dashboard-container" style={{ maxWidth: 640 }}>
        <div className="dashboard-breadcrumb">
          <Link href={returnTo} className="btn-icon" aria-label="Back">
            <IconArrowLeft size={16} />
          </Link>
          <span>Edit update</span>
        </div>

        <section className="card">
          <div className="card-body stack">
            <div className="form-field">
              <label className="form-label">Caption</label>
              <textarea
                className="form-input"
                rows={5}
                placeholder="What's happening on your build?"
                value={content}
                onChange={(e) => setContent(e.target.value)}
              />
            </div>

            <div className="form-field">
              <label className="form-label">Milestone</label>
              <select
                className="form-input"
                value={milestoneId}
                onChange={(e) => setMilestoneId(e.target.value)}
              >
                <option value="">No milestone</option>
                {milestones.map((m) => (
                  <option key={m.id} value={m.id}>{m.title}</option>
                ))}
              </select>
            </div>

            <p style={{ fontSize: 13, color: "var(--bb-muted)", margin: 0 }}>
              To add or remove photos, visit the Images tab in your build editor.
            </p>

            {error && (
              <div className="alert alert-error">{error}</div>
            )}

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <Link href={returnTo} className="btn btn-secondary btn-sm">
                Cancel
              </Link>
              <LoadingButton
                className="btn btn-primary btn-sm"
                loading={saving}
                disabled={saving}
                onClick={save}
              >
                {saved ? "Saved" : "Save changes"}
              </LoadingButton>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
