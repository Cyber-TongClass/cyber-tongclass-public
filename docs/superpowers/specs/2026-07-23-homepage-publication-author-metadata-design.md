# Homepage Publication Author Metadata Rendering Design

## Goal

Prevent the homepage research-results section from exposing URL-encoded `tc-author` metadata to visitors.

## Architecture

Publication author strings already use `parsePublicationAuthor` in `src/lib/publication-authors.ts` to decode the metadata stored after each display name. The homepage will render the existing `PublicationAuthorsList` component rather than joining or displaying the raw author strings. This keeps all publication views consistent without changing Convex data or APIs.

## Rendering behavior

For every homepage publication, the author line will display only the decoded author names, comma-separated. Tong Class authors keep their member links, while co-first and corresponding author metadata retain the existing visual markers supplied by `PublicationAuthorsList`.

## Error handling

Malformed or legacy author values remain safe: the shared parser falls back to the trimmed original value when metadata cannot be decoded. No migration or backend modification is required.

## Verification

Add a focused regression test for rendering encoded metadata through the homepage publication presentation path, observe it fail before the change, then pass after the change. Run the relevant test and the repository lint command.
