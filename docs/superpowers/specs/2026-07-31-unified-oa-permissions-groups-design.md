# Unified OA, Permissions, Reimbursement, and Research Group Design

**Date:** 2026-07-31  
**Branch/worktree:** `newnew` in `/Users/photonyan/.config/superpowers/worktrees/cyber-tongclass-public/iai-institute-platform`  
**Status:** Approved in conversation  
**Backend authorization:** The user explicitly authorized modifications under `convex/` for this project.

## 1. Objective

Complete the unfinished AIA form-management experience and extend the same design and authorization model across content publishing, reimbursement, and research-group management. The work must preserve Kimi's existing AIA editorial visual language while adding reliable backend authorization and workflow execution.

The delivery is phased. Phase one completes form management, audience selection, and workflow design. Phase two adds platform permissions, class-work content creation and review, and reimbursement integration. Phase three completes the teacher research-group workspace.

## 2. Safety and Compatibility

The `newnew` worktree contains substantial uncommitted work from a previous agent. Existing changes must be preserved and extended in place. No resets, broad checkouts, cache deletion, or cleanup commands may be used.

`package.json` scripts must not be modified. No command may use `--force`, `--legacy-peer-deps`, `--prod`, or otherwise target production. Convex changes are authorized for this feature, but they must remain scoped, backward compatible where practical, and idempotent. Components must continue to consume Convex only through hooks in `src/lib/api.ts`.

Existing OA forms that only contain `approvalSteps` must continue to load and execute. New workflow definitions use a versioned node model, with a compatibility adapter that exposes old steps as approval nodes. Existing submissions and historical events remain readable.

## 3. Visual System

All new AIA interfaces reuse the existing typography and tokens. Headings and workflow node names use `aia-serif`; kickers, indices, counts, metadata, and statuses use `aia-mono`; body copy, inputs, and controls use the existing sans stack. No new fonts or global font-loader changes are introduced.

The visual language is warm paper, deep blue ink, burgundy accents, fine warm-gray rules, and generous whitespace. Structure comes from flat rows and one-pixel dividers rather than rounded cards and shadows. Inputs remain transparent and rectangular. Selected scope items use the existing AIA tag treatment. New admin permission screens intentionally resemble the AIA OA workspace rather than the legacy blue shadcn administration tables.

## 4. Phase One: Forms, Audience, and Workflow

### 4.1 Super-administrator form management

`/forms/manage` is accessible to teachers and super administrators. A teacher sees forms they own. A super administrator sees all forms, sees creator metadata, can open the appropriate edit surface, and can pin or unpin any form. Navigation and page guards must not assume a super administrator also has teacher identity.

The list and edit routes use a single clear ownership contract. A super administrator editing another creator's form is never incorrectly sent through an owner-only teacher query. The portal exposes the form-management entry to eligible teachers and super administrators.

### 4.2 Audience picker

The existing single-input combobox becomes the shared scope picker for forms, content, workflow nodes, notifications, and permission assignment. Opening it without a query shows the default qualification groups: undergraduate, graduate, teacher, and other member. It also shows manageable research groups using the name `「<老师姓名>的课题组」` and manageable custom user groups. Account results appear through fuzzy name or username search.

Scope options are filtered on the server according to the current actor and purpose. A teacher can select only system groups and groups the teacher is allowed to manage or address. A super administrator can select all groups and accounts. The client must not be the security boundary.

The picker supports keyboard navigation, Enter selection, Escape dismissal, removable selected tokens, loading and empty states, and union semantics across selected conditions.

### 4.3 Workflow definition

The form editor adds an AIA-styled workflow section and no longer deletes workflow configuration during save. The workflow is an ordered sequence with a fixed, non-removable `create_form` start node and four configurable node types:

- `approval`: one approval scope, a custom display name, and actions for approve, reject, or defer-with-comment.
- `batch_approval`: multiple resolved reviewers displayed as branches, a custom display name, and `any` or `all` completion.
- `fill_form`: a target form selected through an editor-visible form combobox. Reaching the node grants the current submitter visibility and fill permission for that target form.
- `notification`: a target scope selected with the shared scope picker and a configured notification message.

