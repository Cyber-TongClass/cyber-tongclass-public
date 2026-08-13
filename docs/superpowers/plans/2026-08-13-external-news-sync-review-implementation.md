# External News Sync and Review Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Discover the four fixed PKU AIA public-site columns hourly, create deduplicated internal news drafts in observation/draft mode, route them to explicitly assigned `news.canReview` users, and require the existing `news.canManage` publication approval before anything becomes visible.

**Architecture:** A fixed-host Convex action fetches four isolated HTML adapters, converts only an allowlisted subset to safe Markdown, and hands normalized snapshots to one atomic ingest mutation. The ingest ledger and immutable source snapshots preserve URL/hash idempotency and expose remote updates without overwriting internal edits. Existing content submissions and review tasks gain an explicit `source_review` stage before their existing `publication_approval` stage; scope resolution is reused and recipients are intersected with active news reviewers when the task snapshot is created.

**Tech Stack:** Next.js App Router, React 18, TypeScript, Convex queries/mutations/actions/crons, Web Crypto SHA-256, existing OA scope picker/resolver, Tailwind CSS and shadcn/ui, Node.js built-in test runner with TypeScript type stripping.

---

## File map and coordination boundary

The implementation must keep parsing, remote I/O, transactional workflow, and UI rendering separate:

- Create `convex/lib/externalNewsModel.ts` for source keys, URL normalization, SHA-256 input canonicalization, bounded error codes, sync-state reducers, and review-stage transitions. It must not import Convex runtime modules so Node tests can exercise it directly.
- Create `convex/lib/externalNewsHtml.ts` for the small HTML tree/tokenizer, sanitization, Markdown conversion, and shared adapter helpers. It must not perform network I/O.
- Create `convex/lib/externalNewsSources.ts` for the four fixed source descriptors and their isolated list/detail adapters.
- Create `convex/lib/externalNewsFetch.ts` for fixed-host fetch policy, redirect validation, timeout, response-size limiting, and concurrency limiting.
- Create `convex/externalNewsSync.ts` for public super-admin operations, reviewer mutations/queries, scheduled/manual actions, internal fetch result persistence, and atomic draft/task creation.
- Create `convex/crons.ts` for the single hourly discovery registration.
- Create `convex/migrations/externalNewsSourceUrls.ts` for a standalone, manually invoked, idempotent canonical-URL backfill. It must never be called from `dev`, `build`, startup, a cron, or an import.
- Create `convex/test/fixtures/external-news/` and `convex/test/externalNews*.test.ts` for offline parser, security, routing, idempotency, and transition coverage.
- Create `src/components/class-work/external-news-review-desk.tsx` and `src/components/class-work/external-news-draft-editor.tsx` for the review-only queue and source-update-aware editor.
- Create `src/components/platform/external-news-sync-client.tsx` for observation/draft configuration, reviewer routing, source health, and manual sync.
- Create `src/app/class-work/news/review/page.tsx` and `src/app/platform/news-sync/page.tsx` as thin AIA-styled route shells.
- Modify `convex/schema.ts`, `convex/contentReview.ts`, `convex/lib/contentAuthorization.ts`, `src/lib/api.ts`, `src/components/permissions/platform-permissions-client.tsx`, `src/components/permissions/permission-subject-picker.tsx`, `src/components/class-work/class-work-access-guard.tsx`, `src/components/portal/portal-client.tsx`, and `src/config/site-copy.ts` only in serialized integration windows because teacher recognition also owns these shared permission surfaces.
- Modify `convex/news.ts`, `convex/instituteContent.ts`, `convex/lib/instituteDto.ts`, `src/components/content/news-timeline.tsx`, `src/components/content/tong-class-news-timeline.tsx`, `src/components/tong-class/tong-class-home-client.tsx`, `src/components/institute/live-directory-view-model.ts`, and `src/app/tong-class/news/[id]/page.tsx` to make internal detail pages the primary link and the source URL a separate action.

Shared-file order is mandatory: finish and commit the teacher-recognition schema/category work first; rebase or refresh this task; then let the external-news owner make the `canReview` and source-sync additions while preserving the teacher-recognition permission category and fields. No publication, Word-template, or teacher-recognition worker may edit `convex/schema.ts`, `convex/contentReview.ts`, `src/lib/api.ts`, or the two permission components during that window. The coordinator resolves the resulting integration commit before the remaining UI tasks start.

No command in this plan may contain `--prod`, target a deployment whose name contains `silverfish`, or publish/deploy Convex functions. `npx convex dev --local --once` is the only allowed code-generation backend command; the standalone migration is implemented and tested but not executed as part of this plan.

### Task 1: Define source identities, canonical URLs, hashes, and review transitions

**Files:**
- Create: `convex/lib/externalNewsModel.ts`
- Create: `convex/test/externalNewsModel.test.ts`

- [ ] **Step 1: Write the failing model tests**

```ts
import assert from "node:assert/strict"
import test from "node:test"

import {
  canonicalizeExternalNewsUrl,
  decideExternalReview,
  externalNewsIdentity,
  sourceSnapshotHash,
} from "../lib/externalNewsModel.ts"

test("canonical identity removes fragments, tracking parameters, and duplicate slashes", () => {
  const canonical = canonicalizeExternalNewsUrl(
    "https://www.ai.pku.edu.cn//xwgg1/136707.htm?utm_source=wechat&Page=1#top",
  )
  assert.equal(canonical, "https://www.ai.pku.edu.cn/xwgg1/136707.htm?Page=1")
  assert.equal(externalNewsIdentity("news", canonical), `news:${canonical}`)
})

test("canonical identity rejects non-HTTPS and non-AIA hosts", () => {
  assert.throws(() => canonicalizeExternalNewsUrl("http://www.ai.pku.edu.cn/a.htm"), /HTTPS/)
  assert.throws(() => canonicalizeExternalNewsUrl("https://example.com/a.htm"), /来源域名/)
})

test("snapshot hash is stable for equal normalized content and changes with content", async () => {
  const left = await sourceSnapshotHash({ title: "  标题 ", markdown: "正文\r\n", sourcePublishedAt: 1 })
  const right = await sourceSnapshotHash({ title: "标题", markdown: "正文\n", sourcePublishedAt: 1 })
  const changed = await sourceSnapshotHash({ title: "标题", markdown: "新正文\n", sourcePublishedAt: 1 })
  assert.equal(left, right)
  assert.notEqual(left, changed)
  assert.match(left, /^[a-f0-9]{64}$/)
})

test("request changes chooses the actor and skips siblings without completing publication", () => {
  assert.deepEqual(
    decideExternalReview(
      [{ id: "a", status: "pending" }, { id: "b", status: "pending" }],
      "a",
      "request_changes",
    ),
    {
      sourceReviewStatus: "needs_changes",
      nextStage: "source_review",
      taskUpdates: [
        { id: "a", status: "changes_requested" },
        { id: "b", status: "skipped" },
      ],
    },
  )
})

test("accept enters publication approval; reject never enters it", () => {
  assert.equal(decideExternalReview([{ id: "a", status: "pending" }], "a", "accept").nextStage, "publication_approval")
  assert.equal(decideExternalReview([{ id: "a", status: "pending" }], "a", "reject").nextStage, "complete")
})
```

