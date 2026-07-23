# Tong Class Academic Exchange Application Form HTML Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a print-faithful, editable, standalone HTML copy of the supplied academic-exchange application-form PDF.

**Architecture:** A single file under `public/intranet-materials/` holds the semantic form, all CSS, and the source page converted to inline vector SVG paths. Transparent editable overlays cover blank fields. A small Node test reads that file and asserts the permanent visual and structural contract; visual verification uses a headless-Chrome screenshot plus the rendered PDF reference.

**Tech Stack:** HTML5, inline SVG, CSS print media rules, Node.js assertions, headless Chrome, Poppler, ImageMagick.

---

### Task 1: Define an executable form contract

**Files:**
- Create: `scripts/test-tongclass-application-form-html.mjs`
- Test: `scripts/test-tongclass-application-form-html.mjs`

- [ ] **Step 1: Write the failing test**

```js
import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"

const html = await readFile(new URL("../public/intranet-materials/北京大学通班学术交流支持申请表.html", import.meta.url), "utf8")
assert.match(html, /@page\s*\{\s*size:\s*A4/)
assert.match(html, /北京大学通班学术交流支持/)
assert.equal((html.match(/class="expense-row"/g) || []).length, 6)
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node scripts/test-tongclass-application-form-html.mjs`

Expected: failure because `public/intranet-materials/北京大学通班学术交流支持申请表.html` does not yet exist.

### Task 2: Build the standalone A4 form

**Files:**
- Create: `public/intranet-materials/北京大学通班学术交流支持申请表.html`
- Test: `scripts/test-tongclass-application-form-html.mjs`

- [ ] **Step 1: Add fixed A4 and print rules**

```css
@page { size: A4; margin: 0; }
.page { width: 210mm; min-height: 297mm; }
@media print { body { margin: 0; } .page { box-shadow: none; } }
```

- [ ] **Step 2: Embed the source page as inline vector artwork and add editable fields**

Convert the supplied PDF page with Poppler's SVG backend and embed the resulting SVG paths inside the HTML, keeping the A4 viewBox unchanged. Add semantic sections for `个人信息`, `项目信息`, and `支出明细`; give the expense table six rows marked `class="expense-row"`, and overlay the blank value cells with `contenteditable="true"`.

- [ ] **Step 3: Run the contract test**

Run: `node scripts/test-tongclass-application-form-html.mjs`

Expected: exit code 0 and the message `Academic exchange application-form HTML checks passed.`

### Task 3: Render and compare the page

**Files:**
- Verify: `public/intranet-materials/北京大学通班学术交流支持申请表.html`
- Verify: `tmp/pdfs/tongclass-reference-1.png`

- [ ] **Step 1: Render the HTML through Playwright**

Run: `'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' --headless=new --force-device-scale-factor=1.5 --window-size=794,1123 --screenshot=tmp/pdfs/tongclass-html.png file:///Users/photonyan/Desktop/cyber-tongclass-public/public/intranet-materials/北京大学通班学术交流支持申请表.html`

- [ ] **Step 2: Inspect dimensions and major horizontal/vertical line positions**

Run: `identify tmp/pdfs/tongclass-html.png tmp/pdfs/tongclass-reference-1.png`

Expected: the same A4 portrait aspect ratio and table start/end positions within a few rendered pixels after scaling.

- [ ] **Step 3: Make CSS-only adjustments and repeat the screenshot until title/table positioning, borders, and text hierarchy match the source**

Run: `node scripts/test-tongclass-application-form-html.mjs`

Expected: the structural test still exits 0 after each adjustment.
