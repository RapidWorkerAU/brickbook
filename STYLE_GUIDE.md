# Brickbook - Style Guide & Component Reference

This document is the single source of truth for all visual decisions on Brickbook.
Codex must follow this guide when building every page and component.
Do not deviate from these decisions without explicit instruction.

---

## Stack

- Next.js (App Router)
- Tailwind CSS - config at `tailwind.config.ts`
- Global styles - `src/app/globals.css`
- Icons - Tabler Icons (`@tabler/icons-react`)
- Fonts - Inter (Google Fonts, loaded in globals.css)

---

## Colour Palette

| Token              | Hex       | Usage |
|--------------------|-----------|-------|
| `bb-black`         | `#1C1917` | Primary text, primary buttons, nav logo |
| `bb-white`         | `#FFFFFF` | Card backgrounds, input backgrounds |
| `stone-50`         | `#F7F5F2` | Page background, card footers, table headers |
| `stone-100`        | `#EDE9E4` | Subtle dividers, skeleton loaders |
| `stone-200`        | `#D6D0C8` | Borders, dividers |
| `stone-400`        | `#A09890` | Placeholder text, muted icons, secondary labels |
| `stone-600`        | `#6B6460` | Secondary text, nav links, form hints |
| `stone-800`        | `#3A3530` | Form labels, strong secondary text |
| `bb-amber`         | `#C17A3A` | Accent - follow button, links, notification dots, active states |
| `bb-amber-light`   | `#F5ECD8` | Amber badge backgrounds, text selection |
| `bb-amber-dark`    | `#8C5420` | Amber badge text |
| `bb-green`         | `#2E7D52` | Success states, complete badges |
| `bb-green-light`   | `#E8F5EE` | Success alert backgrounds |
| `bb-red`           | `#C0392B` | Error states, danger buttons |
| `bb-red-light`     | `#FDECEA` | Error alert backgrounds |
| `bb-blue`          | `#1A56A0` | Info states, listed badges |
| `bb-blue-light`    | `#E8F0FB` | Info alert backgrounds |

**Rules:**
- Page background is always `stone-50`, never white
- Card backgrounds are always `white`
- Never use pure black (`#000`) - use `bb-black` (`#1C1917`)
- The amber accent is used sparingly - primary CTAs, follow actions, active indicators only
- Never use colour for decoration - it must encode meaning

---

## Typography

| Role     | Size  | Weight | Class / Usage |
|----------|-------|--------|---------------|
| Display  | 28px  | 600    | Landing page hero headlines only |
| H1       | 22px  | 600    | Page titles |
| H2       | 18px  | 600    | Section headings |
| H3       | 15px  | 600    | Card titles, sub-section headings |
| Body     | 14px  | 400    | All paragraph and content text |
| Small    | 12px  | 400    | Meta, captions, secondary info |
| Label    | 11px  | 500    | Form labels, section eyebrows (uppercase + tracking) |
| Micro    | 10px  | 600    | Badge text, table headers (uppercase + tracking) |

**Rules:**
- Font is always Inter
- Sentence case everywhere - never ALL CAPS in UI copy (labels and badges excepted)
- Line height: headings 1.2, body 1.6
- Letter spacing: -0.02em on display, -0.01em on h1, 0.06-0.1em on uppercase labels
- Never use font-weight 700 or above - max is 600

---

## Spacing

Use Tailwind's default 4px base scale. Key landmarks:

| Value | px  | Usage |
|-------|-----|-------|
| 1     | 4px | Tight inline gaps |
| 2     | 8px | Icon-to-label gaps, badge padding |
| 3     | 12px | Form element internal padding |
| 4     | 16px | Card body padding |
| 5     | 20px | Section internal spacing |
| 6     | 24px | Page horizontal padding |
| 8     | 32px | Between major sections |
| 12    | 48px | Large section gaps |
| 16    | 64px | Hero padding |

---

## Border Radius

| Token   | Value | Usage |
|---------|-------|-------|
| `sm`    | 4px   | Badges, pills, small chips |
| `md`    | 6px   | Buttons, inputs, selects, small cards |
| `lg`    | 10px  | Cards, panels, modals |
| `xl`    | 14px  | Large modals, drawers |
| `full`  | 9999px | Avatars, toggle switches |

---

## Borders