- [ ] **Step 2: Run the model tests and verify the module is missing**

Run: `node --experimental-strip-types --test convex/test/externalNewsModel.test.ts`

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `convex/lib/externalNewsModel.ts`.

- [ ] **Step 3: Implement the pure model contract**

```ts
export const EXTERNAL_NEWS_HOSTS = new Set(["www.ai.pku.edu.cn"])
export type ExternalNewsSourceKey = "news" | "notices" | "research_progress" | "academic_lectures"
export type ExternalNewsFailureCode =
  | "invalid_url" | "blocked_host" | "redirect_blocked" | "timeout"
  | "response_too_large" | "invalid_content_type" | "http_error"
  | "list_parse_failed" | "detail_parse_failed" | "empty_reviewer_set" | "ingest_failed"
export type ExternalNewsReviewDecision = "accept" | "request_changes" | "reject"
export type ExternalNewsReviewTaskStatus = "pending" | "accepted" | "changes_requested" | "rejected" | "skipped"

export function canonicalizeExternalNewsUrl(value: string): string {
  const url = new URL(value)
  if (url.protocol !== "https:") throw new Error("外网新闻来源必须使用 HTTPS")
  if (!EXTERNAL_NEWS_HOSTS.has(url.hostname.toLowerCase())) throw new Error("外网新闻来源域名不在白名单")
  url.hostname = url.hostname.toLowerCase()
  url.hash = ""
  url.pathname = url.pathname.replace(/\/{2,}/g, "/")
  for (const key of [...url.searchParams.keys()]) {
    if (/^(utm_|spm$|from$|source$)/i.test(key)) url.searchParams.delete(key)
  }
  url.searchParams.sort()
  return url.toString().replace(/\?$/, "")
}

export function externalNewsIdentity(sourceKey: ExternalNewsSourceKey, canonicalUrl: string) {
  return `${sourceKey}:${canonicalizeExternalNewsUrl(canonicalUrl)}`
}

export async function sourceSnapshotHash(input: { title: string; markdown: string; sourcePublishedAt?: number }) {
  const normalized = JSON.stringify({
    title: input.title.trim().replace(/\s+/g, " "),
    markdown: input.markdown.replace(/\r\n?/g, "\n").trim(),
    sourcePublishedAt: input.sourcePublishedAt ?? null,
  })
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(normalized))
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("")
}

export function decideExternalReview(
  tasks: readonly { id: string; status: ExternalNewsReviewTaskStatus }[],
  actedTaskId: string,
  decision: ExternalNewsReviewDecision,
) {
  const actor = tasks.find((task) => task.id === actedTaskId)
  if (!actor || !["pending", "changes_requested"].includes(actor.status)) throw new Error("该审阅任务已处理")
  const actedStatus = decision === "accept" ? "accepted" : decision === "reject" ? "rejected" : "changes_requested"
  return {
    sourceReviewStatus: decision === "accept" ? "accepted" as const : decision === "reject" ? "rejected" as const : "needs_changes" as const,
    nextStage: decision === "accept" ? "publication_approval" as const : decision === "reject" ? "complete" as const : "source_review" as const,
    taskUpdates: tasks
      .filter((task) => task.status === "pending" || task.id === actedTaskId)
      .map((task) => ({ id: task.id, status: task.id === actedTaskId ? actedStatus : "skipped" as const })),
  }
}
```

- [ ] **Step 4: Run the model tests and type-check the pure module**

Run: `node --experimental-strip-types --test convex/test/externalNewsModel.test.ts`

Expected: 5 tests PASS.

Run: `npx tsc --noEmit`

Expected: exit 0 without new TypeScript diagnostics.

- [ ] **Step 5: Commit the model boundary**

```bash
git add convex/lib/externalNewsModel.ts convex/test/externalNewsModel.test.ts
git commit -m "test: define external news sync model"
```

### Task 2: Parse and sanitize the four fixed source columns offline

**Files:**
- Create: `convex/lib/externalNewsHtml.ts`
- Create: `convex/lib/externalNewsSources.ts`
- Create: `convex/test/externalNewsSources.test.ts`
- Create: `convex/test/fixtures/external-news/news-list.html`
- Create: `convex/test/fixtures/external-news/news-detail.html`
- Create: `convex/test/fixtures/external-news/notices-list.html`
- Create: `convex/test/fixtures/external-news/notices-detail.html`
- Create: `convex/test/fixtures/external-news/research-progress-list.html`
- Create: `convex/test/fixtures/external-news/research-progress-detail.html`
- Create: `convex/test/fixtures/external-news/academic-lectures-list.html`
- Create: `convex/test/fixtures/external-news/academic-lectures-detail.html`
- Create: `convex/test/fixtures/external-news/malformed.html`

- [ ] **Step 1: Save minimal, non-copyright-heavy fixtures for every adapter**

Each list fixture contains two synthetic `<li>` records matching the real column structure, a relative detail URL, a date, a cover image, and a pagination link. Each detail fixture contains a synthetic title/date/body with headings, paragraphs, a list, one safe relative link, one safe image, and the following hostile block:

```html
<script>window.stolen = document.cookie</script>
<form action="https://attacker.invalid"><input name="secret"></form>
<iframe src="https://attacker.invalid"></iframe>
<a href="javascript:alert(1)" onclick="alert(2)">bad link</a>
<img src="data:text/html;base64,PHNjcmlwdD4=" onerror="alert(3)">
```

The fixtures must be hand-reduced to the smallest DOM that exercises the selectors; do not save full downloaded pages, analytics scripts, user data, or third-party assets.

- [ ] **Step 2: Write failing adapter and sanitizer tests**

```ts
import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

import { EXTERNAL_NEWS_SOURCES, parseExternalNewsDetail, parseExternalNewsList } from "../lib/externalNewsSources.ts"

for (const source of EXTERNAL_NEWS_SOURCES) {
  test(`${source.key} parses relative URLs, dates, image, and pagination`, async () => {
    const html = await readFile(new URL(`./fixtures/external-news/${source.fixturePrefix}-list.html`, import.meta.url), "utf8")
    const result = parseExternalNewsList(source.key, html, source.listUrl)
    assert.equal(result.items.length, 2)
    assert.match(result.items[0].url, /^https:\/\/www\.ai\.pku\.edu\.cn\//)
    assert.ok(result.items[0].sourcePublishedAt)
    assert.ok(result.nextPageUrl)
  })

  test(`${source.key} produces Markdown with hostile HTML removed`, async () => {
    const html = await readFile(new URL(`./fixtures/external-news/${source.fixturePrefix}-detail.html`, import.meta.url), "utf8")
    const result = parseExternalNewsDetail(source.key, html, source.listUrl)
    assert.match(result.markdown, /合成正文/)
    assert.doesNotMatch(result.markdown, /script|iframe|form|javascript:|data:text|onclick|onerror/i)
    assert.match(result.coverImageUrl ?? "", /^https:\/\/www\.ai\.pku\.edu\.cn\//)
  })
}

test("malformed detail fails with a bounded parser code", async () => {
  const source = EXTERNAL_NEWS_SOURCES[0]
  const html = await readFile(new URL("./fixtures/external-news/malformed.html", import.meta.url), "utf8")
  assert.throws(() => parseExternalNewsDetail(source.key, html, source.listUrl), /detail_parse_failed/)
})
```

