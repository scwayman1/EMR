# Design Spec: Modern Folio Storybook (EMR-069)

## 1. Objective
Transform the patient portal's "My Story" feature from a static, linear scrolling text block into an interactive, premium "Modern Folio" experience. This design abstracts the concept of a "storybook" into a high-end spatial layout (like a digital editorial magazine), eliminating dated 3D page curls in favor of clean geometry, massive typography, and smooth hardware-accelerated animations.

## 2. Architecture & Components
The implementation will heavily refactor `src/app/(patient)/portal/storybook/storybook-view.tsx` and introduce new subcomponents.

### 2.1. `FolioStorybookView` (Parent Container)
*   **Responsibility:** Manages the active chapter index, handles the "Generate" loading states (which currently exist), and orchestrates the layout.
*   **State:** Tracks `activeChapter` (number).
*   **Layout:** Renders the top navigation bar (containing the `SoundtrackPicker` and the new `ProgressSegments` indicator) and the main `FolioSpread`.

### 2.2. `FolioSpread` (The Core Layout)
*   **Responsibility:** Renders the actual two-pane split screen for the active chapter.
*   **Desktop Layout:** CSS Grid (`grid-cols-2` or similar proportions like `flex-1` / `flex-[1.2]`).
*   **Mobile Layout:** Stacks vertically, with the art pane acting as a hero header and the text flowing below.
*   **Left Pane (The Canvas):** Features dynamic background gradients (shifting based on the chapter index or content), the chapter's designated emoji (rendered massively), the chapter number, and the `heading`.
*   **Right Pane (The Story):** Contains the chapter `body` text. Styled with a massive serif drop-cap using the `first-letter:` CSS pseudo-element to anchor the reading experience.

### 2.3. Progress & Navigation
*   **`ProgressSegments`:** Replaces the text "Chapter 1 of 5". A segmented line (similar to social media stories) at the top of the folio container indicating progress.
*   **Navigation Controls:** Circular, minimalist arrow buttons positioned at the bottom right of the text pane for desktop clicking. 

## 3. Animations & Interactions
*   **Library:** `framer-motion`.
*   **Page Turn Effect:** When navigating between chapters, the component uses `<AnimatePresence mode="wait">`. 
    *   The **Right Pane** (text) slides in sharply from the right (e.g., `x: 100` to `x: 0`).
    *   The **Left Pane** (canvas) uses a soft crossfade (`opacity: 0` to `1`) as the background gradient and text change.
*   **Gestures:** The container will support swipe gestures (`drag="x"`) to advance or go back, providing a tactile, app-like feel on mobile and touch devices.

## 4. Data Flow
*   **Zero Backend Changes:** The backend AI agent (`fairytaleSummaryAgent`) is fully functional. The `FairytaleResult` JSON object (with `title`, `openingLine`, `chapters`, and `closingLine`) will be passed directly into the `FolioStorybookView` state without modification.

## 5. Scope & Rollout
*   **Out of Scope:** We will not modify the backend AI prompts or logic during this phase. Generative AI illustrations are deferred; we will rely on CSS gradients, typography, and existing emojis for the visual canvas.
*   **Rollout:** This is a direct, drop-in replacement for the current `<StorybookView />` component in the Patient Portal.
