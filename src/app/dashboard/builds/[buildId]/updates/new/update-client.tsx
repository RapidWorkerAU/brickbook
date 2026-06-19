"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Nav from "@/components/Nav";
import { LoadingButton } from "@/components/action-buttons";
import { IconArrowLeft, IconCheck, IconEdit, IconEye, IconPhoto, IconPlus, IconX } from "@tabler/icons-react";
import type { UpdateBuildContext, UpdateMilestone, UpdateRoom } from "@/app/dashboard/builds/[buildId]/updates/new/page";

type ImagePreview = {
  id: string;
  url: string;
  file: File;
};

type NavUser = { username: string; display_name?: string; avatar_path?: string };

function LocalImageCarousel({ images }: { images: ImagePreview[] }) {
  const [index, setIndex] = useState(0);
  const current = images[index] ?? null;

  const move = (direction: -1 | 1) => {
    setIndex((currentIndex) => (currentIndex + direction + images.length) % images.length);
  };

  if (!current) return null;

  return (
    <div className="square-carousel">
      {/* Object URLs from local file previews should stay as native images. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={current.url} alt="" />
      {images.length > 1 ? (
        <>
          <button className="carousel-control carousel-control-prev" type="button" aria-label="Previous image" onClick={() => move(-1)}>
            {"<"}
          </button>
          <button className="carousel-control carousel-control-next" type="button" aria-label="Next image" onClick={() => move(1)}>
            {">"}
          </button>
          <span className="image-count">{index + 1} / {images.length}</span>
        </>
      ) : null}
    </div>
  );
}

export function NewUpdateClient({ build, milestones, rooms, returnTo, user }: { build: UpdateBuildContext; milestones: UpdateMilestone[]; rooms: UpdateRoom[]; returnTo: string; user: NavUser }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [milestoneList, setMilestoneList] = useState(milestones);
  const [milestoneId, setMilestoneId] = useState(milestones.find((item) => item.status === "active")?.id ?? milestones[0]?.id ?? "");
  const [roomId, setRoomId] = useState("");
  const [editingMilestoneId, setEditingMilestoneId] = useState<string | null>(null);
  const [milestoneDraft, setMilestoneDraft] = useState("");
  const [milestoneStatus, setMilestoneStatus] = useState("pending");
  const [savingMilestone, setSavingMilestone] = useState(false);
  const [content, setContent] = useState("");
  const [images, setImages] = useState<ImagePreview[]>([]);
  const [preview, setPreview] = useState(false);
  const [error, setError] = useState("");
  const [posting, setPosting] = useState(false);

  const selectedMilestone = milestoneList.find((item) => item.id === milestoneId);

  const startMilestoneCreate = () => {
    setEditingMilestoneId("");
    setMilestoneDraft("");
    setMilestoneStatus(milestoneList.length === 0 ? "active" : "pending");
  };

  const startMilestoneEdit = (milestone: UpdateMilestone) => {
    setEditingMilestoneId(milestone.id);
    setMilestoneDraft(milestone.title);
    setMilestoneStatus(milestone.status || "pending");
  };

  const cancelMilestoneEdit = () => {
    setEditingMilestoneId(null);
    setMilestoneDraft("");
    setMilestoneStatus("pending");
  };

  const saveMilestone = async () => {
    const title = milestoneDraft.trim();
    if (!title || savingMilestone) return;

    const existing = editingMilestoneId ? milestoneList.find((item) => item.id === editingMilestoneId) : null;
    setSavingMilestone(true);
    setError("");

    const response = await fetch(existing ? `/api/milestones/${existing.id}` : "/api/milestones", {
      method: existing ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        build_id: build.id,
        title,
        status: milestoneStatus,
        visibility: existing?.visibility || "public",
        sort_order: existing?.sort_order ?? milestoneList.length,
        start_date: existing?.start_date || null,
        end_date: existing?.end_date || null,
      }),
    });
    const payload = await response.json().catch(() => null);
    setSavingMilestone(false);

    if (!response.ok) {
      setError(payload?.error ?? "Unable to save milestone.");
      return;
    }

    const saved = payload.milestone as UpdateMilestone;
    if (existing) {
      setMilestoneList((current) => current.map((item) => (item.id === saved.id ? saved : item)));
    } else {
      setMilestoneList((current) => [...current, saved]);
      setMilestoneId(saved.id);
    }
    cancelMilestoneEdit();
  };

  const handleImages = (files: FileList | null) => {
    if (!files) return;
    const nextImages = Array.from(files)
      .slice(0, 10 - images.length)
      .map((file) => ({
        id: `img-${Date.now()}-${file.name}`,
        url: URL.createObjectURL(file),
        file,
      }));
    setImages((current) => [...current, ...nextImages]);
  };

  const submit = async () => {
    if (!content.trim()) {
      setError("Add a caption before posting.");
      return;
    }
    setPosting(true);
    setError("");

    const formData = new FormData();
    formData.set("build_id", build.id);
    formData.set("milestone_id", milestoneId);
    formData.set("room_id", roomId);
    formData.set("content", content.trim());
    for (const image of images) {
      formData.append("images", image.file);
    }

    const response = await fetch("/api/build-updates", {
      method: "POST",
      body: formData,
    });
    const payload = await response.json().catch(() => null);
    setPosting(false);

    if (!response.ok) {
      setError(payload?.error ?? "Unable to post update.");
      return;
    }

    router.push(returnTo);
    router.refresh();
  };

  return (
    <div className="dashboard-page">
      <Nav user={user} />

      <main className="dashboard-container">
        <Link href={returnTo} className="back-link">
          <IconArrowLeft size={13} /> Back
        </Link>

        <div className="dashboard-header">
          <div>
            <h1 className="dashboard-title">Post an update</h1>
            <p className="dashboard-subtitle">Share progress for {build.title}</p>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={() => setPreview((value) => !value)}>
            <IconEye size={13} /> {preview ? "Edit" : "Preview"}
          </button>
        </div>

        {error ? <div className="alert alert-error mb-4">{error}</div> : null}

        {preview ? (
          <article className="card">
            <div className="update-card-header">
              <div className="bb-nav-user">
                <span className="avatar avatar-sm avatar-amber">{(user.display_name || user.username).charAt(0).toUpperCase()}</span>
                <span>{build.title}</span>
              </div>
              {selectedMilestone ? <span className="badge badge-phase">{selectedMilestone.title}</span> : null}
            </div>
            {images.length > 0 ? (
              <LocalImageCarousel images={images} />
            ) : null}
            <div className="card-body">
              <p>{content || "No caption added yet"}</p>
            </div>
          </article>
        ) : (
          <div className="stack">
            <section className="card">
              <div className="card-body">
                <div className="section-label">Milestone</div>
                <div className="filter-options">
                  <button className={`badge filter-chip ${!milestoneId ? "badge-active" : "badge-phase"}`} onClick={() => setMilestoneId("")}>
                    No milestone
                  </button>
                  {milestoneList.map((milestone) => (
                    <button
                      key={milestone.id}
                      className={`badge filter-chip ${milestoneId === milestone.id ? "badge-active" : "badge-phase"}`}
                      onClick={() => setMilestoneId(milestone.id)}
                    >
                      {milestoneId === milestone.id ? <IconCheck size={10} /> : null}
                      {milestone.title}
                    </button>
                  ))}
                </div>
                <div className="milestone-composer">
                  {editingMilestoneId === null ? (
                    <div className="milestone-composer-actions">
                      <button className="btn btn-secondary btn-sm" type="button" onClick={startMilestoneCreate}>
                        <IconPlus size={13} /> Add milestone
                      </button>
                      {selectedMilestone ? (
                        <button className="btn btn-ghost btn-sm" type="button" onClick={() => startMilestoneEdit(selectedMilestone)}>
                          <IconEdit size={13} /> Edit selected
                        </button>
                      ) : null}
                    </div>
                  ) : (
                    <div className="milestone-inline-form">
                      <input
                        className="form-input"
                        value={milestoneDraft}
                        placeholder="Milestone name"
                        onChange={(event) => setMilestoneDraft(event.target.value)}
                      />
                      <select className="form-select select-compact" value={milestoneStatus} onChange={(event) => setMilestoneStatus(event.target.value)}>
                        <option value="pending">Pending</option>
                        <option value="active">Active</option>
                        <option value="complete">Complete</option>
                      </select>
                      <LoadingButton className="btn btn-primary btn-sm" loading={savingMilestone} disabled={!milestoneDraft.trim()} onClick={saveMilestone}>
                        {editingMilestoneId ? "Save" : "Add"}
                      </LoadingButton>
                      <button className="btn btn-ghost btn-sm" type="button" onClick={cancelMilestoneEdit}>
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </section>

            <section className="card">
              <div className="card-body">
                <div className="section-label">Room</div>
                <select className="form-select select-compact" value={roomId} onChange={(event) => setRoomId(event.target.value)}>
                  <option value="">No room</option>
                  {rooms.map((room) => (
                    <option key={room.id} value={room.id}>{room.name}</option>
                  ))}
                </select>
              </div>
            </section>

            <section className="card">
              <div className="card-body">
                <div className="section-label">Photos</div>
                {images.length > 0 ? (
                  <div className="preview-grid">
                    {images.map((image, index) => (
                      <div className="preview-image" key={image.id}>
                        {/* Object URLs from local file previews should stay as native images. */}
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={image.url} alt="" />
                        <button className="preview-remove" onClick={() => setImages((current) => current.filter((item) => item.id !== image.id))} aria-label="Remove image">
                          <IconX size={11} />
                        </button>
                        <div className="build-card-meta">{index === 0 ? "Cover photo" : `Photo ${index + 1}`}</div>
                      </div>
                    ))}
                  </div>
                ) : null}

                <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(event) => handleImages(event.target.files)} />
                <button className="image-upload-zone" onClick={() => fileRef.current?.click()}>
                  <IconPhoto size={24} />
                  <span>{images.length === 0 ? "Add photos" : "Add more photos"}</span>
                  <span className="form-hint">Up to 10 photos per update</span>
                </button>
              </div>
            </section>

            <section className="card">
              <div className="card-body">
                <div className="section-label">Caption</div>
                <textarea
                  className="form-textarea"
                  placeholder="What happened on site today?"
                  value={content}
                  onChange={(event) => setContent(event.target.value)}
                  maxLength={1000}
                />
                <div className="muted-row justify-end">{content.length} / 1000</div>
              </div>
            </section>
          </div>
        )}
      </main>

      <div className="floating-action-bar">
        <span className="muted-row floating-action-status">
          {images.length > 0 ? `${images.length} photo${images.length !== 1 ? "s" : ""} - ` : ""}
          {selectedMilestone ? `Tagged to ${selectedMilestone.title}` : "No milestone tagged"}
          {roomId ? ` / ${rooms.find((room) => room.id === roomId)?.name ?? "Room"}` : ""}
        </span>
        <Link href={returnTo} className="btn btn-ghost btn-sm">
          Discard
        </Link>
        <LoadingButton className="btn btn-primary" loading={posting} disabled={!content.trim()} onClick={submit}>
          <IconPlus size={14} /> Post update
        </LoadingButton>
      </div>
    </div>
  );
}