- [ ] **Step 3: Run the parser tests and verify exports are missing**

Run: `node --experimental-strip-types --test convex/test/externalNewsSources.test.ts`

Expected: FAIL because `externalNewsSources.ts` does not exist.

- [ ] **Step 4: Implement a dependency-free bounded HTML tree and Markdown allowlist**

`externalNewsHtml.ts` must expose exactly these types and functions:

```ts
export type HtmlNode = { tag: string; attrs: Record<string, string>; children: HtmlNode[]; text: string }

export function parseHtmlTree(html: string, limits = { maxChars: 2_000_000, maxNodes: 50_000, maxDepth: 80 }): HtmlNode
export function findAll(root: HtmlNode, predicate: (node: HtmlNode) => boolean): HtmlNode[]
export function first(root: HtmlNode, predicate: (node: HtmlNode) => boolean): HtmlNode | undefined
export function textContent(node: HtmlNode): string
export function safeAbsoluteContentUrl(value: string | undefined, baseUrl: string): string | undefined
export function sanitizedMarkdown(node: HtmlNode, baseUrl: string): string
```

The tokenizer must decode numeric and the five XML named entities, recognize quoted/unquoted attributes, cap nodes/depth/input, and skip the complete subtree of `script`, `style`, `form`, `iframe`, `frame`, `object`, `embed`, `template`, `noscript`, and `svg`. Markdown conversion must allow only `h1`–`h6`, `p`, `br`, `strong/b`, `em/i`, `blockquote`, `ul`, `ol`, `li`, `a`, `img`, `table`, `thead`, `tbody`, `tr`, `th`, `td`, and plain text. It must discard all `on*`, `style`, `srcset`, `action`, `formaction`, and `target` attributes, accept only HTTPS absolute/relative links, escape Markdown control characters in text, cap output at 250,000 characters, and never emit raw HTML.

- [ ] **Step 5: Define fixed source descriptors and isolated adapters**

```ts
export const EXTERNAL_NEWS_SOURCES = [
  { key: "news", label: "新闻", category: "学院新闻", fixturePrefix: "news", listUrl: "https://www.ai.pku.edu.cn/xwgg1/xwxx.htm" },
  { key: "notices", label: "通知公告", category: "通知公告", fixturePrefix: "notices", listUrl: "https://www.ai.pku.edu.cn/xwgg1/tzgg.htm" },
  { key: "research_progress", label: "科研进展", category: "科研进展", fixturePrefix: "research-progress", listUrl: "https://www.ai.pku.edu.cn/kxyj1/kyjz.htm" },
  { key: "academic_lectures", label: "学术讲座", category: "学术讲座", fixturePrefix: "academic-lectures", listUrl: "https://www.ai.pku.edu.cn/kxyj1/xsjz.htm" },
] as const
```

Implement `parseExternalNewsList(sourceKey, html, pageUrl)` and `parseExternalNewsDetail(sourceKey, html, detailUrl)` as a `switch` that delegates to four named adapter objects (`newsAdapter`, `noticesAdapter`, `researchProgressAdapter`, `academicLecturesAdapter`). Shared helpers may normalize dates/URLs/text, but selector rules stay inside the adapter so one column change cannot silently affect the other three. Every missing required title/detail container throws an error whose message begins with `list_parse_failed:` or `detail_parse_failed:`; do not guess a new selector.

- [ ] **Step 6: Run all offline parser tests**

Run: `node --experimental-strip-types --test convex/test/externalNewsSources.test.ts`

Expected: 9 tests PASS, including hostile markup and malformed HTML.

- [ ] **Step 7: Commit adapters and fixtures**

```bash
git add convex/lib/externalNewsHtml.ts convex/lib/externalNewsSources.ts convex/test/externalNewsSources.test.ts convex/test/fixtures/external-news
git commit -m "feat: parse fixed AIA news sources safely"
```

### Task 3: Add the sync ledger, immutable snapshots, review stages, and permissions

**Files:**
- Modify: `convex/schema.ts` (`news`, `contentPermissions`, `contentSubmissions`, `contentReviewTasks`, notifications resource union)
- Modify: `convex/lib/contentReviewWorkflow.ts` (stage-specific task natural keys)
- Modify: `convex/contentReview.ts` (`effectiveRights`, permission mutations/projections, publication-stage task creation)
- Modify: `convex/lib/contentAuthorization.ts` (`canReview` must not authorize published-content management)
- Create: `convex/test/externalNewsRouting.test.ts`

- [ ] **Step 1: Write failing pure routing tests for permission intersection and stage keys**

```ts
import assert from "node:assert/strict"
import test from "node:test"

import { intersectActiveReviewers } from "../lib/externalNewsModel.ts"
import { contentReviewTaskNaturalKey } from "../lib/contentReviewWorkflow.ts"

test("resolved routing is intersected with active canReview accounts", () => {
  assert.deepEqual(
    intersectActiveReviewers(
      ["u1", "u2", "u3", "u2"],
      [{ id: "u1", canReview: true, disabled: false }, { id: "u2", canReview: false, disabled: false }, { id: "u3", canReview: true, disabled: true }],
    ),
    ["u1"],
  )
})

test("review and publication tasks never share a natural key", () => {
  assert.notEqual(
    contentReviewTaskNaturalKey("submission", "reviewer", "source_review"),
    contentReviewTaskNaturalKey("submission", "reviewer", "publication_approval"),
  )
})
```

- [ ] **Step 2: Run the routing test and confirm the new signatures fail**

Run: `node --experimental-strip-types --test convex/test/externalNewsRouting.test.ts`

Expected: FAIL because `intersectActiveReviewers` and the stage argument are absent.

- [ ] **Step 3: Extend the pure helper and task key**

```ts
export function intersectActiveReviewers(
  resolvedIds: readonly string[],
  grants: readonly { id: string; canReview: boolean; disabled: boolean }[],
) {
  const eligible = new Set(grants.filter((row) => row.canReview && !row.disabled).map((row) => row.id))
  return [...new Set(resolvedIds.map(String))].filter((id) => eligible.has(id))
}

export function contentReviewTaskNaturalKey(
  submissionId: unknown,
  reviewerId: unknown,
  stage: "source_review" | "publication_approval" = "publication_approval",
) {
  return `content-review:${String(submissionId)}:${stage}:reviewer:${String(reviewerId)}`
}
```