The editor is not an arbitrary graph builder. Nodes execute in order; only `batch_approval` branches internally. This keeps runtime semantics deterministic and compatible with the existing OA engine.

The left side is a flat, divided, inline editor. Add controls appear between nodes rather than in a permanent palette. Clicking a node expands its configuration in place. On desktop, the right side contains a live, read-only workflow simulation. The simulation can demonstrate normal, deferred, and rejected paths and renders batch approval as branches. It never persists data or sends notifications. On narrow screens it moves beneath the editor.

### 4.4 Review semantics

Approval and batch approval expose three decisions:

- Approve completes that reviewer task.
- Reject ends the workflow and marks the submission rejected.
- Defer review requires a comment, keeps review authority, notifies only the submitter, and marks the node yellow.

Deferred comments remain visible permanently. After the submitter revises and resubmits, the original node history is preserved and a new `复审` row appears below it. The same logical step is reactivated with a new workflow version and valid reviewer tasks. A later decision changes only the new review record; it does not hide or overwrite the earlier comment.

### 4.5 Execution and grants

Workflow definitions are validated at save and again at publish. Each node requires a name and valid target configuration. A workflow cannot publish when an approval node resolves to no eligible reviewers, a fill-form target is invalid, or a notification scope is empty.

Reviewer scopes are resolved when a node activates so current authorization changes are respected. Task creation, notification creation, and form grants use deterministic natural keys. Retries therefore do not duplicate tasks, messages, or grants.

If a fill-form target is unpublished or disabled when reached, the workflow pauses with an actionable administrator-visible error. It must not silently skip the node.

## 5. Phase Two: Platform Permissions, Class Work, and Reimbursement

### 5.1 Role naming

The account authorization hierarchy is displayed consistently as `普通用户`, `管理员`, and `超级管理员`. `本科生` remains an identity or qualification group and is not used as the label for the base account role. Member-related language on research-group pages is unaffected.

### 5.2 Permission management

The super-administrator platform management area adds `/admin/permissions` and a corresponding navigation entry. The page uses OA-style tabs for `新闻`, `活动`, and `报销`.

News and activity tabs provide the shared account/group picker followed by a flat list of authorized people. Each person may independently hold `审核与管理权` and `创建权`; both can be selected.

The reimbursement tab uses the same interaction but exposes separate capabilities for creating reimbursement forms and approving reimbursement. Super administrators have effective access to all capabilities while still seeing the configured assignments.

Permission mutations validate that the actor is a super administrator and that selected targets are valid accounts. Permission data is stored by user, category, and capability with idempotent upsert behavior.

### 5.3 Class Work

The AIA intranet portal adds a `班级工作` section at the same hierarchy level as `与你相关` and `班级事务`. It appears only when the current user has at least one relevant effective capability. Links are generated independently for creating news, managing news, creating activities, and managing activities.

Authorized creators use dedicated class-work pages rather than the legacy super-administrator content backend. Create pages reuse the site's existing content editor patterns and add the shared audience picker.

News and activity submissions use a predefined two-stage workflow: creator submission followed by parallel review by all currently eligible users with review-and-management rights. Creation sends idempotent inbox notifications to reviewers and places the item in the corresponding management queue. Approval creates or updates the formal news or activity record. Rejection returns the decision and comment to the creator. Scope information is preserved through review and enforced by all public, search, count, and detail queries.

Management pages reuse the OA approval-desk visual pattern. The existing traditional administrator backend remains available to administrators and super administrators but is not exposed to ordinary authorized creators.

### 5.4 Notifications

Content-review notifications have their own category and destination mapping. They never fall through to Coffee Talk routes. Reviewer notifications open the relevant class-work management item; creator notifications open the creator's submission detail. Natural keys prevent repeated notifications during retries.

### 5.5 Fixed reimbursement OA

The `/services/oa` form list adds a fixed `报销` entry immediately below pinned items. It leads to a reimbursement workspace containing the academic-exchange reimbursement and eligible custom reimbursement forms.

Custom reimbursement forms use the unified form builder and OA workflow engine. Creation and approval access come from the reimbursement permissions configured in platform management. Reimbursement approvals appear in the existing OA approval inbox rather than a separate review system.

### 5.6 Academic-exchange PDF branding

