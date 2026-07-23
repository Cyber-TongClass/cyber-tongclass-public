# Academic Exchange PDF Template Redesign

## Goal

Replace the current plain programmatic layout used for academic-exchange and outbound-study support applications with the supplied Beijing University Tong Class application-form design, without changing any Convex functions or download endpoints.

## Chosen approach

Store the supplied blank A4 PDF as a public deployment asset and load it in `buildAcademicExchangePdf`. The generator will draw each application value into the corresponding blank area, using the existing bundled Source Han Sans font for user-provided text. This preserves the visual fidelity of the approved template and avoids browser dependencies in server-side PDF generation.

## Data mapping

The first page maps applicant name, student ID, gender, phone, email, project name, project category, project time, exchange location, funding source, project plan, itemized expenses, and total amount into the template. Paper-backed applications populate the paper-and-affiliation field and retain the current appended paper PDF. Outbound-study (`出境访学`) applications render `出境访学无需关联论文` in that field and `附件材料：无` in the note area.

The template does not have a persisted official serial-number field. The generated display number will use the application date plus a safe suffix of the existing record ID, avoiding a misleading fabricated sequence.

## Overflow and error behavior

The template's first page has six expense rows. Values are wrapped and font-fitted within their cells; any further expense items are written to a titled continuation page so no data is omitted. The template loader throws a clear error if the deployed PDF asset is missing. Existing paper-PDF fetching, host allowlisting, and attachment concatenation remain unchanged.

## Validation

A focused executable test will bundle the TypeScript generator, build representative outbound-study and paper-backed application PDFs, verify the template asset, resulting page counts, and extracted values. A rendered sample will be compared visually against the supplied design, and the existing paper-PDF source checks will remain green.

## Scope boundary

Only the export template asset, `src/lib/server/academic-exchange-pdf.ts`, and focused test/docs files change. No Convex code, endpoint contracts, package scripts, or unrelated working-tree changes are modified.