- All borders use `0.5px` width - never 1px on decorative borders
- Default border colour: `stone-200`
- Hover border colour: `stone-300`
- Focus border colour: `bb-black`
- Error border colour: `bb-red`
- Success border colour: `bb-green`

---

## Shadows

- Cards: no shadow - use borders instead
- Focus states: `0 0 0 3px rgba(28, 25, 23, 0.08)` (black focus ring)
- Amber focus: `0 0 0 3px rgba(193, 122, 58, 0.2)` (for amber-accented inputs)
- Never use decorative drop shadows

---

## Buttons

Always use the `.btn` base class plus a variant. Import from globals.css.

```tsx
// Primary - main CTAs
<button className="btn btn-primary">Start your build</button>

// Secondary - secondary actions
<button className="btn btn-secondary">View profile</button>

// Accent - follow, like, social actions
<button className="btn btn-accent">Follow</button>

// Ghost - tertiary, nav-adjacent actions
<button className="btn btn-ghost">Cancel</button>

// Danger - destructive actions
<button className="btn btn-danger">Delete build</button>

// Sizes
<button className="btn btn-primary btn-sm">Small</button>
<button className="btn btn-primary btn-lg">Large</button>

// Icon-only
<button className="btn-icon" aria-label="Edit">
  <IconEdit size={16} />
</button>

// Disabled
<button className="btn btn-primary" disabled>Saving...</button>
```

**Rules:**
- Always include descriptive `aria-label` on icon-only buttons
- Loading state: replace label with `<Spinner />` + "Saving..." text
- Destructive actions must use `btn-danger` and require confirmation
- Follow/unfollow toggles use `btn-accent` (following) and `btn-secondary` (follow)

---

## Badges

```tsx
<span className="badge badge-phase">Brickwork</span>
<span className="badge badge-active">In progress</span>
<span className="badge badge-complete">Complete</span>
<span className="badge badge-listed">Listed</span>
<span className="badge badge-private">Private</span>
<span className="badge badge-new">New</span>
<span className="badge badge-featured">Featured</span>

// Pills (softer, for filters and tags)
<span className="pill">Ellenbrook</span>
```

---

## Forms

```tsx
<div className="form-group">
  <label className="form-label">Build title</label>
  <input className="form-input" type="text" placeholder="e.g. Our Hills Pavilion" />
  <p className="form-hint">This is the public name for your build.</p>
</div>

// Error state
<input className="form-input form-input-error" type="text" />
<p className="form-error">This field is required.</p>

// Success state
<input className="form-input form-input-success" type="text" />

// Select
<select className="form-select">...</select>

// Textarea
<textarea className="form-textarea" rows={4} />
```

**Rules:**
- Labels always above the input, never placeholder-only
- Always show hint text for non-obvious fields
- Error messages below the input, in red, with an icon where space allows
- Character counts shown for textarea fields (e.g. update captions, bios)
- Required fields marked with a red asterisk in the label: `Build title *`

---

## Cards

```tsx
// Generic card
<div className="card">
  <div className="card-body">...</div>
  <div className="card-footer">...</div>
</div>

// Build card (discovery grid)
<div className="build-card">
  <div className="relative h-36 bg-stone-200">...</div>
  <div className="p-3">
    <span className="badge badge-phase">Brickwork</span>
    <h3 className="text-[13px] font-semibold mt-1">Our Hills Pavilion</h3>
    <p className="text-[11px] text-stone-400 mt-0.5">Gidgegannup  -  Nulook Homes</p>
  </div>
  <div className="flex justify-between px-3 py-2 border-t border-stone-100">
    <span className="text-[11px] text-stone-400">142 followers</span>
    <span className="text-[11px] text-stone-400">Wk 14</span>
  </div>
</div>

// Update card (feed)
<div className="update-card">...</div>
```

---

## Tables

```tsx
<div className="card">
  <table className="bb-table">
    <thead>
      <tr>
        <th>Build</th>
        <th>Builder</th>
        <th>Phase</th>
        <th>Status</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td className="font-medium">Our Hills Pavilion</td>
        <td className="text-stone-600">Nulook Homes</td>
        <td><span className="badge badge-active">Brickwork</span></td>
        <td><span className="badge badge-listed">Listed</span></td>
      </tr>
    </tbody>
  </table>
</div>
```

---

## Alerts

