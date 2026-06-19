"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import Nav from "@/components/Nav";
import { ConfirmDeleteButton, LoadingButton } from "@/components/action-buttons";
import { SearchableSelect } from "@/components/SearchableSelect";
import { ImagesClient, type LibraryImage } from "@/app/dashboard/builds/[buildId]/images/images-client";
import { MilestonesClient, type EditableMilestone } from "@/app/dashboard/builds/[buildId]/milestones/milestones-client";
import { RoomsClient } from "@/app/dashboard/builds/[buildId]/rooms/rooms-client";
import { SelectionsClient, type EditableRoom, type EditableSelection } from "@/app/dashboard/builds/[buildId]/selections/selections-client";
import { PlanningClient } from "@/app/dashboard/builds/[buildId]/planning/planning-client";
import { PdfThumbnail } from "@/components/PdfThumbnail";
import { IconArrowLeft, IconBuildingCommunity, IconCheck, IconChevronDown, IconCircleCheck, IconExternalLink, IconFileText, IconHardHat, IconPhoto, IconPlant, IconRuler, IconSearch, IconX } from "@tabler/icons-react";
import type { EditableBuild, PlanningBuilder, PlanningSuburb } from "@/app/dashboard/builds/[buildId]/page";

const ALL_EDITOR_TABS = ["Details", "Planning", "Rooms", "Milestones", "Images", "Inspiration", "Selections", "Visibility"] as const;
type EditorTab = (typeof ALL_EDITOR_TABS)[number];
const DETAIL_SECTIONS = ["Profile", "Key specs", "Size", "Design", "Floorplan", "Window Schedule", "Cabinetry Plan"] as const;
type DetailSection = (typeof DETAIL_SECTIONS)[number];

const PLAN_SECTION_TYPES: Partial<Record<DetailSection, string>> = {
  "Floorplan": "floorplan",
  "Window Schedule": "window_schedule",
  "Cabinetry Plan": "cabinetry_plan",
};

type NavUser = { username: string; display_name?: string; avatar_path?: string };

const PROJECT_TYPE_OPTIONS = [
  "New Build",
  "Knockdown Rebuild",
  "Renovation",
  "Extension",
  "Ancillary Dwelling",
  "Tiny Home",
  "Mobile Home",
];

const DWELLING_TYPE_OPTIONS = [
  "House",
  "Apartment",
  "Townhouse",
  "Villa",
  "Duplex",
  "Triplex",
  "Unit",
  "Terrace",
  "Granny flat",
  "Secondary dwelling",
  "Studio",
  "Tiny home",
  "Modular home",
  "Display home",
  "Multi-residential",
];

const DESIGN_STYLE_OPTIONS = [
  "Modern Industrial",
  "Contemporary",
  "Modern",
  "Mid-century Modern",
  "Minimalist",
  "Scandinavian",
  "Japandi",
  "Coastal",
  "Hamptons",
  "Australian Coastal",
  "Modern Farmhouse",
  "Country",
  "Classic",
  "Traditional",
  "Heritage",
  "Federation",
  "Queenslander",
  "Californian Bungalow",
  "Art Deco",
  "Mediterranean",
  "Tuscan",
  "Spanish Revival",
  "French Provincial",
  "Georgian",
  "Victorian",
  "Edwardian",
  "Tropical",
  "Resort",
  "Desert Modern",
  "Urban",
  "Warehouse",
  "Barn-style",
  "Ranch",
  "Craftsman",
  "Prairie",
  "Brutalist",
  "Bauhaus",
  "Eclectic",
  "Transitional",
  "Luxury Contemporary",
];

const AU_STATES = ["ACT", "NSW", "NT", "QLD", "SA", "TAS", "VIC", "WA"];

const CONSTRUCTION_TYPE_OPTIONS = [
  "Double brick",
  "Brick veneer",
  "Timber frame",
  "Steel frame",
  "Reverse brick veneer",
  "Concrete slab on ground",
  "Lightweight cladding",
  "Hebel / AAC panels",
  "Insulated concrete forms",
  "Structural insulated panels",
  "Precast concrete",
  "Tilt-up concrete",
  "Rammed earth",
  "Straw bale",
  "Mud brick",
  "Stone masonry",
  "Blockwork",
  "Modular construction",
  "Prefabricated panels",
  "Cross-laminated timber",
  "Mass timber",
  "Hybrid steel and timber",
  "Suspended slab",
  "Post and beam",
  "Passive house construction",
];

