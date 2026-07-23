# Tong Class Academic Exchange Application Form HTML Design

## Goal

Recreate the supplied one-page A4 PDF as a standalone HTML document that retains the original title, spacing, tables, line weights, Chinese typography, and print geometry while keeping blank fields editable in the browser.

## Chosen approach

Use one static HTML file in `public/intranet-materials/` with all styles embedded. The page uses a fixed 210 mm by 297 mm print canvas and an inline, PDF-derived vector SVG for every visible static line and glyph; transparent `contenteditable` value cells sit precisely over the blank areas. This preserves the PDF's one-page layout without coupling it to the Next.js application or Convex backend.

## Layout contract

The document preserves the source's 150 mm-wide form at a 32 mm left offset. It contains the centered three-line title block, personal-information table, project-information table, expense table with six blank rows, and attachment note directly from the vector artwork. The editable overlays match the blank-value regions without altering the initial rendering.

## Validation

An executable Node script will assert the static HTML structure, A4 print rule, required labels, editable cells, table counts, and six expense rows. Playwright will render the result at the source page aspect ratio; the image will be visually compared against the PDF raster with ImageMagick measurements for page and table alignment.

## Scope boundary

This adds only the standalone HTML and its focused verification script. It does not modify the existing application, package scripts, Convex backend, or unrelated working-tree changes.
