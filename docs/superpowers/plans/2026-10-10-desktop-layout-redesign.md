# Desktop Multi-Column Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the multi-column tactile desktop interface ("Painel de Rádio") for $\ge 1024\text{px}$ viewports with top navigation header, 3D folded parked left feed, reactive right sidebar (filters/info), while keeping mobile mode untouched.

**Architecture:** Create an isolated orchestrator `DesktopStage.tsx` that manages the 3-slot layout on $\ge 1024\text{px}$, integrating with the existing state and data feeds in `src/app/page.tsx`. Use accelerated CSS transforms for the 3D perspective fold on the left slot and seamless restoration on click or escape.

**Tech Stack:** Next.js 15 (App Router), React 19, Tailwind CSS v4, Lucide/Heroicons (where existing), TypeScript.

**Spec:** [docs/superpowers/specs/2026-10-10-desktop-layout-redesign-design.md](file:///Users/rodrigomatos/Documents/guarapuava/docs/superpowers/specs/2026-10-10-desktop-layout-redesign-design.md)

## Global Constraints

- Retain 100% of mobile behavior and visuals on viewports $< 1024\text{px}$ (`Dock` with 4 keys intact).
- All surfaces use `var(--color-canvas)` with tactile neumorphic shadows (`shadow-raised-md`, `shadow-raised-lg`, `shadow-inset`).
- Follow the design system strictly: all buttons use `Key`, active buttons use `pressed` / `aria-current="page"`.
- Support Dark Mode and Light Mode with zero visual breakage or hardcoded colors.

## Review Focus

- Viewport resizing between mobile (<1024px) and desktop ($\ge 1024\text{px}$) preserves current navigation state without layout jumping.
- Opening a news day or job detail on desktop slides feed to left slot with 3D perspective (`rotateY(-8deg)`), and clicking left slot restores feed to center with saved scroll position.
- Clicking "Informações" in the top-right replaces the right filter panel with Info content; clicking center or left slot immediately dismisses Info and restores filters.
- Keyboard navigation: `Escape` key cleanly restores left feed to center or closes Info panel.
- Filter synchronization: Filters on the right column update items in the center view in real-time.

---

### Task 1: CSS Tokens and 3D Perspective Utilities for Desktop Stage

**Files:**
- Modify: `src/app/globals.css`

**Interfaces:**
- Produces: CSS utility classes `.desktop-perspective-container`, `.desktop-parked-panel`, `.desktop-stage-center`, and responsive height/scrollbar rules.

- [ ] **Step 1: Add 3D perspective and stage styling rules to `src/app/globals.css`**
  Add keyframes, perspective container rules (`perspective: 1200px`), `.desktop-parked-panel` (`transform: rotateY(-8deg) scale(0.96) translateZ(-16px)`, `transform-origin: right center`, smooth hover easing, cursor pointer), and dark mode adjustments.
- [ ] **Step 2: Verify CSS builds without syntax errors**
  Run: `npm run build` or check dev server output to ensure Tailwind v4 processes the CSS classes without errors.
- [ ] **Step 3: Commit**
  ```bash
  git add src/app/globals.css
  git commit -m "style: add 3D perspective utilities for desktop multi-column stage"
  ```

---

### Task 2: Build `DesktopStage` Component

**Files:**
- Create: `src/components/desktop/DesktopStage.tsx`
- Component Props:
  - `activeTab`: `"noticias" | "vagas"`
  - `onSelectTab`: `(tab: "noticias" | "vagas") => void`
  - `isDetailOpen`: `boolean`
  - `onCloseDetail`: `() => void`
  - `slotLeft`: `React.ReactNode` (the parked feed preview)
  - `slotCenter`: `React.ReactNode` (the main active feed or detail)
  - `slotRightFilter`: `React.ReactNode` (the active filter panel)
  - `slotRightInfo`: `React.ReactNode` (the info panel content)

- [ ] **Step 1: Implement `DesktopStage.tsx`**
  - Implement top header with:
    - 2 keys over the center column: "Notícias" and "Vagas" (active tab shows `pressed`).
    - 3 keys over the right column: "Teste", "Informações" (toggleable), "Modo claro / escuro" (connected to `useTheme`).
  - Implement 3 columns:
    - Left column: rendered inside `.desktop-perspective-container`, displaying `slotLeft` when `isDetailOpen` is true with click-to-restore handler and hover cues.
    - Center column: displaying `slotCenter` (feed or detail) with smooth layout centering when no detail is open.
    - Right column: fixed width (360-380px), displaying either `slotRightInfo` (when info is active) or `slotRightFilter` (default).
  - Implement outside click / center click dismissal for info panel.
- [ ] **Step 2: Verify TypeScript types and compilation**
  Run: `npx tsc --noEmit`
- [ ] **Step 3: Commit**
  ```bash
  git add src/components/desktop/DesktopStage.tsx
  git commit -m "feat: create DesktopStage component for multi-column layout"
  ```

---

### Task 3: Integrate `DesktopStage` into `src/app/page.tsx`

**Files:**
- Modify: `src/app/page.tsx`

**Interfaces:**
- Consumes: `DesktopStage` from `src/components/desktop/DesktopStage.tsx`
- Coordinates: Data from Supabase/cache, filters, search queries, active views (`home`, `details`, `vagas`, `vaga-detail`, `info`), and browser history popstate.

- [ ] **Step 1: Wire desktop vs mobile rendering in `src/app/page.tsx`**
  - Keep mobile rendering inside a container with `lg:hidden` (or conditional viewport/responsive shell) preserving exact current mobile UI.
  - Add desktop rendering inside `hidden lg:flex` using `DesktopStage`:
    - Pass active news feed or job feed as center when no detail is open.
    - When `view === "details"` or `view === "vaga-detail"`, pass previous feed to `slotLeft` and current detail to `slotCenter`.
    - Pass news filters or job filters to `slotRightFilter`.
    - Pass `InfoFeed` content to `slotRightInfo`.
    - Wire `onCloseDetail` to return to `home` or `vagas` and restore scroll position.
- [ ] **Step 2: Ensure keyboard and popstate handling on desktop**
  - Ensure `Escape` restores left feed to center or closes Info panel.
  - Ensure hash navigation (`#noticia-...` and `#vaga-...`) synchronizes both desktop and mobile states.
- [ ] **Step 3: Run TypeScript verification**
  Run: `npx tsc --noEmit`
- [ ] **Step 4: Commit**
  ```bash
  git add src/app/page.tsx
  git commit -m "feat: integrate desktop stage layout in main page"
  ```

---

### Task 4: Interactive Verification with Browser Subagent

**Files:**
- Test via Playwright browser subagent on local dev server (`http://localhost:3000`).

- [ ] **Step 1: Test Desktop Viewport ($\ge 1024\text{px}$, e.g. 1280x800)**
  - Verify top header shows 2 tabs (Notícias, Vagas) and 3 right buttons (Teste, Informações, Modo Claro/Escuro).
  - Verify bottom dock is hidden.
  - Verify filter panel appears on the right column.
- [ ] **Step 2: Test 3D perspective and column slide**
  - Click on a news day or job card.
  - Verify feed slides to the left column with 3D perspective tilt (`rotateY`).
  - Verify detail opens in the center column.
  - Click on the left tilted column: verify feed returns to center and detail closes.
- [ ] **Step 3: Test Informações panel**
  - Click "Informações" in top right: verify info opens in the right column replacing filters.
  - Click the center feed: verify info closes and filters reappear.
- [ ] **Step 4: Test Mobile Viewport (390x844)**
  - Resize to mobile: verify the original 1-column layout with 4-button `Dock` at the bottom remains fully functional.
- [ ] **Step 5: Commit any final refinements**
  ```bash
  git add .
  git commit -m "test: verify and polish desktop multi-column interactions"
  ```
