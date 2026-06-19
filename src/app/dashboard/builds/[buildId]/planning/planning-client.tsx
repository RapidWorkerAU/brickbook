"use client";

import { useState } from "react";
import { ConfirmDeleteButton, LoadingButton } from "@/components/action-buttons";
import { IconCheck, IconExternalLink, IconPlus, IconX } from "@tabler/icons-react";
import type { PlanningBuilder, PlanningSuburb } from "@/app/dashboard/builds/[buildId]/page";

const DESIGN_STYLE_OPTIONS = [
  "Contemporary", "Modern", "Minimalist", "Scandinavian", "Japandi",
  "Coastal", "Hamptons", "Australian Coastal", "Modern Farmhouse",
  "Country", "Classic", "Traditional", "Heritage", "Federation",
  "Modern Industrial", "Mid-century Modern", "Art Deco", "Mediterranean",
  "French Provincial", "Tropical", "Resort", "Luxury Contemporary",
  "Transitional", "Eclectic", "Barn-style", "Craftsman",
];

const PLANNING_SECTIONS = ["Design Style", "Suburbs", "Builders", "Budget", "Saved Builds"] as const;
type PlanningSection = (typeof PLANNING_SECTIONS)[number];

type SavedBuild = {
  id: string;
  build_id: string;
  build: { id: string; title: string; slug: string; suburb_name: string | null; style: string | null; owner_username: string | null } | null;
};