Update every existing caller to pass `"publication_approval"`; the default exists only so persisted legacy behavior remains readable.

- [ ] **Step 4: Extend schema fields without invalidating existing rows**

Add `canReview: v.optional(v.boolean())` to `contentPermissions`; keep `canCreate` and `canManage` unchanged. Add optional external-origin fields to `contentSubmissions`: `origin`, `workflowStage`, `sourceReviewStatus`, `sourceLedgerId`, `activeSourceSnapshotId`, `pendingSourceSnapshotId`, `sourcePublishedAt`, and `sourceUpdateAvailable`. Add optional `stage` and the `changes_requested` task status to `contentReviewTasks`. Extend the notification `resourceId` union to include the ledger if operations notifications link to it.

Add these tables and indexes exactly:

```ts
externalNewsSyncSettings: defineTable({
  singletonKey: v.literal("default"),
  enabled: v.boolean(),
  mode: v.union(v.literal("observation"), v.literal("draft")),
  reviewerMode: v.union(v.literal("scope"), v.literal("all_reviewers")),
  reviewerScope: v.optional(oaUserScope),
  updatedBy: v.id("users"),
  createdAt: v.number(),
  updatedAt: v.number(),
}).index("by_singletonKey", ["singletonKey"]),

externalNewsSyncLedger: defineTable({
  identity: v.string(),
  sourceKey: v.union(v.literal("news"), v.literal("notices"), v.literal("research_progress"), v.literal("academic_lectures")),
  canonicalUrl: v.string(),
  sourcePublishedAt: v.optional(v.number()),
  firstSeenAt: v.number(),
  lastSeenAt: v.number(),
  lastFetchedAt: v.optional(v.number()),
  currentHash: v.optional(v.string()),
  status: v.union(v.literal("observed"), v.literal("draft_created"), v.literal("update_available"), v.literal("published"), v.literal("rejected"), v.literal("failed")),
  submissionId: v.optional(v.id("contentSubmissions")),
  failureCode: v.optional(v.string()),
  createdAt: v.number(),
  updatedAt: v.number(),
}).index("by_identity", ["identity"]).index("by_sourceKey_lastSeenAt", ["sourceKey", "lastSeenAt"]),

externalNewsSourceSnapshots: defineTable({
  ledgerId: v.id("externalNewsSyncLedger"),
  contentHash: v.string(),
  title: v.string(),
  markdown: v.string(),
  category: v.string(),
  sourceUrl: v.string(),
  coverImageUrl: v.optional(v.string()),
  sourcePublishedAt: v.optional(v.number()),
  fetchedAt: v.number(),
}).index("by_ledger_hash", ["ledgerId", "contentHash"]),

externalNewsSourceHealth: defineTable({
  sourceKey: v.union(v.literal("news"), v.literal("notices"), v.literal("research_progress"), v.literal("academic_lectures")),
  lastAttemptAt: v.optional(v.number()),
  lastSuccessAt: v.optional(v.number()),
  lastFailureCode: v.optional(v.string()),
  consecutiveFailures: v.number(),
  lastDiscoveredCount: v.number(),
  updatedAt: v.number(),
}).index("by_sourceKey", ["sourceKey"]),

externalNewsSyncRuns: defineTable({
  trigger: v.union(v.literal("cron"), v.literal("manual")),
  requestedBy: v.optional(v.id("users")),
  mode: v.union(v.literal("observation"), v.literal("draft")),
  status: v.union(v.literal("running"), v.literal("completed"), v.literal("partial_failure"), v.literal("failed")),
  discoveredCount: v.number(),
  draftCount: v.number(),
  failureCount: v.number(),
  startedAt: v.number(),
  finishedAt: v.optional(v.number()),
}).index("by_startedAt", ["startedAt"]),
```

- [ ] **Step 5: Split news rights while retaining manager authority**

Change permission inputs and projections to `{ canCreate, canReview, canManage }`. `canReview` defaults false for legacy rows; `canManage` continues to authorize the existing publication-approval queue and published news mutations but does not imply `canReview`. Revoking `canReview` retires only pending `source_review` tasks; revoking `canManage` retires only `publication_approval` tasks. Events and reimbursement UI/API callers send `canReview: false`, and their existing behavior stays unchanged.

The public `contentReview.submit` mutation continues to assign `publication_approval` tasks from `canManage`. Add an internal helper `createPublicationApprovalTasks(ctx, submission, now)` and call it both from manual submit and after an external draft is accepted. It must resolve current active managers at stage activation, snapshot tasks once, fail closed if empty, and never allow a review-only account to publish.

- [ ] **Step 6: Run routing tests, lint the shared files, and run TypeScript**

Run: `node --experimental-strip-types --test convex/test/externalNewsRouting.test.ts`

Expected: 2 tests PASS.

Run: `npx eslint convex/schema.ts convex/lib/externalNewsModel.ts convex/lib/contentReviewWorkflow.ts convex/contentReview.ts convex/lib/contentAuthorization.ts --max-warnings=0`

Expected: exit 0.

Run: `npx tsc --noEmit`

Expected: exit 0 after every existing permission caller explicitly supplies or accepts `canReview`.

- [ ] **Step 7: Commit the serialized shared-schema change**

```bash
git add convex/schema.ts convex/lib/externalNewsModel.ts convex/lib/contentReviewWorkflow.ts convex/contentReview.ts convex/lib/contentAuthorization.ts convex/test/externalNewsRouting.test.ts
git commit -m "feat: split news review and publish permissions"
```

### Task 4: Enforce fixed-host fetching and scheduled/manual observation runs

**Files:**
- Create: `convex/lib/externalNewsFetch.ts`
- Create: `convex/test/externalNewsFetch.test.ts`
- Create: `convex/externalNewsSync.ts`
- Create: `convex/crons.ts`

- [ ] **Step 1: Write failing fetch-policy tests with an injected fetch**

```ts
import assert from "node:assert/strict"
import test from "node:test"

import { fetchExternalNewsHtml } from "../lib/externalNewsFetch.ts"

test("rejects redirect outside the fixed host", async () => {
  const fakeFetch: typeof fetch = async () => new Response(null, { status: 302, headers: { location: "https://evil.invalid/a" } })
  await assert.rejects(() => fetchExternalNewsHtml("https://www.ai.pku.edu.cn/a.htm", { fetchImpl: fakeFetch }), /redirect_blocked/)
})

test("enforces streamed byte limit", async () => {
  const fakeFetch: typeof fetch = async () => new Response("x".repeat(2_000_001), { headers: { "content-type": "text/html; charset=utf-8" } })
  await assert.rejects(() => fetchExternalNewsHtml("https://www.ai.pku.edu.cn/a.htm", { fetchImpl: fakeFetch, maxBytes: 2_000_000 }), /response_too_large/)
})

test("sends no cookie or authorization header", async () => {
  let requestHeaders = new Headers()
  const fakeFetch: typeof fetch = async (_url, init) => {
    requestHeaders = new Headers(init?.headers)
    return new Response("<html></html>", { headers: { "content-type": "text/html" } })
  }
  await fetchExternalNewsHtml("https://www.ai.pku.edu.cn/a.htm", { fetchImpl: fakeFetch })
  assert.equal(requestHeaders.has("cookie"), false)
  assert.equal(requestHeaders.has("authorization"), false)
})
```

