"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Nav from "@/components/Nav";
import { LoadingButton } from "@/components/action-buttons";
import { SearchableSelect } from "@/components/SearchableSelect";
import { IconArrowLeft, IconCheck, IconPhoto, IconX } from "@tabler/icons-react";
import { createBuild } from "@/app/dashboard/builds/actions";

type DashboardUser = {
  username: string;
  display_name?: string;
  avatar_path?: string;
};

const STEPS = [
  { id: "basics", label: "Basics", desc: "Name and location" },
  { id: "builder", label: "Builder", desc: "Who is building it" },
  { id: "visibility", label: "Visibility", desc: "Privacy settings" },
];

const BUILD_TYPES = ["New build", "Knockdown rebuild", "Renovation", "Extension", "Owner builder"];

const INITIAL = {
  title: "",
  buildType: "",
  suburbName: "",
  estateName: "",
  builderName: "",
  isListed: false,
  standardVisibility: "public",
  timelineVisibility: "public",
};

type FormState = typeof INITIAL;

export function NewBuildClient({ user, builderOptions }: { user: DashboardUser; builderOptions: string[] }) {
  const router = useRouter();
  const [serverState, formAction, pending] = useActionState(createBuild, {});
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(INITIAL);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [coverFileName, setCoverFileName] = useState("");
  const coverInputRef = useRef<HTMLInputElement | null>(null);

  const set = (key: keyof FormState, value: string | boolean) => setForm((current) => ({ ...current, [key]: value }));

  useEffect(() => {
    return () => {
      if (coverPreview) URL.revokeObjectURL(coverPreview);
    };
  }, [coverPreview]);

  const chooseCover = () => coverInputRef.current?.click();

  const onCoverChange = (fileList: FileList | null) => {
    const file = fileList?.[0] ?? null;
    if (coverPreview) URL.revokeObjectURL(coverPreview);
    if (!file) {
      setCoverPreview(null);
      setCoverFileName("");
      return;
    }

    setCoverPreview(URL.createObjectURL(file));
    setCoverFileName(file.name);
  };

  const removeCover = () => {
    if (coverPreview) URL.revokeObjectURL(coverPreview);
    setCoverPreview(null);
    setCoverFileName("");
    if (coverInputRef.current) coverInputRef.current.value = "";
  };

  const validate = () => {
    const nextErrors: Partial<Record<keyof FormState, string>> = {};
    if (step === 0) {
      if (!form.title.trim()) nextErrors.title = "Build title is required.";
      if (!form.suburbName.trim()) nextErrors.suburbName = "Suburb is required.";
      if (!form.buildType) nextErrors.buildType = "Build type is required.";
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const next = () => {
    if (!validate()) return;
    setStep((current) => current + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const back = () => {
    if (step === 0) router.push("/dashboard/builds");
    else setStep((current) => current - 1);
  };

  return (
    <div className="dashboard-page">
      <Nav user={user} />

      <main className="dashboard-container">
        <button className="back-link" onClick={back}>
          <IconArrowLeft size={13} />
          {step === 0 ? "Back to my builds" : `Back to ${STEPS[step - 1].label}`}
        </button>

        <div className="dashboard-header">
          <div>
            <h1 className="dashboard-title">Create a build</h1>
            <p className="dashboard-subtitle">{STEPS[step].desc}</p>
          </div>
        </div>

        <StepIndicator current={step} />

        {serverState.error ? <div className="alert alert-error mb-4">{serverState.error}</div> : null}

        <form action={formAction}>
          <input type="hidden" name="title" value={form.title} />
          <input type="hidden" name="buildType" value={form.buildType} />
          <input type="hidden" name="suburbName" value={form.suburbName} />
          <input type="hidden" name="estateName" value={form.estateName} />
          <input type="hidden" name="builderName" value={form.builderName} />
          <input type="hidden" name="isListed" value={String(form.isListed)} />
          <input type="hidden" name="standardVisibility" value={form.standardVisibility} />
          <input type="hidden" name="timelineVisibility" value={form.timelineVisibility} />
          <input
            ref={coverInputRef}
            className="hidden-file-input"
            type="file"
            name="coverImage"
            accept="image/*"
            onChange={(event) => onCoverChange(event.target.files)}
          />

          {step === 0 ? (
            <div className="stack">
              <div className="form-group">
                <label className="form-label">Cover image</label>
                <div className="new-build-cover-picker">
                  <div className="new-build-cover-preview" aria-hidden={!coverPreview}>
                    {coverPreview ? (
                      // Local preview URL for the image selected before the build is created.
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={coverPreview} alt="" />
                    ) : (
                      <span className="new-build-cover-empty">
                        <IconPhoto size={22} />
                        <span>Add a cover photo</span>
                      </span>
                    )}
                  </div>
                  <div className="new-build-cover-actions">
                    <div>
                      <p className="new-build-cover-title">{coverPreview ? "Cover selected" : "Set the main build photo"}</p>
                      <p className="form-hint">{coverFileName || "This appears on your profile, dashboard, and build cards."}</p>
                    </div>
                    <div className="new-build-cover-buttons">
                      <button type="button" className="btn btn-secondary btn-sm" onClick={chooseCover}>
                        {coverPreview ? "Replace" : "Upload"}
                      </button>
                      {coverPreview ? (
                        <button type="button" className="btn-icon btn-icon-compact" aria-label="Remove cover image" onClick={removeCover}>
                          <IconX size={13} />
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Build name *</label>
                <input
                  className={`form-input ${errors.title ? "form-input-error" : ""}`}
                  type="text"
                  placeholder="e.g. Our Hills Pavilion"
                  value={form.title}
                  onChange={(event) => set("title", event.target.value)}
                  maxLength={80}
                />
                {errors.title ? <p className="form-error">{errors.title}</p> : <p className="form-hint">Give your build a memorable name.</p>}
              </div>

              <SelectInput label="Build type" value={form.buildType} onChange={(value) => set("buildType", value)} options={BUILD_TYPES} required />
              {errors.buildType ? <p className="form-error">{errors.buildType}</p> : null}

              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label">Suburb *</label>
                  <input
                    className={`form-input ${errors.suburbName ? "form-input-error" : ""}`}
                    type="text"
                    placeholder="e.g. Ellenbrook"
                    value={form.suburbName}
                    onChange={(event) => set("suburbName", event.target.value)}
                  />
                  {errors.suburbName ? <p className="form-error">{errors.suburbName}</p> : null}
                </div>
                <div className="form-group">
                  <label className="form-label">Estate</label>
                  <input className="form-input" type="text" placeholder="Optional" value={form.estateName} onChange={(event) => set("estateName", event.target.value)} />
                </div>
              </div>
            </div>
          ) : null}

          {step === 1 ? (
            <div className="stack">
              <div className="form-group">
                <SearchableSelect label="Builder name" value={form.builderName} onChange={(value) => set("builderName", value)} options={builderOptions} placeholder="Search or add builder..." />
                <p className="form-hint">Choose an existing builder where possible. New names are normalised into the builder directory.</p>
              </div>
            </div>
          ) : null}

          {step === 2 ? (
            <div className="stack">
              <div className="form-group">
                <label className="form-label">List build publicly?</label>
                <div className="choice-grid">
                  {[true, false].map((value) => (
                    <button
                      key={String(value)}
                      type="button"
                      className={`choice-card choice-card-left ${form.isListed === value ? "choice-card-active" : ""}`}
                      onClick={() => set("isListed", value)}
                    >
                      <div className="choice-title">{value ? "Yes, list publicly" : "No, keep private"}</div>
                      <div className="choice-desc">{value ? "Appears in Discover and your public profile" : "Only visible to you"}</div>
                    </button>
                  ))}
                </div>
              </div>

              {form.isListed ? (
                <>
                  <VisibilityPicker label="Build information visibility" value={form.standardVisibility} onChange={(value) => set("standardVisibility", value)} />
                  <VisibilityPicker label="Timeline visibility" value={form.timelineVisibility} onChange={(value) => set("timelineVisibility", value)} />
                </>
              ) : null}
            </div>
          ) : null}

          <div className="dashboard-actions mt-8">
            {step > 0 ? (
              <button type="button" className="btn btn-secondary" onClick={back}>
                Back
              </button>
            ) : null}
            {step < STEPS.length - 1 ? (
              <button type="button" className="btn btn-primary" onClick={next}>
                Continue to {STEPS[step + 1].label}
              </button>
            ) : (
              <LoadingButton className="btn btn-primary" loading={pending}>
                Create build
              </LoadingButton>
            )}
          </div>
        </form>
      </main>
    </div>
  );
}

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="step-indicator">
      {STEPS.map((step, index) => (
        <div className="step-item" key={step.id}>
          <div className="step-node">
            <div className={`step-circle ${index < current ? "step-circle-done" : index === current ? "step-circle-active" : ""}`}>
              {index < current ? <IconCheck size={13} /> : index + 1}
            </div>
            <span className={`step-label ${index === current ? "step-label-active" : ""}`}>{step.label}</span>
          </div>
          {index < STEPS.length - 1 ? <div className={`step-line ${index < current ? "step-line-done" : ""}`} /> : null}
        </div>
      ))}
    </div>
  );
}

function SelectInput({ label, value, onChange, options, required }: { label: string; value: string; onChange: (value: string) => void; options: string[]; required?: boolean }) {
  return (
    <div className="form-group">
      <label className="form-label">
        {label}
        {required ? " *" : ""}
      </label>
      <select className="form-select" value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">Select...</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}

function VisibilityPicker({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <div className="form-group">
      <label className="form-label">{label}</label>
      <div className="choice-grid">
        {[
          { value: "public", label: "Public", desc: "Anyone can see this" },
          { value: "followers", label: "Followers", desc: "Only followers can see" },
          { value: "private", label: "Private", desc: "Only you can see" },
        ].map((option) => (
          <button key={option.value} type="button" className={`choice-card ${value === option.value ? "choice-card-active" : ""}`} onClick={() => onChange(option.value)}>
            <div className="choice-title">{option.label}</div>
            <div className="choice-desc">{option.desc}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
