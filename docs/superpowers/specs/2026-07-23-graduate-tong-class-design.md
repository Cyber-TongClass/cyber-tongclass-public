# Graduate Tong Class Design

## Goal

Give accounts with `identityType: "graduate"` a graduate-specific experience at `/tong-class`: a renamed product shell with only Members, Events, and Intranet navigation; a graduate roster; audience-aware events; and a four-item intranet.

## Identity and routing

The existing `identityType` stored on the authenticated account is the sole identity signal. The Tong Class shell reads it through `useAuth`. Graduate users see the product name `人工智能研究院研究生内网` and only the three required navigation entries. Undergraduate and other existing user experiences retain their current navigation and branding.

The Grad Members, Events, and Intranet URLs remain `/tong-class/members`, `/tong-class/events`, and `/tong-class/intranet`. The route components switch their view by the signed-in user identity; no parallel URL tree is introduced.

## Graduate member directory

Extend the existing directory query arguments with an optional `identityType`. When it equals `graduate`, the backend returns only accounts with `identityType: "graduate"`, regardless of `isClassMember`. The existing members page keeps its filters, card layout, and profile links; when the viewer is a graduate it requests the graduate roster and changes only graduate-facing heading and explanatory copy.

## Audience-aware events

Add an optional `audiences` array (`undergrad`, `graduate`) to event storage, event DTOs, create/update validators, and the administrator event editor. An absent or empty array means legacy shared visibility for both cohorts. The event list query accepts the authenticated session token when available and filters records with an explicit audience list to the viewer’s identity. Signed-out visitors receive only shared events. This preserves the current undergraduate event view unless an administrator explicitly restricts an event.

## Graduate intranet

The `/tong-class/intranet` page detects graduate identity and renders a fixed set of four modules: TechDay 科技节平台 (`/techday`), 资料下载 (`/tong-class/intranet/materials`), 报销 (`/tong-class/intranet/reimbursements`), and OA 填报 (`/tong-class/intranet/forms`). It bypasses the configurable undergraduate module list only for graduate users; undergraduate behavior remains unchanged. Existing OA scope rules continue to determine which forms a graduate may actually submit.

## Admin and data compatibility

No migration is needed: existing events without `audiences` remain visible to both undergraduate and graduate users. Administrators can optionally assign one or both audiences while creating or editing an event. The backend enforces roster and event visibility; frontend logic only selects the correct presentation.

## Verification

Add focused source-contract coverage for graduate navigation, identity-aware member and event queries, the audience editor and defaults, and the fixed Grad intranet modules. Run the focused script, lint, relevant existing test scripts, and local route checks.