- [ ] **Step 2: Run fetch tests and verify the module is missing**

Run: `node --experimental-strip-types --test convex/test/externalNewsFetch.test.ts`

Expected: FAIL with `ERR_MODULE_NOT_FOUND`.

- [ ] **Step 3: Implement the bounded fetch function**

`fetchExternalNewsHtml(url, options)` must canonicalize every initial/redirect URL, use `redirect: "manual"`, allow at most three redirects, use an 8-second `AbortController`, require a successful 2xx response and `text/html` content type, stop streaming after 2,000,000 bytes, decode UTF-8 with replacement, and map every failure to a bounded `ExternalNewsFailureCode`. The only outgoing headers are:

```ts
{
  Accept: "text/html,application/xhtml+xml",
  "User-Agent": "PKU-AIA-Internal-News-Sync/1.0",
}
```

Export `mapWithConcurrency(items, 2, worker)` and test that no more than two fake fetches run simultaneously.

- [ ] **Step 4: Run the fetch security tests**

Run: `node --experimental-strip-types --test convex/test/externalNewsFetch.test.ts`

Expected: 4 tests PASS: redirect, byte limit, credential absence, and concurrency.

- [ ] **Step 5: Implement actions and run bookkeeping**

In `externalNewsSync.ts`, add:

```ts
export const runScheduled = internalAction({ args: {}, handler: (ctx) => runSync(ctx, { trigger: "cron" }) })
export const runNow = action({ args: { sessionToken: v.string() }, handler: async (ctx, args) => {
  const actor = await ctx.runQuery(internal.externalNewsSync.requireSuperAdmin, { sessionToken: args.sessionToken })
  return await runSync(ctx, { trigger: "manual", requestedBy: actor.userId })
} })
```

`runSync` reads the singleton settings, exits with a recorded completed run when disabled, fetches list pages and at most the first five pagination pages per source, deduplicates detail URLs in memory, fetches details with concurrency two, computes hashes, and calls one internal ingest mutation per normalized item. Observation mode writes ledger/snapshot/health only. Draft mode delegates all recipient resolution and draft/task insertion to the mutation. It stores only counts and bounded failure codes in run/health rows; it never logs or persists raw HTML, session tokens, response headers, or cookies.

- [ ] **Step 6: Register the hourly cron without any deployment command**

```ts
import { cronJobs } from "convex/server"
import { internal } from "./_generated/api"

const crons = cronJobs()
crons.interval("discover fixed AIA external news", { hours: 1 }, internal.externalNewsSync.runScheduled, {})
export default crons
```

Do not run `npx convex deploy`, `npx convex dev` against a cloud deployment, or any migration after adding this file.

- [ ] **Step 7: Lint and commit fetch/scheduling**

Run: `npx eslint convex/lib/externalNewsFetch.ts convex/externalNewsSync.ts convex/crons.ts convex/test/externalNewsFetch.test.ts --max-warnings=0`

Expected: exit 0.

```bash
git add convex/lib/externalNewsFetch.ts convex/test/externalNewsFetch.test.ts convex/externalNewsSync.ts convex/crons.ts
git commit -m "feat: schedule bounded external news discovery"
```

### Task 5: Make atomic ingest URL/hash-idempotent and preserve remote updates

**Files:**
- Modify: `convex/externalNewsSync.ts`
- Modify: `convex/lib/externalNewsModel.ts`
- Create: `convex/test/externalNewsIngest.test.ts`
- Create: `convex/migrations/externalNewsSourceUrls.ts`

- [ ] **Step 1: Write failing decision-table tests for repeat, update, and historical URLs**

```ts
import assert from "node:assert/strict"
import test from "node:test"

import { decideExternalNewsIngest } from "../lib/externalNewsModel.ts"

test("first observation never creates a draft", () => {
  assert.equal(decideExternalNewsIngest({ mode: "observation", ledger: null, incomingHash: "h1", historicalMatch: false }), "observe")
})

test("draft mode creates once, repeats only touch lastSeenAt", () => {
  assert.equal(decideExternalNewsIngest({ mode: "draft", ledger: null, incomingHash: "h1", historicalMatch: false }), "create_draft")
  assert.equal(decideExternalNewsIngest({ mode: "draft", ledger: { currentHash: "h1", submissionId: "s" }, incomingHash: "h1", historicalMatch: false }), "touch")
})

test("changed source creates an available snapshot and never overwrites draft", () => {
  assert.equal(decideExternalNewsIngest({ mode: "draft", ledger: { currentHash: "h1", submissionId: "s" }, incomingHash: "h2", historicalMatch: false }), "record_update")
})

test("historical manual source URL is adopted without another draft", () => {
  assert.equal(decideExternalNewsIngest({ mode: "draft", ledger: null, incomingHash: "h1", historicalMatch: true }), "adopt_historical")
})
```

- [ ] **Step 2: Run the ingest tests and verify the decision function is absent**

Run: `node --experimental-strip-types --test convex/test/externalNewsIngest.test.ts`

Expected: FAIL because `decideExternalNewsIngest` is absent.

- [ ] **Step 3: Implement the pure decision table and atomic mutation**

`decideExternalNewsIngest` returns only `observe | create_draft | touch | record_update | adopt_historical`. The internal `ingestFetchedItem` mutation then performs the selected transition in one Convex transaction:

- Query `externalNewsSyncLedger.by_identity` before inserting.
- Query existing published news and content submissions for a canonicalized matching `sourceUrl` before draft creation; this historical check must run inside the transaction.
- Upsert the immutable snapshot by `by_ledger_hash`.
- For `touch`, patch only `lastSeenAt`, `lastFetchedAt`, and health counters.
- For `record_update`, point `pendingSourceSnapshotId` at the new immutable snapshot and set `sourceUpdateAvailable: true`; do not patch submission title, payload, target scope, current hash, active snapshot, or reviewer edits.
- For `create_draft`, resolve configured scope or all reviewers, intersect with active `news.canReview` grants and enabled accounts, then atomically insert ledger, snapshot, content submission, immutable `source_review` tasks, and notifications. Empty recipient resolution throws `empty_reviewer_set` before inserting the submission/tasks.
- For `adopt_historical`, link the ledger to the matching submission/news record, mark it observed/published, and create no review task.

