# Document Overlay Selection Design

## Goal

Make overlay actions deliberate, dismissible, and visually consistent: edit/delete appears only after clicking a document region and disappears after clicking blank document space.

## State model

- Keep `activeRegionId` for list hover/focus navigation, page jumping, and the field editor.
- Add a separate `selectedRegionId` exclusively for the canvas selection outline, resize handles, and edit/delete toolbar.
- Clicking or starting a drag on a region activates and selects it. Hovering a list item may still navigate to its page but must not open the toolbar.
- Clicking blank document paper or surrounding canvas clears `selectedRegionId`. Changing page, deleting the selected region, drawing a new region, or pressing Escape also clears it.

## Toolbar

- Render only for `selectedRegionId`.
- Position it above the selected rectangle with a stable gap and `w-max whitespace-nowrap` so both actions remain on one line even for a very narrow field.
- Use the existing paper, ink, rule, red, focus, and Lucide icon conventions; keep one subtle elevation and a compact 36px visual height.

## Verification

- Source-contract tests lock state separation, blank-click dismissal, and single-line toolbar styles.
- Browser QA confirms list hover does not open actions, region click does, blank click closes, and toolbar typography remains one line.
