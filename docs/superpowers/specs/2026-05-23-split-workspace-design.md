# EMR-028: Structured 2-Pane Focused Workspace Design Specification

## 1. Overview
The **Structured 2-Pane Focused Workspace** is designed to reduce physician cognitive load by separating read-only reference context (Left Pane) from interactive documentation and order entry forms (Right Pane). Instead of open-ended Bloomberg-style grid splits or chaotic browser-style tab bars (which lead to visual noise and tab fatigue), this design provides a structured layout: a single active focus panel paired with an on-demand contextual reference panel.

---

## 2. Requirements & UX Flow
* **Left Pane (Context/Read-Only)**:
  * Contains patient vitals, medical history, labs, outcomes, or the AI Assistant/Library.
  * Hosted inside a tabbed header enabling rapid swapping between contexts without losing the active state of the right-hand action form.
  * Completely collapsible to maximize active typing space.
* **Right Pane (Action/Interactive)**:
  * Hosts the primary clinical work (SOAP note editor, prescription composer, treatment plan forms).
  * Remains anchored as the primary target of keyboard interactions.
* **Divider & Resizing**:
  * Resizable divider between the left and right panes.
  * Collapsing: A toggle icon button in the divider collapses the Left Pane down to `0px` in width. Clicking it again restores it to the previous width.
  * State Persistence: Pinned state, collapsed state, and divider width are preserved in `localStorage` under `workspace:splitPaneCollapsed` and `workspace:splitPaneWidth`.

---

## 3. Architecture & Components
We will implement the split-pane layout utilizing standard React components, avoiding heavy external window manager dependencies.

### Proposed Component Structure
```
src/components/shell/SplitWorkspace.tsx   <-- Container component managing pane states
├── src/components/shell/ContextPane.tsx   <-- Left Pane component with tab bar
└── src/components/shell/ActionPane.tsx    <-- Right Pane component hosting active forms/notes
```

### Component Definition (`SplitWorkspace.tsx`)
* **State**:
  * `collapsed`: `boolean` (default: `false` or loaded from `localStorage`)
  * `paneWidth`: `number` (width of the left pane in pixels, default: `350px`)
  * `activeTab`: `string` (active tab in the context pane, e.g. `'vitals'`)
* **Layout**:
  * Standard CSS grid or flexbox layout.
  * Transitions: Clean CSS transition (`transition-all duration-200`) when toggling collapsed state.

---

## 4. Testing Plan
* **Unit Tests**:
  * Verify state persistence hooks for split width and collapsed states.
  * Verify that collapsing the context pane sets its width to `0px` and extends the action pane to 100%.
* **E2E Tests**:
  * Verify divider click toggles visibility of the context pane.
  * Verify switching between Left Pane tabs preserves Right Pane textarea inputs.