The external submission uses `createdBy` set to the super-admin who last configured sync, `creatorName: "AIA 官网同步机器人"`, `origin: "external_news_sync"`, `workflowStage: "source_review"`, `sourceReviewStatus: "pending"`, overall `status: "pending"`, and an institute-wide explicit empty `targetScope: {}`.

- [ ] **Step 4: Add standalone idempotent URL backfill without invoking it**

`migrations/externalNewsSourceUrls.ts` exports a super-admin-guarded mutation accepting `{ sessionToken, cursor?, limit? }`, processes at most 100 rows, canonicalizes only allowlisted AIA `sourceUrl` values, skips already-linked ledger identities, and returns `{ cursor, processed, inserted, skipped, done }`. Before every ledger insert it queries `by_identity`, so retrying a page cannot duplicate data. It must not update user-edited news content and must not be imported by any runtime file.

Document in its JSDoc that a maintainer may run it manually only after choosing an approved non-production/local deployment. Do not include or execute a `convex run` command in this plan.

- [ ] **Step 5: Run idempotency tests and static checks**

Run: `node --experimental-strip-types --test convex/test/externalNewsIngest.test.ts`

Expected: 4 tests PASS.

Run: `npx eslint convex/externalNewsSync.ts convex/lib/externalNewsModel.ts convex/migrations/externalNewsSourceUrls.ts convex/test/externalNewsIngest.test.ts --max-warnings=0`

Expected: exit 0.

- [ ] **Step 6: Commit ingest and migration code**

```bash
git add convex/externalNewsSync.ts convex/lib/externalNewsModel.ts convex/test/externalNewsIngest.test.ts convex/migrations/externalNewsSourceUrls.ts
git commit -m "feat: ingest external news idempotently"
```

### Task 6: Implement the review-only queue, editing, update adoption, and publication handoff

**Files:**
- Modify: `convex/externalNewsSync.ts`
- Modify: `convex/contentReview.ts`
- Modify: `src/lib/api.ts`
- Create: `src/components/class-work/external-news-review-desk.tsx`
- Create: `src/components/class-work/external-news-draft-editor.tsx`
- Create: `src/app/class-work/news/review/page.tsx`
- Modify: `src/components/class-work/class-work-access-guard.tsx`
- Modify: `src/components/class-work/content-review-status.tsx`

- [ ] **Step 1: Add typed client contracts before building UI**

Add function references and hooks in `src/lib/api.ts` for `externalNewsSync:listMyReviewQueue`, `getReviewDraft`, `saveReviewDraft`, `adoptPendingSnapshot`, and `decideReview`. Define:

```ts
export type ExternalNewsReviewDraft = {
  submissionId: string
  taskId: string
  title: string
  content: string
  category: string
  sourceUrl: string
  coverImageUrl?: string
  sourcePublishedAt?: number
  sourceReviewStatus: "pending" | "needs_changes" | "accepted" | "rejected"
  taskStatus: "pending" | "changes_requested" | "accepted" | "rejected" | "skipped"
  sourceUpdateAvailable: boolean
  internalUpdatedAt: number
  sourceSnapshot?: { title: string; content: string; fetchedAt: number }
}
```

Every hook reads the session token internally and sends task/submission IDs as Convex IDs. Do not call Convex directly from either component.

- [ ] **Step 2: Add task-bound authorization and editing mutations**

`listMyReviewQueue` queries `contentReviewTasks.by_user_status_createdAt`, returns only external-news `source_review` tasks assigned to the actor, and never lists another reviewer’s tasks merely because the actor currently has `canReview`. `getReviewDraft` requires the persisted task relationship. `saveReviewDraft` requires a task in `pending` or `changes_requested`, validates non-empty title/body, canonicalizes but does not change the source URL, patches only editable fields, and leaves source snapshots immutable.

`adoptPendingSnapshot` requires an eligible assigned task, copies the explicitly selected pending snapshot into the draft only after the reviewer action, moves it to `activeSourceSnapshotId`, clears `sourceUpdateAvailable`, and updates ledger `currentHash`. It must return the updated draft so the UI can show exactly what changed.

- [ ] **Step 3: Implement any-one source review and publication handoff**

`decideReview` accepts `{ taskId, decision: "accept" | "request_changes" | "reject", comment? }`. Reject and request-changes require a comment. It applies `decideExternalReview` to the persisted stage tasks and records all sibling skips atomically.

- `request_changes`: keeps overall submission pending, sets `sourceReviewStatus: "needs_changes"`, keeps `workflowStage: "source_review"`, and allows only the actor’s `changes_requested` task to edit or later accept/reject.
- `reject`: sets overall submission rejected, stage complete, ledger rejected, and creates no manager tasks.
- `accept`: first validates the edited title/body, sets source review accepted, changes stage to `publication_approval`, calls `createPublicationApprovalTasks`, and notifies the snapshotted managers. It does not insert a `news` row.
- The existing `contentReview.review` mutation handles only `publication_approval` tasks. Approval publishes using `sourcePublishedAt ?? now`; rejection ends without a public row. A user holding both rights must perform two separately persisted actions.

- [ ] **Step 4: Build the AIA-styled review desk and editor**

`external-news-review-desk.tsx` follows the border/rule/serif/mono conventions in `content-review-desk.tsx`, but shows only the actor’s assigned source-review tasks with source column, source date, last fetched time, update badge, and state. Each row links to the existing submission detail route with `?mode=source-review`, or renders the editor inline on large screens.

`external-news-draft-editor.tsx` uses the existing `MarkdownSplitEditor` and form primitives. It provides Save, Request changes, Reject, and “接受并进入发布审批” actions; disables actions while saving; requires comments for request/reject; shows `官网内容已更新` with fetched time and a confirmation before `adoptPendingSnapshot`; and links to the original source in a separate safe external link. Hover/focus/active states must reuse AIA tokens and all controls need labels/status regions.

The route shell is:

```tsx
export default function ExternalNewsReviewPage() {
  return (
    <main className="aia-scope container-custom max-w-6xl py-10 sm:py-14">
      <ClassWorkAccessGuard category="news" capability="review">
        <ExternalNewsReviewDesk />
      </ClassWorkAccessGuard>
    </main>
  )
}
```

Extend `ClassWorkCapability` with `review`; map it only to `rights.news.canReview`. Do not make `either` an unconditional allow: it must mean any of create/review/manage.

- [ ] **Step 5: Verify review-only authorization statically**

Run: `rg -n "api\.|useQuery\(|useMutation\(" src/components/class-work/external-news-*.tsx`

Expected: no direct `api.*`, `useQuery`, or `useMutation` imports; components import only hooks from `src/lib/api.ts`.

Run: `npx eslint convex/externalNewsSync.ts convex/contentReview.ts src/lib/api.ts src/components/class-work/external-news-review-desk.tsx src/components/class-work/external-news-draft-editor.tsx src/components/class-work/class-work-access-guard.tsx src/components/class-work/content-review-status.tsx src/app/class-work/news/review/page.tsx --max-warnings=0`