const ROOF_STRUCTURE_OPTIONS = [
  "Timber truss",
  "Steel truss",
  "Conventional timber-framed roof",
  "Skillion roof",
  "Gable roof",
  "Hip roof",
  "Dutch gable roof",
  "Flat roof",
  "Butterfly roof",
  "Sawtooth roof",
  "Curved roof",
  "Bonnet roof",
  "Mansard roof",
  "Gambrel roof",
  "Clerestory roof",
  "Roof terrace",
  "Concrete roof slab",
  "Structural steel roof",
  "Portal frame roof",
  "Colorbond roof sheeting",
  "Tiled roof",
  "Slate roof",
  "Green roof",
  "Solar-ready roof",
];

const BUILD_STAGES = [
  { value: "planning",          label: "Planning",              sub: "Researching and exploring ideas" },
  { value: "pre_construction",  label: "Pre-construction",      sub: "Contracts signed, waiting to start" },
  { value: "construction",      label: "Under construction",    sub: "Build is actively underway" },
  { value: "landscaping",       label: "Finishing & landscaping", sub: "Internal completion and outdoors" },
  { value: "complete",          label: "Complete",              sub: "Build is finished" },
] as const;

const STAGE_ICONS = {
  planning:         IconSearch,
  pre_construction: IconFileText,
  construction:     IconHardHat,
  landscaping:      IconPlant,
  complete:         IconCircleCheck,
} as const;