Academic-exchange applications store a brand snapshot when created. Undergraduate applicants use the Tong Class brand; every non-undergraduate applicant uses the Institute for Artificial Intelligence brand. The snapshot drives the rendered PDF title, document number prefix, browser filename, reviewer download, and batch export. Historical applications without a snapshot derive a deterministic fallback from their owner identity and can be lazily backfilled without duplicate records.

## 6. Phase Three: Research Group Workspace

The teacher management page brings across all public profile fields already shown on the research-group detail page: Chinese and English name, summary, description, research areas, recruitment text, public links, and public visibility.

Below the profile editor, the page uses two columns. The left column manages people; the right column manages group publications.

The group leader is fixed first. Other members have a persistent `sortOrder` and may be reordered by drag handle or accessible up/down controls. Add, remove, description, and ordering mutations are authorized to the group leader or a super administrator and remain idempotent.

Publication candidates are computed from structured publication author account IDs intersecting with the leader and assigned group-member account IDs. Text-only display-name matching is not accepted as an authorization or relationship signal. Membership changes automatically recompute candidates.

Each candidate has a separate visibility override. By default, an automatically related publication is visible. A teacher can hide it without deleting the relationship. Hidden candidates remain in the management list and can be re-enabled. The public research-group page shows only related publications whose effective visibility is enabled.

## 7. Data Contracts

The shared scope contract continues to represent qualification groups, account roles where permitted, research-group IDs, custom user-group IDs, and account IDs. Server queries return only options the actor may use for the requested purpose.

The workflow definition contains a version and ordered node array. Runtime submissions snapshot the definition version and append immutable events. Reviewer tasks, form grants, and notifications reference the submission, workflow version, and node ID.

Content permission records identify category and capability. Content-review submissions snapshot payload and audience scope before approval.

Research-group assignments gain optional order for backward compatibility. Publication visibility overrides are unique by research group and publication.

Academic-exchange applications gain an immutable or write-once PDF brand snapshot.

## 8. Error Handling and Auditability

All security-sensitive checks run in Convex mutations and queries, not only in React. Unauthorized scope options, form edits, permissions, approvals, group changes, and content reads return explicit authorization errors.

Workflow events are append-only. Deferred review, revision, re-review, approval, rejection, notification, form grant, and execution error states remain auditable. UI status colors are semantic: burgundy for active attention, amber for deferred or partially complete, green/ink for approved, red for rejected, and muted gray for future or unavailable nodes.

Scope changes, deleted accounts, disabled target forms, and empty reviewer resolution produce explicit states. No security-sensitive operation silently falls back to global visibility or global access.

## 9. Verification

Implementation follows test-first development using the repository's existing source-contract test pattern. Tests are added and observed failing before production changes.

Targeted coverage includes:

- super-administrator form list, edit routing, and pinning;
- actor-filtered scope options and fuzzy search;
- workflow serialization, legacy adaptation, validation, node activation, idempotency, defer/revision/re-review history, batch completion, fill-form grants, and notifications;
- permission assignment and effective capabilities;
- class-work portal visibility, news/activity creation, review, notification links, and audience enforcement across list, count, detail, and search;
- reimbursement permissions and OA inbox integration;
- academic-exchange brand consistency across applicant, reviewer, and batch PDFs;
- research-group member ordering, automatic publication relation, and visibility overrides;
- consistent account-role labels.

After targeted tests, verification runs `npm run lint`, a TypeScript check, and `npm run build`. Browser acceptance is performed against the existing local development services for ordinary users, teachers, administrators, and super administrators. It covers desktop and responsive layouts, keyboard interaction, authorization denials, workflow simulations and real transitions, content review, reimbursements, and research-group management.

No running cache directory is deleted during verification, and no production deployment command is used.

## 10. Delivery Order

The work is delivered in three independently verifiable phases:

1. Forms, audience picker, workflow editor/runtime, super-administrator form management, and approval history.
2. Account-role labels, platform permissions, class-work news/activity flow, notification routing, fixed reimbursement OA, reimbursement permissions, and PDF branding.
3. Research-group profile management, member ordering, automatic publication relation, and publication visibility.

Each phase includes its own tests, lint checks, browser acceptance, and integration review before the next phase begins.
