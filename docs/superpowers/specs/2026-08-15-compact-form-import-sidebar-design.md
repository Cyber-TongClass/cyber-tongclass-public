# Compact Form Import Sidebar Design

## Goal

Make manual form creation the primary task on `/forms/manage/new`, while retaining Word and Excel as easy-to-find secondary shortcuts that no longer consume most of the first viewport.

## Layout

- On wide screens, use a two-column layout: the existing form setup remains in the main column and a 19–20rem quick-import rail sits to its right.
- The rail contains a short heading followed by compact Word and Excel import blocks. It may remain sticky while the editor scrolls.
- On narrower screens, stack the compact quick-import group before the long manual editor so both file entry points remain immediately findable.
- The new-form page widens from the current four-column content measure so the main editor does not become cramped when the rail appears.

## Component behavior

- `OADocumentImport` gains a compact presentation that keeps the icon, title, one-line explanation, upload button, loading state, and error state while omitting MIME implementation details.
- `OASpreadsheetNewFormImport` gains a compact presentation for its initial upload state. After analysis, its existing sheet, field, and creation controls remain available inside the rail with overflow-safe layout.
- Import logic, authentication, draft creation, analysis, and routing remain unchanged.

## Verification

- Source regression tests assert the wide-screen sidebar, responsive stacking, compact component variants, and wider new-form container.
- Run focused import tests, ESLint, TypeScript, and a desktop/mobile browser pass.