export function BuildEditorClient({
  build,
  user,
  initialMilestones,
  initialImages,
  initialSelections,
  initialRooms,
  initialPlanningSuburbs,
  initialPlanningBuilders,
  builderOptions,
}: {
  build: EditableBuild;
  user: NavUser;
  initialMilestones: EditableMilestone[];
  initialImages: LibraryImage[];
  initialSelections: EditableSelection[];
  initialRooms: EditableRoom[];
  initialPlanningSuburbs: PlanningSuburb[];
  initialPlanningBuilders: PlanningBuilder[];
  builderOptions: string[];
}) {
  const [tab, setTab] = useState<EditorTab>("Details");
  const [detailsSection, setDetailsSection] = useState<DetailSection>("Profile");
  const [form, setForm] = useState({
    title: build.title,
    builderName: build.builder_name ?? "",
    suburbName: build.suburb_name ?? "",
    state: build.state ?? "",
    estateName: build.estate_name ?? "",
    buildType: build.style ?? "",
    isListed: Boolean(build.is_listed),
    standardVisibility: build.standard_visibility ?? "public",
    timelineVisibility: build.timeline_visibility ?? "public",
    bedrooms: build.bedrooms?.toString() ?? "",
    bathrooms: build.bathrooms?.toString() ?? "",
    separateToilets: build.separate_toilets?.toString() ?? "",
    garageSpaces: build.garage_spaces?.toString() ?? "",
    landSizeM2: build.land_size_m2?.toString() ?? "",
    internalSizeM2: build.internal_size_m2?.toString() ?? "",
    alfrescoSizeM2: build.alfresco_size_m2?.toString() ?? "",
    homeWidthM: build.home_width_m?.toString() ?? "",
    homeDepthM: build.home_depth_m?.toString() ?? "",
    buildTypeDetail: build.build_type ?? "",
    constructionType: build.construction_type ?? "",
    roofStructure: build.roof_structure ?? "",
    homeDesignStyle: build.home_design_style ?? "",
    stage: build.stage ?? "",
    description: build.description ?? "",
  });
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [convertModal, setConvertModal] = useState<{ targetStage: string; builderName: string; suburbName: string } | null>(null);
  const [rooms, setRooms] = useState(initialRooms);
  const [coverPreview, setCoverPreview] = useState(build.coverImageUrl ?? "");
  const [coverFileName, setCoverFileName] = useState("");
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [planImages, setPlanImages] = useState<LibraryImage[]>(() =>
    initialImages.filter((img) => img.image_kind === "plan")
  );
  const coverInputRef = useRef<HTMLInputElement | null>(null);

  const set = (key: keyof typeof form, value: string | boolean) => setForm((current) => ({ ...current, [key]: value }));

  useEffect(() => {
    return () => {
      if (coverPreview && coverPreview.startsWith("blob:")) URL.revokeObjectURL(coverPreview);
    };
  }, [coverPreview]);

  const chooseCover = () => coverInputRef.current?.click();

  const onCoverChange = (fileList: FileList | null) => {
    const file = fileList?.[0] ?? null;
    if (coverPreview?.startsWith("blob:")) URL.revokeObjectURL(coverPreview);
    if (!file) {
      setCoverFile(null);
      setCoverFileName("");
      setCoverPreview(build.coverImageUrl ?? "");
      return;
    }
    setCoverFile(file);
    setCoverFileName(file.name);
    setCoverPreview(URL.createObjectURL(file));
  };

  const removePendingCover = () => {
    if (coverPreview?.startsWith("blob:")) URL.revokeObjectURL(coverPreview);
    setCoverFile(null);
    setCoverFileName("");
    setCoverPreview(build.coverImageUrl ?? "");
    if (coverInputRef.current) coverInputRef.current.value = "";
  };

  const isPlanningBuild = build.stage === 'planning';
  const visibleEditorTabs: EditorTab[] = isPlanningBuild
    ? ["Details", "Planning", "Inspiration", "Visibility"]
    : ["Details", "Rooms", "Milestones", "Images", "Inspiration", "Selections", "Visibility"];

  const saveBuild = async (overrides?: Partial<typeof form>) => {
    setSaving(true);
    setError("");
    const merged = overrides ? { ...form, ...overrides } : form;
    const formData = new FormData();
    Object.entries(merged).forEach(([key, value]) => formData.set(key, String(value)));
    if (coverFile) formData.set("coverImage", coverFile);
    const response = await fetch(`/api/builds/${build.id}`, {
      method: "PATCH",
      body: formData,
    });
    const payload = await response.json().catch(() => null);
    setSaving(false);
    if (!response.ok) {
      setError(payload?.error ?? "Unable to save build.");
      return;
    }
    if (coverFile) {
      setCoverFile(null);
      setCoverFileName("");
      if (coverInputRef.current) coverInputRef.current.value = "";
    }
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2400);
  };

  const updatePlanDocs = (planType: string, updatedDocs: LibraryImage[]) => {
    setPlanImages((current) => [
      ...current.filter((img) => img.plan_type !== planType),
      ...updatedDocs,
    ]);
  };

  const floorplanDocs = planImages.filter((img) => img.plan_type === "floorplan");
  const windowScheduleDocs = planImages.filter((img) => img.plan_type === "window_schedule");
  const cabinetryDocs = planImages.filter((img) => img.plan_type === "cabinetry_plan");

  return (
    <div className="dashboard-page">
      <Nav user={user} />

      <header className="dashboard-topbar">
        <div className="dashboard-topbar-inner">
          <div className="breadcrumb-row">
            <Link href="/dashboard/builds" className="back-link">
              <IconArrowLeft size={13} /> My builds
            </Link>
            <span>/</span>
            <span className="breadcrumb-current">{form.title}</span>
          </div>
          <div className="dashboard-actions">
            {saved ? (
              <span className="muted-row text-[var(--bb-green)]">
                <IconCheck size={13} /> Saved
              </span>
            ) : null}
            {form.isListed ? (
              <Link href={`/${user.username}/${build.slug}`} className="btn-icon" aria-label="View public build" target="_blank">
                <IconExternalLink size={14} />
              </Link>
            ) : null}
            <LoadingButton className="btn btn-primary btn-sm" loading={saving} onClick={() => saveBuild()}>
              Save
            </LoadingButton>
          </div>
        </div>

        <div className="page-container">
          <div className="tab-list">
            {visibleEditorTabs.map((item) => (
              <button key={item} className={`tab ${tab === item ? "tab-active" : ""}`} onClick={() => setTab(item)}>
                {item}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="editor-body">
        {error ? <div className="alert alert-error mb-4">{error}</div> : null}
        {tab === "Details" ? (
          <div className="editor-details-layout">
            <aside className="editor-details-sidebar">
              <div className="editor-details-sidebar-title">Build details</div>
              {DETAIL_SECTIONS.map((section) => (
                <button
                  key={section}
                  type="button"
                  className={`editor-details-nav-item ${detailsSection === section ? "editor-details-nav-item-active" : ""}`}
                  onClick={() => setDetailsSection(section)}
                >
                  {section === "Profile" ? <IconBuildingCommunity size={15} /> : null}
                  {section === "Key specs" ? <img src="/icons/bedroom.svg" alt="" /> : null}
                  {section === "Size" ? <IconRuler size={15} /> : null}
                  {section === "Design" ? <img src="/icons/style.svg" alt="" /> : null}
                  {section === "Floorplan" ? <img src="/icons/construction.svg" alt="" /> : null}
                  {section === "Window Schedule" ? <IconRuler size={15} /> : null}
                  {section === "Cabinetry Plan" ? <img src="/icons/kitchen.svg" alt="" /> : null}
                  <span>{section}</span>
                </button>
              ))}
            </aside>

            <section className="card editor-details-card">
              <div className="card-body">
                {detailsSection === "Profile" ? (
                  <div className="editor-details-section">
                    <SectionIntro icon={<IconBuildingCommunity size={18} />} title="Profile" copy="The public-facing identity for this build." />
                    <input
                      ref={coverInputRef}
                      className="hidden-file-input"
                      type="file"
                      accept="image/*"
                      onChange={(event) => onCoverChange(event.target.files)}
                    />
                    <div className="editor-cover-panel">
                      <div className="editor-cover-preview">
                        {coverPreview ? (
                          // Signed and local preview URLs are rendered directly.
                          <img src={coverPreview} alt="" />
                        ) : (
                          <span>
                            <IconPhoto size={24} />
                            Cover image
                          </span>
                        )}
                      </div>
                      <div className="editor-cover-content">
                        <div>
                          <h3>Public profile cover</h3>
                          <p>{coverFileName || "This image appears on the public profile hero, dashboard cards, and listing tiles."}</p>
                        </div>
                        <div className="editor-cover-actions">
                          <button type="button" className="btn btn-secondary btn-sm" onClick={chooseCover}>
                            {coverPreview ? "Replace cover" : "Upload cover"}
                          </button>
                          {coverFile ? (
                            <button type="button" className="btn-icon btn-icon-compact" aria-label="Cancel cover change" onClick={removePendingCover}>
                              <IconX size={13} />
                            </button>
                          ) : null}
                        </div>
                      </div>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Build name</label>
                      <input className="form-input form-input-lg" value={form.title} onChange={(event) => set("title", event.target.value)} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">About this build <span className="form-label-optional">(optional)</span></label>
                      <textarea
                        className="form-textarea"
                        value={form.description}
                        onChange={(event) => set("description", event.target.value)}
                        placeholder="Tell people about your build — your vision, goals, what makes it unique..."
                        rows={3}
                        maxLength={1000}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Build stage</label>
                      <div className="stage-picker">
                        {BUILD_STAGES.map((stage) => {
                          const StageIcon = STAGE_ICONS[stage.value]
                          return (
                            <button
                              key={stage.value}
                              type="button"
                              className={`stage-card ${form.stage === stage.value ? "stage-card-active" : ""}`}
                              onClick={() => {
                                if (build.stage === 'planning' && stage.value !== 'planning') {
                                  setConvertModal({ targetStage: stage.value, builderName: form.builderName, suburbName: form.suburbName });
                                } else {
                                  set("stage", stage.value);
                                }
                              }}
                            >
                              <StageIcon size={17} className="stage-card-icon" />
                              <span className="stage-card-label">{stage.label}</span>
                              <span className="stage-card-sub">{stage.sub}</span>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                    <div className="form-grid-2">
                      <StyledInput icon={<IconBuildingCommunity size={16} />} label="Suburb" value={form.suburbName} onChange={(value) => set("suburbName", value)} />
                      <SearchableSelect label="State" value={form.state} onChange={(value) => set("state", value)} options={AU_STATES} placeholder="Select state…" />
                      <StyledInput icon={<IconBuildingCommunity size={16} />} label="Estate" value={form.estateName} onChange={(value) => set("estateName", value)} placeholder="Optional" />
                      <SearchableSelect label="Project type" value={form.buildType} onChange={(value) => set("buildType", value)} options={PROJECT_TYPE_OPTIONS} />
                      <SearchableSelect label="Builder" value={form.builderName} onChange={(value) => set("builderName", value)} options={["Owner builder", ...builderOptions]} placeholder="Search or add builder..." />
                    </div>
                  </div>
                ) : null}

                {detailsSection === "Key specs" ? (
                  <div className="editor-details-section">
                    <SectionIntro icon={<img src="/icons/bedroom.svg" alt="" />} title="Key specs" copy="The headline numbers people scan first." />
                    <div className="editor-spec-grid">
                      <MetricInput icon="/icons/bedroom.svg" label="Bedrooms" value={form.bedrooms} onChange={(value) => set("bedrooms", value)} />
                      <MetricInput icon="/icons/bathroom.svg" label="Bathrooms" value={form.bathrooms} onChange={(value) => set("bathrooms", value)} />
                      <MetricInput icon="/icons/toilet.svg" label="Toilets" value={form.separateToilets} onChange={(value) => set("separateToilets", value)} />
                      <MetricInput icon="/icons/car.svg" label="Garage" value={form.garageSpaces} onChange={(value) => set("garageSpaces", value)} />
                    </div>
                  </div>
                ) : null}

                {detailsSection === "Size" ? (
                  <div className="editor-details-section">
                    <SectionIntro icon={<IconRuler size={18} />} title="Size" copy="Block, living, alfresco, and footprint dimensions." />
                    <div className="form-grid-2">
                      <StyledInput icon={<img src="/icons/land.svg" alt="" />} label="Land size m2" value={form.landSizeM2} onChange={(value) => set("landSizeM2", value)} type="number" />
                      <StyledInput icon={<IconBuildingCommunity size={16} />} label="Home size m2" value={form.internalSizeM2} onChange={(value) => set("internalSizeM2", value)} type="number" />
                      <StyledInput icon={<img src="/icons/alfresco.svg" alt="" />} label="Alfresco m2" value={form.alfrescoSizeM2} onChange={(value) => set("alfrescoSizeM2", value)} type="number" />
                      <StyledInput icon={<IconRuler size={16} />} label="Width m" value={form.homeWidthM} onChange={(value) => set("homeWidthM", value)} type="number" />
                      <StyledInput icon={<IconRuler size={16} />} label="Depth m" value={form.homeDepthM} onChange={(value) => set("homeDepthM", value)} type="number" />
                    </div>
                  </div>
                ) : null}

                {detailsSection === "Design" ? (
                  <div className="editor-details-section">
                    <SectionIntro icon={<img src="/icons/style.svg" alt="" />} title="Design" copy="How the home is built, styled, and structured." />
                    <div className="form-grid-2">
                      <SearchableSelect label="Dwelling type" value={form.buildTypeDetail} onChange={(value) => set("buildTypeDetail", value)} options={DWELLING_TYPE_OPTIONS} />
                      <SearchableSelect label="Construction type" value={form.constructionType} onChange={(value) => set("constructionType", value)} options={CONSTRUCTION_TYPE_OPTIONS} />
                      <SearchableSelect label="Roof type" value={form.roofStructure} onChange={(value) => set("roofStructure", value)} options={ROOF_STRUCTURE_OPTIONS} />
                      <SearchableSelect label="Design style" value={form.homeDesignStyle} onChange={(value) => set("homeDesignStyle", value)} options={DESIGN_STYLE_OPTIONS} />
                    </div>
                  </div>
                ) : null}

                {detailsSection === "Floorplan" ? (
                  <PlanDocumentSection
                    build={build}
                    planType={PLAN_SECTION_TYPES["Floorplan"]!}
                    title="Floorplan"
                    icon={<img src="/icons/construction.svg" alt="" style={{ width: 18, height: 18, objectFit: "contain" }} />}
                    copy="Upload floor plan images or PDFs. Mark one as the primary plan."
                    docs={floorplanDocs}
                    onDocsChange={(docs) => updatePlanDocs("floorplan", docs)}
                  />
                ) : null}

                {detailsSection === "Window Schedule" ? (
                  <PlanDocumentSection
                    build={build}
                    planType={PLAN_SECTION_TYPES["Window Schedule"]!}
                    title="Window Schedule"
                    icon={<IconRuler size={18} />}
                    copy="Upload your window schedule documents. Mark one as the primary."
                    docs={windowScheduleDocs}
                    onDocsChange={(docs) => updatePlanDocs("window_schedule", docs)}
                  />
                ) : null}

                {detailsSection === "Cabinetry Plan" ? (
                  <PlanDocumentSection
                    build={build}
                    planType={PLAN_SECTION_TYPES["Cabinetry Plan"]!}
                    title="Cabinetry Plan"
                    icon={<img src="/icons/kitchen.svg" alt="" style={{ width: 18, height: 18, objectFit: "contain" }} />}
                    copy="Upload your cabinetry plan images or PDFs. Mark one as the primary."
                    docs={cabinetryDocs}
                    onDocsChange={(docs) => updatePlanDocs("cabinetry_plan", docs)}
                  />
                ) : null}
              </div>
            </section>
          </div>
        ) : null}

        {tab === "Planning" ? (
          <PlanningClient
            buildId={build.id}
            initialStyles={build.planning_styles ?? []}
            initialBudgetLandMin={build.budget_land_min}
            initialBudgetLandMax={build.budget_land_max}
            initialBudgetBuildMin={build.budget_build_min}
            initialBudgetBuildMax={build.budget_build_max}
            initialSuburbs={initialPlanningSuburbs}
            initialBuilders={initialPlanningBuilders}
            initialSavedBuilds={[]}
          />
        ) : null}

        {tab === "Milestones" ? (
          <MilestonesClient build={build} user={user} initialMilestones={initialMilestones} showChrome={false} />
        ) : null}

        {tab === "Rooms" ? (
          <RoomsClient build={build} user={user} rooms={rooms} onRoomsChange={setRooms} showChrome={false} />
        ) : null}

        {tab === "Images" ? (
          <ImagesClient
            build={build}
            user={user}
            milestones={initialMilestones.map((milestone) => ({ id: milestone.id, title: milestone.title }))}
            rooms={rooms.map((room) => ({ id: room.id, name: room.name }))}
            initialImages={initialImages}
            buildSelections={initialSelections.map((s) => ({
              id: s.id,
              category: s.category ?? null,
              itemName: s.item_name ?? null,
              brand: s.brand ?? null,
              productName: s.product_name ?? null,
              colourName: s.colour_name ?? null,
              imageUrl: s.imageUrl ?? null,
            }))}
            showChrome={false}
          />
        ) : null}

        {tab === "Inspiration" ? (
          <ImagesClient
            build={build}
            user={user}
            milestones={initialMilestones.map((milestone) => ({ id: milestone.id, title: milestone.title }))}
            rooms={rooms.map((room) => ({ id: room.id, name: room.name }))}
            initialImages={initialImages}
            showChrome={false}
            mode="inspiration"
            useRoomTypes={isPlanningBuild}
          />
        ) : null}

        {tab === "Selections" ? (
          <SelectionsClient
            build={build}
            user={user}
            initialSelections={initialSelections}
            initialRooms={rooms}
            imageOptions={initialImages.map((image, index) => ({ id: image.id, imageUrl: image.imageUrl, label: `Build image ${index + 1}` }))}
            showChrome={false}
          />
        ) : null}

        {tab === "Visibility" ? (
          <div className="stack">
            <section className="card">
              <div className="card-body">
                <div className="section-label">Public listing</div>
                <div className="choice-grid">
                  {[true, false].map((value) => (
                    <button
                      key={String(value)}
                      type="button"
                      className={`choice-card choice-card-left ${form.isListed === value ? "choice-card-active" : ""}`}
                      onClick={() => set("isListed", value)}
                    >
                      <div className="choice-title">{value ? "Listed publicly" : "Private"}</div>
                      <div className="choice-desc">{value ? "Appears in Discover and search" : "Only visible to you"}</div>
                    </button>
                  ))}
                </div>
              </div>
            </section>
          </div>
        ) : null}
      </main>

      {convertModal ? (
        <div className="bb-modal" role="dialog" aria-modal="true" aria-labelledby="convert-modal-title">
          <button className="bb-modal-backdrop" type="button" aria-label="Close" onClick={() => setConvertModal(null)} />
          <section className="bb-modal-panel">
            <div className="bb-modal-header">
              <div>
                <h2 id="convert-modal-title" className="dashboard-title">Start your build</h2>
                <p className="dashboard-subtitle">
                  Moving to {BUILD_STAGES.find((s) => s.value === convertModal.targetStage)?.label ?? convertModal.targetStage}. Confirm key details below before saving.
                </p>
              </div>
              <button className="btn-icon" type="button" aria-label="Close" onClick={() => setConvertModal(null)}>
                <IconX size={16} />
              </button>
            </div>
            <div className="bb-modal-body">
              <p className="convert-modal-note">
                Your planning wishlist — styles, suburbs, and builders — will remain visible on your public profile as planning history.
              </p>
              <div className="form-group">
                <label className="form-label">Builder</label>
                <SearchableSelect
                  label="Builder"
                  hideLabel
                  value={convertModal.builderName}
                  onChange={(value) => setConvertModal((m) => m ? { ...m, builderName: value } : null)}
                  options={["Owner builder", ...builderOptions]}
                  placeholder="Search or add builder..."
                />
              </div>
              <div className="form-group">
                <label className="form-label">Suburb</label>
                <input
                  className="form-input"
                  value={convertModal.suburbName}
                  placeholder="Where is the build located?"
                  onChange={(event) => setConvertModal((m) => m ? { ...m, suburbName: event.target.value } : null)}
                />
              </div>
            </div>
            <div className="bb-modal-footer">
              <button className="btn btn-secondary" type="button" onClick={() => setConvertModal(null)}>
                Cancel
              </button>
              <LoadingButton
                className="btn btn-primary"
                loading={saving}
                onClick={async () => {
                  const updates = {
                    stage: convertModal.targetStage,
                    builderName: convertModal.builderName,
                    suburbName: convertModal.suburbName,
                  };
                  setForm((current) => ({ ...current, ...updates }));
                  setConvertModal(null);
                  await saveBuild(updates);
                }}
              >
                Start building
              </LoadingButton>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}

function PlanDocumentSection({
  build,
  planType,
  title,
  icon,
  copy,
  docs,
  onDocsChange,
}: {
  build: EditableBuild;
  planType: string;
  title: string;
  icon: ReactNode;
  copy: string;
  docs: LibraryImage[];
  onDocsChange: (docs: LibraryImage[]) => void;
}) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [editingDoc, setEditingDoc] = useState<LibraryImage | null>(null);
  const [savingDocId, setSavingDocId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    setError("");
    const formData = new FormData();
    formData.set("build_id", build.id);
    formData.set("image_kind", "plan");
    formData.set("plan_type", planType);
    formData.set("visibility", "public");
    Array.from(files).forEach((file) => formData.append("images", file));
    const response = await fetch("/api/build-images", { method: "POST", body: formData });
    const payload = await response.json().catch(() => null);
    setUploading(false);
    if (!response.ok) {
      setError(payload?.error ?? "Unable to upload files.");
      return;
    }
    if (fileRef.current) fileRef.current.value = "";
    const newDocs = (payload.images as LibraryImage[]).map((img) => ({ ...img, imageUrl: null }));
    onDocsChange([...newDocs, ...docs]);
  };

  const toggleExpanded = (id: string) => {
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const saveEdit = async () => {
    if (!editingDoc) return;
    setSavingDocId(editingDoc.id);
    // Optimistic update — also clear is_primary from siblings if setting this one as primary
    const updated = docs.map((item) => ({
      ...item,
      ...(item.id === editingDoc.id
        ? { visibility: editingDoc.visibility, is_primary: editingDoc.is_primary }
        : editingDoc.is_primary
          ? { is_primary: false }
          : {}),
    }));
    onDocsChange(updated);
    const response = await fetch(`/api/build-images/${editingDoc.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        milestone_id: null,
        room_id: null,
        visibility: editingDoc.visibility,
        notes: null,
        is_primary: editingDoc.is_primary ?? false,
      }),
    });
    setSavingDocId(null);
    if (!response.ok) {
      onDocsChange(docs);
    } else {
      setEditingDoc(null);
    }
  };

  const remove = async (doc: LibraryImage) => {
    setDeletingId(doc.id);
    const response = await fetch(`/api/build-images/${doc.id}`, { method: "DELETE" });
    setDeletingId(null);
    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      setError(payload?.error ?? "Unable to delete file.");
      return;
    }
    onDocsChange(docs.filter((item) => item.id !== doc.id));
  };

  return (
    <div className="editor-details-section">
      <SectionIntro icon={icon} title={title} copy={copy} />
      {error ? <div className="alert alert-error">{error}</div> : null}

      <input
        ref={fileRef}
        type="file"
        accept="image/*,.pdf,application/pdf"
        multiple
        hidden
        onChange={(e) => upload(e.target.files)}
      />
      <button
        className="image-upload-zone"
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
      >
        <IconPhoto size={22} />
        <span className="empty-state-title">{uploading ? "Uploading..." : `Upload ${title.toLowerCase()} files`}</span>
        <span className="empty-state-sub">Images or PDFs accepted. Select multiple files at once.</span>
      </button>

      {docs.length > 0 ? (
        <div className="plan-doc-tile-grid">
          {docs.map((doc) => (
            <PlanDocTile
              key={doc.id}
              doc={doc}
              expanded={expandedIds.has(doc.id)}
              deleting={deletingId === doc.id}
              onToggle={() => toggleExpanded(doc.id)}
              onEdit={() => setEditingDoc({ ...doc })}
              onDelete={() => remove(doc)}
            />
          ))}
        </div>
      ) : null}

      {editingDoc ? (
        <EditPlanDocModal
          doc={editingDoc}
          saving={savingDocId === editingDoc.id}
          onChange={setEditingDoc}
          onClose={() => setEditingDoc(null)}
          onSave={saveEdit}
        />
      ) : null}
    </div>
  );
}

function PlanDocTile({
  doc,
  expanded,
  deleting,
  onToggle,
  onEdit,
  onDelete,
}: {
  doc: LibraryImage;
  expanded: boolean;
  deleting: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const isPdf = doc.storage_path?.toLowerCase().endsWith(".pdf") ?? false;

  const details = [
    { label: "Type", value: isPdf ? "PDF" : "Image" },
    { label: "Visibility", value: planDocVisibilityLabel(doc.visibility) },
    { label: "Primary", value: doc.is_primary ? "Yes" : "No" },
  ];

  return (
    <article className="card management-image-card selection-card">
      <div className="management-image-media selection-card-image">
        {doc.is_primary ? <span className="selection-card-room-badge">Primary</span> : null}
        {isPdf && doc.imageUrl ? (
          <PdfThumbnail url={doc.imageUrl} />
        ) : doc.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={doc.imageUrl} alt="" />
        ) : (
          <div className="plan-doc-media-placeholder">
            <IconPhoto size={28} />
          </div>
        )}
      </div>
      <div className="management-image-body">
        <button className="management-image-summary" type="button" onClick={onToggle} aria-expanded={expanded}>
          <span className="management-image-copy">
            <span className="selection-card-topline">
              <span className="badge badge-phase">{isPdf ? "PDF" : "Image"}</span>
            </span>
            <span className="selection-card-title">{planDocVisibilityLabel(doc.visibility)}</span>
          </span>
          <IconChevronDown className={expanded ? "management-image-chevron-expanded" : ""} size={16} />
        </button>
        {expanded ? (
          <div className="management-image-details selection-card-expanded">
            {details.map((item) => (
              <div className="selection-card-detail-row" key={item.label}>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </div>
            ))}
            <div className="dashboard-actions justify-end">
              <button className="btn btn-secondary btn-sm" type="button" onClick={onEdit}>
                Edit
              </button>
              <ConfirmDeleteButton iconOnly onConfirm={onDelete} disabled={deleting} />
            </div>
          </div>
        ) : null}
      </div>
    </article>
  );
}

function EditPlanDocModal({
  doc,
  saving,
  onChange,
  onClose,
  onSave,
}: {
  doc: LibraryImage;
  saving: boolean;
  onChange: (doc: LibraryImage) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  return (
    <div className="bb-modal" role="dialog" aria-modal="true" aria-labelledby="edit-plan-doc-title">
      <button className="bb-modal-backdrop" type="button" aria-label="Close" onClick={onClose} />
      <section className="bb-modal-panel">
        <div className="bb-modal-header">
          <div>
            <h2 id="edit-plan-doc-title" className="dashboard-title">Edit document</h2>
            <p className="dashboard-subtitle">Update visibility and primary status.</p>
          </div>
          <button className="btn-icon" type="button" aria-label="Close" onClick={onClose} disabled={saving}>
            <IconX size={16} />
          </button>
        </div>
        <div className="bb-modal-body">
          <div className="form-group">
            <label className="form-label">Visibility</label>
            <select
              className="form-select"
              value={doc.visibility ?? "public"}
              onChange={(e) => onChange({ ...doc, visibility: e.target.value })}
            >
              <option value="public">Public</option>
              <option value="followers">Followers only</option>
              <option value="private">Private</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Primary document</label>
            <div className="choice-grid">
              {([true, false] as const).map((val) => (
                <button
                  key={String(val)}
                  type="button"
                  className={`choice-card choice-card-left ${(doc.is_primary ?? false) === val ? "choice-card-active" : ""}`}
                  onClick={() => onChange({ ...doc, is_primary: val })}
                >
                  <div className="choice-title">{val ? "Primary" : "Not primary"}</div>
                  <div className="choice-desc">{val ? "Featured at the top of this section" : "Standard document"}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="bb-modal-footer">
          <button className="btn btn-secondary" type="button" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <LoadingButton className="btn btn-primary" loading={saving} onClick={onSave}>
            Save
          </LoadingButton>
        </div>
      </section>
    </div>
  );
}

function planDocVisibilityLabel(visibility: string | null | undefined) {
  switch (visibility) {
    case "followers": return "Followers only";
    case "private": return "Private";
    default: return "Public";
  }
}

function SectionIntro({ icon, title, copy }: { icon: ReactNode; title: string; copy: string }) {
  return (
    <div className="editor-section-intro">
      <span className="editor-section-icon">{icon}</span>
      <div>
        <h2>{title}</h2>
        <p>{copy}</p>
      </div>
    </div>
  );
}

function MetricInput({ icon, label, value, onChange }: { icon: string; label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="editor-metric-field">
      <span className="editor-metric-icon">
        <img src={icon} alt="" />
      </span>
      <span className="editor-metric-copy">
        <span>{label}</span>
        <input type="number" min="0" value={value} onChange={(event) => onChange(event.target.value)} />
      </span>
    </label>
  );
}

function StyledInput({ icon, label, value, onChange, placeholder, type = "text" }: { icon: ReactNode; label: string; value: string; onChange: (value: string) => void; placeholder?: string; type?: string }) {
  return (
    <label className="editor-styled-field">
      <span className="editor-styled-icon">{icon}</span>
      <span className="editor-styled-copy">
        <span>{label}</span>
        <input type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
      </span>
    </label>
  );
}