Expected: exit 0.

- [ ] **Step 6: Commit the source-review stage**

```bash
git add convex/externalNewsSync.ts convex/contentReview.ts src/lib/api.ts src/components/class-work/external-news-review-desk.tsx src/components/class-work/external-news-draft-editor.tsx src/components/class-work/class-work-access-guard.tsx src/components/class-work/content-review-status.tsx src/app/class-work/news/review/page.tsx
git commit -m "feat: add assigned external news review desk"
```

### Task 7: Expose `canReview` in permissions and the portal

**Files:**
- Modify: `src/components/permissions/permission-subject-picker.tsx`
- Modify: `src/components/permissions/platform-permissions-client.tsx`
- Modify: `src/app/platform/permissions/page.tsx`
- Modify: `src/components/portal/portal-client.tsx`
- Modify: `src/config/site-copy.ts`
- Modify: `src/lib/api.ts`

- [ ] **Step 1: Extend permission UI types without changing non-news semantics**

Add optional `reviewLabel` and `supportsReview` to `PermissionTab`. The News tab becomes:

```ts
{
  category: "news",
  kicker: "News",
  label: "新闻",
  description: "创建权用于撰写；审阅权用于处理官网同步草稿；管理权用于最终发布与已发布内容管理。",
  createLabel: "创建权",
  reviewLabel: "审阅权",
  manageLabel: "发布与管理权",
  supportsReview: true,
}
```

Events, reimbursement, and the already-merged teacher-recognition tab keep their configured controls and send `canReview: false`. `PermissionSubjectPicker` accepts/returns `canReview`, shows the third checkbox only for `supportsReview`, and considers any visible selected capability sufficient to submit. `PermissionRow` applies the same rule and never clears unrendered teacher-recognition fields.

- [ ] **Step 2: Add portal copy and independent entries**

Add `reviewNews: { title: "审阅新闻", description: "校对官网同步草稿，处理更新并提交最终发布审批。" }` and `newsSync: { title: "新闻同步", description: "查看四个官网栏目的同步模式、来源健康与运行记录。" }` to `siteCopy.portal.modules`.

Show `/class-work/news/review` only when `contentPermissions.news.canReview`; keep `/class-work/news/manage` only for `canManage`. Show `/platform/news-sync` only to super admins. Update the permission-page metadata/body to describe separate create/review/manage capabilities and preserve the teacher-recognition wording merged earlier.

- [ ] **Step 3: Check keyboard and screen-reader behavior**

The permission tablist retains ArrowLeft/ArrowRight/Home/End behavior. Every new checkbox has a visible label, the row fieldset legend includes the account name, bulk assignment errors use `role="alert"`, and saving state disables the entire affected row rather than only the clicked checkbox.

- [ ] **Step 4: Lint and commit permission/portal UI**

Run: `npx eslint src/components/permissions/permission-subject-picker.tsx src/components/permissions/platform-permissions-client.tsx src/app/platform/permissions/page.tsx src/components/portal/portal-client.tsx src/config/site-copy.ts src/lib/api.ts --max-warnings=0`

Expected: exit 0.

```bash
git add src/components/permissions/permission-subject-picker.tsx src/components/permissions/platform-permissions-client.tsx src/app/platform/permissions/page.tsx src/components/portal/portal-client.tsx src/config/site-copy.ts src/lib/api.ts
git commit -m "feat: expose independent news review permission"
```

### Task 8: Build super-admin sync operations and reviewer routing

**Files:**
- Modify: `convex/externalNewsSync.ts`
- Modify: `src/lib/api.ts`
- Create: `src/components/platform/external-news-sync-client.tsx`
- Create: `src/app/platform/news-sync/page.tsx`

- [ ] **Step 1: Add super-admin settings and status APIs**

Implement `getOperations`, `saveSettings`, and `runNow`. Both query/mutation validate `role === "super_admin"`. `saveSettings` accepts:

```ts
{
  enabled: boolean
  mode: "observation" | "draft"
  reviewerMode: "scope" | "all_reviewers"
  reviewerScope?: OAUserScope
}
```

For `scope`, normalize with the existing OA union semantics, call `assertActorCanUseScope`, resolve recipients, intersect active `news.canReview` users, and reject empty results before saving. For `all_reviewers`, require at least one active `news.canReview` user. Return preview labels and count, but store the unexpanded scope; every draft snapshots recipients at ingest time.

`getOperations` returns enabled/mode/routing summary, all four fixed source descriptors, each source’s last attempt/success/failure/consecutive-failure count, and the 20 newest run summaries. It never returns raw HTML, internal stack traces, sessions, or reviewer IDs to non-admins.

- [ ] **Step 2: Add canonical client hooks**

In `src/lib/api.ts`, add `useExternalNewsSyncOperations`, `useSaveExternalNewsSyncSettings`, and `useRunExternalNewsSyncNow`; each reads the session token internally. The manual action hook returns the persisted run ID immediately, and the page observes completion through the query rather than holding an HTTP request open.

- [ ] **Step 3: Build the AIA operations page**

The page uses a thin server route shell and `external-news-sync-client.tsx`. The client renders:

- an explicit enabled switch;
- an Observation/Draft segmented control, with observation recommended until all four fixtures are green;
- All reviewers versus selected scope routing;
- the existing `OaScopePicker` when scope mode is selected;
- a preview count after save validation;
- “立即同步” with a confirmation showing the current mode;
- four source-health rows containing fixed label/URL, last attempt, last success, consecutive failures, and bounded failure code;
- the newest 20 runs with trigger, mode, counts, status, and timestamps.

Use the same `aia-scope`, `aia-serif`, `aia-mono`, `aia-border-rule`, paper/warm/tag/red CSS variables and square controls as the existing permissions page. Never display an editable source URL or selector field.

- [ ] **Step 4: Verify authorization, no arbitrary URLs, and no secrets**

Run: `rg -n "sourceUrl|listUrl|selector|cookie|authorization|sessionToken" src/components/platform/external-news-sync-client.tsx`

Expected: source URLs appear only as read-only descriptor links; there is no editable URL/selector input, no cookie/authorization handling, and the session token is absent because hooks own it.

Run: `npx eslint convex/externalNewsSync.ts src/lib/api.ts src/components/platform/external-news-sync-client.tsx src/app/platform/news-sync/page.tsx --max-warnings=0`

Expected: exit 0.

- [ ] **Step 5: Commit operations UI**

```bash
git add convex/externalNewsSync.ts src/lib/api.ts src/components/platform/external-news-sync-client.tsx src/app/platform/news-sync/page.tsx
git commit -m "feat: add external news sync operations"
```

### Task 9: Make internal details primary and source links secondary