export function PlanningClient({
  buildId,
  initialStyles,
  initialBudgetLandMin,
  initialBudgetLandMax,
  initialBudgetBuildMin,
  initialBudgetBuildMax,
  initialSuburbs,
  initialBuilders,
  initialSavedBuilds,
}: {
  buildId: string;
  initialStyles: string[];
  initialBudgetLandMin: number | null;
  initialBudgetLandMax: number | null;
  initialBudgetBuildMin: number | null;
  initialBudgetBuildMax: number | null;
  initialSuburbs: PlanningSuburb[];
  initialBuilders: PlanningBuilder[];
  initialSavedBuilds: SavedBuild[];
}) {
  const [section, setSection] = useState<PlanningSection>("Design Style");
  const [styles, setStyles] = useState<string[]>(initialStyles);
  const [stylesSaving, setStylesSaving] = useState(false);
  const [suburbs, setSuburbs] = useState<PlanningSuburb[]>(initialSuburbs);
  const [builders, setBuilders] = useState<PlanningBuilder[]>(initialBuilders);
  const [savedBuilds] = useState<SavedBuild[]>(initialSavedBuilds);

  const [budgetLandMin, setBudgetLandMin] = useState(initialBudgetLandMin?.toString() ?? "");
  const [budgetLandMax, setBudgetLandMax] = useState(initialBudgetLandMax?.toString() ?? "");
  const [budgetBuildMin, setBudgetBuildMin] = useState(initialBudgetBuildMin?.toString() ?? "");
  const [budgetBuildMax, setBudgetBuildMax] = useState(initialBudgetBuildMax?.toString() ?? "");
  const [budgetSaving, setBudgetSaving] = useState(false);
  const [budgetSaved, setBudgetSaved] = useState(false);

  const [suburbModalOpen, setSuburbModalOpen] = useState(false);
  const [suburbDraft, setSuburbDraft] = useState("");
  const [suburbNotes, setSuburbNotes] = useState("");
  const [suburbAdding, setSuburbAdding] = useState(false);
  const [suburbError, setSuburbError] = useState("");

  const [builderModalOpen, setBuilderModalOpen] = useState(false);
  const [builderDraft, setBuilderDraft] = useState("");
  const [builderWebsite, setBuilderWebsite] = useState("");
  const [builderNotes, setBuilderNotes] = useState("");
  const [builderAdding, setBuilderAdding] = useState(false);
  const [builderError, setBuilderError] = useState("");

  const closeSuburbModal = () => {
    setSuburbModalOpen(false);
    setSuburbDraft("");
    setSuburbNotes("");
    setSuburbError("");
  };

  const closeBuilderModal = () => {
    setBuilderModalOpen(false);
    setBuilderDraft("");
    setBuilderWebsite("");
    setBuilderNotes("");
    setBuilderError("");
  };

  const toggleStyle = async (style: string) => {
    const next = styles.includes(style) ? styles.filter((s) => s !== style) : [...styles, style];
    setStyles(next);
    setStylesSaving(true);
    await fetch(`/api/builds/${buildId}/planning`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planningStyles: next }),
    });
    setStylesSaving(false);
  };

  const saveBudget = async () => {
    setBudgetSaving(true);
    await fetch(`/api/builds/${buildId}/planning`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ budgetLandMin: budgetLandMin || null, budgetLandMax: budgetLandMax || null, budgetBuildMin: budgetBuildMin || null, budgetBuildMax: budgetBuildMax || null }),
    });
    setBudgetSaving(false);
    setBudgetSaved(true);
    window.setTimeout(() => setBudgetSaved(false), 2400);
  };

  const addSuburb = async () => {
    const name = suburbDraft.trim();
    if (!name) return;
    setSuburbAdding(true); setSuburbError("");
    const res = await fetch("/api/planning/suburbs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ build_id: buildId, suburb_name: name, notes: suburbNotes || null }) });
    const payload = await res.json().catch(() => null);
    setSuburbAdding(false);
    if (!res.ok) { setSuburbError(payload?.error ?? "Unable to add suburb."); return; }
    setSuburbs((c) => [...c, payload.suburb]);
    closeSuburbModal();
  };

  const removeSuburb = async (id: string) => {
    await fetch(`/api/planning/suburbs/${id}`, { method: "DELETE" });
    setSuburbs((c) => c.filter((s) => s.id !== id));
  };

  const addBuilder = async () => {
    const name = builderDraft.trim();
    if (!name) return;
    setBuilderAdding(true); setBuilderError("");
    const res = await fetch("/api/planning/builders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ build_id: buildId, builder_name: name, website: builderWebsite || null, notes: builderNotes || null }) });
    const payload = await res.json().catch(() => null);
    setBuilderAdding(false);
    if (!res.ok) { setBuilderError(payload?.error ?? "Unable to add builder."); return; }
    setBuilders((c) => [...c, payload.builder]);
    closeBuilderModal();
  };

  const removeBuilder = async (id: string) => {
    await fetch(`/api/planning/builders/${id}`, { method: "DELETE" });
    setBuilders((c) => c.filter((b) => b.id !== id));
  };

  return (
    <div className="editor-details-layout">
      <aside className="editor-details-sidebar">
        {PLANNING_SECTIONS.map((s) => (
          <button key={s} type="button" className={`editor-details-nav-item ${section === s ? "editor-details-nav-item-active" : ""}`} onClick={() => setSection(s)}>
            {s}
          </button>
        ))}
      </aside>

      <div className="editor-details-body">

        {section === "Design Style" && (
          <div>
            <div className="editor-section-header">
              <h2 className="editor-section-title">Design Style</h2>
              <p className="editor-section-sub">Pick the styles that inspire you. These help surface similar builds on Brickbook.</p>
              {stylesSaving ? <span className="save-indicator">Saving…</span> : styles.length > 0 ? <span className="save-indicator save-indicator-ok">{styles.length} selected</span> : null}
            </div>
            <div className="planning-style-grid">
              {DESIGN_STYLE_OPTIONS.map((style) => {
                const active = styles.includes(style);
                return (
                  <button key={style} type="button" className={`planning-style-chip ${active ? "planning-style-chip-active" : ""}`} onClick={() => toggleStyle(style)}>
                    {active ? <IconCheck size={12} /> : null}
                    {style}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {section === "Suburbs" && (
          <div>
            <div className="editor-section-header editor-section-header-row">
              <div>
                <h2 className="editor-section-title">Suburb Wishlist</h2>
                <p className="editor-section-sub">Track the suburbs or areas you're considering for your build.</p>
              </div>
              <button className="btn btn-secondary btn-sm" type="button" onClick={() => setSuburbModalOpen(true)}>
                <IconPlus size={13} /> Add suburb
              </button>
            </div>
            {suburbs.length > 0 ? (
              <div className="planning-list">
                {suburbs.map((suburb) => (
                  <div key={suburb.id} className="planning-list-item">
                    <div>
                      <div className="planning-list-title">{suburb.suburb_name}</div>
                      {suburb.notes ? <div className="planning-list-notes">{suburb.notes}</div> : null}
                    </div>
                    <ConfirmDeleteButton iconOnly onConfirm={() => removeSuburb(suburb.id)} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state empty-state-sm">
                <p className="empty-state-sub">No suburbs added yet. Start building your shortlist above.</p>
              </div>
            )}
          </div>
        )}

        {section === "Builders" && (
          <div>
            <div className="editor-section-header editor-section-header-row">
              <div>
                <h2 className="editor-section-title">Builder Shortlist</h2>
                <p className="editor-section-sub">Keep track of builders you're researching or considering.</p>
              </div>
              <button className="btn btn-secondary btn-sm" type="button" onClick={() => setBuilderModalOpen(true)}>
                <IconPlus size={13} /> Add builder
              </button>
            </div>
            {builders.length > 0 ? (
              <div className="planning-list">
                {builders.map((builder) => (
                  <div key={builder.id} className="planning-list-item">
                    <div>
                      <div className="planning-list-title">{builder.builder_name}</div>
                      {builder.website ? (
                        <a href={builder.website} target="_blank" rel="noopener noreferrer" className="planning-list-link">
                          <IconExternalLink size={11} /> {builder.website}
                        </a>
                      ) : null}
                      {builder.notes ? <div className="planning-list-notes">{builder.notes}</div> : null}
                    </div>
                    <ConfirmDeleteButton iconOnly onConfirm={() => removeBuilder(builder.id)} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state empty-state-sm">
                <p className="empty-state-sub">No builders added yet. Start your shortlist above.</p>
              </div>
            )}
          </div>
        )}

        {section === "Budget" && (
          <div>
            <div className="editor-section-header">
              <h2 className="editor-section-title">Budget Range</h2>
              <p className="editor-section-sub">Set rough targets for your land and build budgets. These are private planning notes.</p>
            </div>
            <div className="budget-section-cards">
              <div className="budget-section-card">
                <div className="budget-section-card-title">Land</div>
                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label">Minimum</label>
                    <div className="input-currency">
                      <span className="input-currency-symbol">$</span>
                      <input className="form-input" type="number" min="0" placeholder="0" value={budgetLandMin} onChange={(e) => setBudgetLandMin(e.target.value)} />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Maximum</label>
                    <div className="input-currency">
                      <span className="input-currency-symbol">$</span>
                      <input className="form-input" type="number" min="0" placeholder="0" value={budgetLandMax} onChange={(e) => setBudgetLandMax(e.target.value)} />
                    </div>
                  </div>
                </div>
              </div>
              <div className="budget-section-card">
                <div className="budget-section-card-title">Build</div>
                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label">Minimum</label>
                    <div className="input-currency">
                      <span className="input-currency-symbol">$</span>
                      <input className="form-input" type="number" min="0" placeholder="0" value={budgetBuildMin} onChange={(e) => setBudgetBuildMin(e.target.value)} />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Maximum</label>
                    <div className="input-currency">
                      <span className="input-currency-symbol">$</span>
                      <input className="form-input" type="number" min="0" placeholder="0" value={budgetBuildMax} onChange={(e) => setBudgetBuildMax(e.target.value)} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="form-actions">
              <LoadingButton className="btn btn-primary" loading={budgetSaving} onClick={saveBudget}>
                {budgetSaved ? <><IconCheck size={13} /> Saved</> : "Save budget"}
              </LoadingButton>
            </div>
          </div>
        )}

        {section === "Saved Builds" && (
          <div>
            <div className="editor-section-header">
              <h2 className="editor-section-title">Saved Builds</h2>
              <p className="editor-section-sub">Builds you've saved for inspiration. Browse public builds on Brickbook and tap the heart to save them here.</p>
            </div>
            {savedBuilds.length > 0 ? (
              <div className="planning-list">
                {savedBuilds.map((saved) => saved.build ? (
                  <div key={saved.id} className="planning-list-item">
                    <div>
                      <div className="planning-list-title">{saved.build.title}</div>
                      <div className="planning-list-notes">
                        {saved.build.suburb_name ?? ""}
                        {saved.build.style ? ` · ${saved.build.style}` : ""}
                      </div>
                    </div>
                    {saved.build.owner_username ? (
                      <a href={`/${saved.build.owner_username}/${saved.build.slug}`} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm">
                        View <IconExternalLink size={11} />
                      </a>
                    ) : null}
                  </div>
                ) : null)}
              </div>
            ) : (
              <div className="empty-state empty-state-sm">
                <p className="empty-state-sub">No saved builds yet. Visit public build profiles and tap the bookmark icon to save builds you love.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {suburbModalOpen && (
        <div className="bb-modal" role="dialog" aria-modal="true" aria-labelledby="suburb-modal-title">
          <button className="bb-modal-backdrop" type="button" aria-label="Close" onClick={closeSuburbModal} />
          <section className="bb-modal-panel">
            <div className="bb-modal-header">
              <div>
                <h2 id="suburb-modal-title" className="dashboard-title">Add suburb</h2>
                <p className="dashboard-subtitle">Add a suburb or area you're considering.</p>
              </div>
              <button className="btn-icon" type="button" aria-label="Close" onClick={closeSuburbModal}><IconX size={16} /></button>
            </div>
            <div className="bb-modal-body">
              <div className="form-group">
                <label className="form-label">Suburb or area name</label>
                <input className="form-input" placeholder="e.g. Paddington" value={suburbDraft} onChange={(e) => setSuburbDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") addSuburb(); }} autoFocus />
              </div>
              <div className="form-group">
                <label className="form-label">Notes <span className="form-label-optional">(optional)</span></label>
                <textarea className="form-textarea" placeholder="e.g. Good schools, within budget range" rows={3} value={suburbNotes} onChange={(e) => setSuburbNotes(e.target.value)} />
              </div>
              {suburbError ? <div className="alert alert-error">{suburbError}</div> : null}
            </div>
            <div className="bb-modal-footer">
              <button className="btn btn-ghost btn-sm" type="button" onClick={closeSuburbModal}>Cancel</button>
              <LoadingButton className="btn btn-primary btn-sm" loading={suburbAdding} disabled={!suburbDraft.trim()} onClick={addSuburb}>
                Add suburb
              </LoadingButton>
            </div>
          </section>
        </div>
      )}

      {builderModalOpen && (
        <div className="bb-modal" role="dialog" aria-modal="true" aria-labelledby="builder-modal-title">
          <button className="bb-modal-backdrop" type="button" aria-label="Close" onClick={closeBuilderModal} />
          <section className="bb-modal-panel">
            <div className="bb-modal-header">
              <div>
                <h2 id="builder-modal-title" className="dashboard-title">Add builder</h2>
                <p className="dashboard-subtitle">Add a builder you're researching or considering.</p>
              </div>
              <button className="btn-icon" type="button" aria-label="Close" onClick={closeBuilderModal}><IconX size={16} /></button>
            </div>
            <div className="bb-modal-body">
              <div className="form-group">
                <label className="form-label">Builder name</label>
                <input className="form-input" placeholder="e.g. Metricon" value={builderDraft} onChange={(e) => setBuilderDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") addBuilder(); }} autoFocus />
              </div>
              <div className="form-group">
                <label className="form-label">Website <span className="form-label-optional">(optional)</span></label>
                <input className="form-input" type="url" placeholder="https://..." value={builderWebsite} onChange={(e) => setBuilderWebsite(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Notes <span className="form-label-optional">(optional)</span></label>
                <textarea className="form-textarea" placeholder="e.g. Good reviews, competitive pricing" rows={3} value={builderNotes} onChange={(e) => setBuilderNotes(e.target.value)} />
              </div>
              {builderError ? <div className="alert alert-error">{builderError}</div> : null}
            </div>
            <div className="bb-modal-footer">
              <button className="btn btn-ghost btn-sm" type="button" onClick={closeBuilderModal}>Cancel</button>
              <LoadingButton className="btn btn-primary btn-sm" loading={builderAdding} disabled={!builderDraft.trim()} onClick={addBuilder}>
                Add builder
              </LoadingButton>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