```tsx
<div className="alert alert-success">
  <IconCircleCheck size={16} className="flex-shrink-0 mt-0.5" />
  Update posted successfully.
</div>

<div className="alert alert-error">...</div>
<div className="alert alert-warning">...</div>
<div className="alert alert-info">...</div>
```

---

## Avatars

```tsx
// Sizes: avatar-sm (28px), avatar-md (36px), avatar-lg (48px), avatar-xl (64px)
// Colours: avatar-stone (grey), avatar-amber (warm)

<div className="avatar avatar-md avatar-amber">LB</div>

// Stacked group
<div className="flex">
  <div className="avatar avatar-md avatar-stone border-2 border-white -mr-2 z-[3]">A</div>
  <div className="avatar avatar-md avatar-amber border-2 border-white -mr-2 z-[2]">B</div>
  <div className="avatar avatar-md avatar-stone border-2 border-white z-[1]">+8</div>
</div>
```

---

## Loading States

```tsx
// Skeleton loader
<div className="skeleton h-36 w-full rounded-t-lg" />
<div className="skeleton skeleton-text w-1/2 mt-3" />
<div className="skeleton skeleton-text w-3/4" />

// Spinner
<div className="spinner" />
<div className="spinner spinner-sm" />
```

---

## Empty States

```tsx
<div className="empty-state">
  <div className="empty-state-icon">
    <IconBuildingCommunity size={32} />
  </div>
  <h3 className="empty-state-title">No builds yet</h3>
  <p className="empty-state-sub">Start documenting your build and share it with the community.</p>
  <button className="btn btn-primary btn-sm">
    <IconPlus size={14} />
    Create your build
  </button>
</div>
```

---

## Navigation

```tsx
// Top nav
<nav className="bg-white border-b border-stone-200 h-13 flex items-center justify-between px-6">
  <span className="text-[12px] font-bold tracking-[0.14em] uppercase">Brickbook</span>
  <div className="flex gap-5">
    <Link className="nav-link" href="/discover">Discover</Link>
    <Link className="nav-link nav-link-active" href="/builders">Builders</Link>
  </div>
  <div className="flex gap-2.5 items-center">
    <Link className="nav-link" href="/get-started">Sign in</Link>
    <button className="btn btn-primary btn-sm">Start your build</button>
  </div>
</nav>
```

---

## Tabs

```tsx
<div className="flex border-b border-stone-200">
  <button className="tab tab-active">Updates</button>
  <button className="tab">Timeline</button>
  <button className="tab">Images</button>
  <button className="tab">Selections</button>
</div>
```

---

## Icons

Use `@tabler/icons-react` exclusively. Always use outline variants.

```tsx
import { IconPlus, IconHeart, IconMessageCircle } from '@tabler/icons-react'

// Standard sizes
// 14px - inside buttons (sm)
// 16px - inline with text, inside buttons (default)
// 20px - standalone action icons
// 24px - empty state icons (use text-stone-200 colour)
// 32px - empty state decorative icons

<IconPlus size={16} />
```

---

## Page Layout

```tsx
// Full-width page with max-width container
<main className="page-container py-8">...</main>

// Narrow content (forms, onboarding, auth)
<main className="page-container-narrow py-12">...</main>

// Two-column layout (feed + sidebar)
<div className="grid grid-cols-[1fr_280px] gap-0 border-t border-stone-200">
  <div className="border-r border-stone-200 p-6">Feed</div>
  <div className="p-5">Sidebar</div>
</div>
```

---

## Animations

| Class            | Usage |
|------------------|-------|
| `animate-shimmer` | Skeleton loaders |
| `animate-spin`    | Spinner |
| `animate-fade-in` | Page transitions, modal entry |
| `animate-slide-down` | Dropdown menus, toast notifications |

---

## Do / Don't

| Do | Don't |
|----|-------|
| Use `stone-50` as the page background | Use white as the page background |
| Use `0.5px` borders | Use `1px` borders on decorative elements |
| Use sentence case in UI copy | Use Title Case or ALL CAPS in body copy |
| Keep amber for interactive/accent use | Use amber for decoration |
| Show skeleton loaders during data fetch | Show empty states during loading |
| Use dashed borders for empty states | Use solid borders for empty states |
| Confirm before destructive actions | Allow destructive actions without confirmation |
| Use `form-input` class on all inputs | Style inputs inline |
| Always label form fields | Use placeholder text as the only label |