**Files:**
- Modify: `convex/contentReview.ts`
- Modify: `convex/news.ts`
- Modify: `convex/instituteContent.ts`
- Modify: `convex/lib/instituteDto.ts`
- Modify: `src/components/content/news-timeline.tsx`
- Modify: `src/components/content/tong-class-news-timeline.tsx`
- Modify: `src/components/tong-class/tong-class-home-client.tsx`
- Modify: `src/components/institute/live-directory-view-model.ts`
- Modify: `src/components/institute/home-live-updates.tsx`
- Modify: `src/app/tong-class/news/[id]/page.tsx`

- [ ] **Step 1: Preserve source publication time at final approval**

In `finalizeApprovedSubmission`, use `submission.sourcePublishedAt ?? now` for `news.publishedAt`, preserve the canonical `sourceUrl`, set `siteScope: "institute"`, and patch the ledger to `published` with the created news ID only after the news insert succeeds. Continue reusing `publishedContentId` so an approval retry cannot create a second news row.

- [ ] **Step 2: Route every card to the internal detail page**

Remove source-URL branching from both timeline components and always use `detailHref(item)`. In `toDirectoryUpdate`, always set:

```ts
href: withReturnTo(`/tong-class/news/${item.id}`, returnTo)
```

In Tong Class home cards and featured slides, always use `/tong-class/news/${item._id}` and remove external-target attributes. In institute home updates, link each lead/secondary item to `withReturnTo(`/tong-class/news/${update.id}`, "/")` instead of the collection page.

- [ ] **Step 3: Keep a separate safe original-source action on details**

Retain `getSafeExternalUrl(news.sourceUrl)` at the detail boundary and change the action label to `查看原文`. The content body remains the sanitized internal Markdown. Add a small source-note block showing the fixed source category and source publication date when present; do not make the page title or body link externally.

- [ ] **Step 4: Verify no source URL still controls a news-card href**

Run: `rg -n "href=\{.*sourceUrl|sourceUrl \|\|.*news|safeSourceUrl \?" src/components/content src/components/tong-class src/components/institute`

Expected: no card/list result; only detail-page `查看原文` actions may use `safeSourceUrl`.

Run: `npx eslint convex/contentReview.ts convex/news.ts convex/instituteContent.ts convex/lib/instituteDto.ts src/components/content/news-timeline.tsx src/components/content/tong-class-news-timeline.tsx src/components/tong-class/tong-class-home-client.tsx src/components/institute/live-directory-view-model.ts src/components/institute/home-live-updates.tsx 'src/app/tong-class/news/[id]/page.tsx' --max-warnings=0`

Expected: exit 0.

- [ ] **Step 5: Commit internal-first news display**

```bash
git add convex/contentReview.ts convex/news.ts convex/instituteContent.ts convex/lib/instituteDto.ts src/components/content/news-timeline.tsx src/components/content/tong-class-news-timeline.tsx src/components/tong-class/tong-class-home-client.tsx src/components/institute/live-directory-view-model.ts src/components/institute/home-live-updates.tsx 'src/app/tong-class/news/[id]/page.tsx'
git commit -m "fix: keep synchronized news inside internal detail pages"
```

### Task 10: Run the integrated non-production verification and AIA visual review

**Files:**
- Verify: all files changed in Tasks 1–9

- [ ] **Step 1: Run every offline test without contacting the public site**

Run: `node --experimental-strip-types --test convex/test/externalNewsModel.test.ts convex/test/externalNewsSources.test.ts convex/test/externalNewsRouting.test.ts convex/test/externalNewsFetch.test.ts convex/test/externalNewsIngest.test.ts`

Expected: all model, four-adapter fixture, sanitizer, routing, fetch-security, and ingest decision tests PASS; the command performs no real fetch.

- [ ] **Step 2: Verify the deployment hard gate before Convex code generation**

Run: `rg -n "^(CONVEX_DEPLOYMENT|NEXT_PUBLIC_CONVEX_URL)=" .env .env.local 2>/dev/null || true`

Expected: no value contains `silverfish`, `prod:`, or a cloud production URL. If any value does, stop and do not run Convex or build commands. Start/prepare only a local Convex development backend through the repository’s approved local workflow; never append `--prod`.

- [ ] **Step 3: Generate against local Convex only and run full quality gates**

Run: `npx convex dev --local --once`

Expected: local schema/functions validate and generated types refresh; no cloud deployment occurs.

Run: `npm run lint`

Expected: ESLint exits 0 with zero warnings.

Run: `npm run build`

Expected: production compilation exits 0 while still using the local Convex configuration. This builds local artifacts only; it does not deploy Next.js or Convex.

- [ ] **Step 4: Exercise observation mode locally**

With the local backend and Next.js dev server running, sign in as a local super admin, configure at least one local `news.canReview` account, keep sync in Observation mode, run `立即同步`, and verify all four sources show an attempt/result while no content submission or public news row is created. Then use only the offline fixtures or a maintainer-approved one-time public fetch to test Draft mode; never point the command at silverfish or production.

- [ ] **Step 5: Exercise authorization and stage separation locally**

Using separate local accounts, verify:

- a review-only account sees only its snapshotted assignments and cannot open published-news management;
- a manage-only account cannot see source-review tasks;
- a dual-rights account must record source acceptance and publication approval separately;
- request changes/reject require comments and skip sibling source tasks;
- source acceptance creates manager tasks but no public row;
- manager approval creates one public row at the source date;
- changing/removing permissions does not silently retarget already snapshotted drafts;
- an empty routing intersection fails closed;
- a repeated sync touches `lastSeenAt`, and a changed source creates `官网内容已更新` without overwriting edits.

- [ ] **Step 6: Review AIA visuals and accessibility at desktop and mobile widths**

Inspect `/platform/permissions`, `/platform/news-sync`, `/class-work/news/review`, the external draft editor, `/updates`, and the internal detail page at 1440 px and 390 px. Confirm existing AIA typography/tokens, square controls, border rhythm, visible focus, keyboard tab order, readable error/status regions, no overflow, and separate `查看原文`. Correct any discrepancy in the owning component and rerun lint.

- [ ] **Step 7: Confirm forbidden operations and complete implementation code**

Run: `git diff --check`

Expected: no whitespace errors.

Run: `rg -n "T[O]DO|T[B]D|implement[ ]later|placeholde[r]|silverfish|--prod|convex[ ]deploy" convex src docs/superpowers/plans/2026-08-13-external-news-sync-review-implementation.md`

Expected: only this plan’s explicit prohibition/explanation lines may mention `silverfish`, `--prod`, or `convex deploy`; implementation files contain none of the scanned incomplete-work markers.

- [ ] **Step 8: Commit verification-only corrections**

```bash
git add convex src docs/superpowers/plans/2026-08-13-external-news-sync-review-implementation.md
git commit -m "chore: verify external news review workflow"
```

Do not stage unrelated work, do not execute the migration, and do not push or deploy as part of this plan.
