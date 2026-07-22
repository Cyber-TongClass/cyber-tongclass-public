# Teacher group-management capabilities

## Goal

Every teacher account receives a private default research group and the ability to manage that group's student membership. A super administrator may revoke that ability without deleting the group or its existing membership data.

## Data model

Add an `accountCapabilities` table. Each row represents one capability for one account and contains `userId`, `capability`, `enabled`, `grantedAt`, `updatedAt`, and the optional administrator who last changed it. The initial capability is `manage_research_group_members`. An index on `(userId, capability)` supports idempotent provisioning and authorization checks.

Add a reusable server helper that provisions a teacher's default resources. It creates missing capability rows as enabled but never re-enables a row that a super administrator disabled. It creates a hidden, private-by-default research group only when the teacher does not already lead a group, and binds the group's `leaderPersonId` to the teacher's directory profile. Existing groups, people, and memberships remain unchanged.

## Authorization and lifecycle

Create and update flows that produce a teacher identity invoke the provisioning helper. The existing super-admin historical-teacher synchronization mutation invokes the same helper, making it safe to run repeatedly after deployment.

The roster query returns an explicit `canManage` state. It lists groups and student data only when the current teacher has the capability and leads the group. Assignment and removal mutations independently enforce both conditions. Disabled teachers receive a clear non-editable state; they cannot mutate membership even if a client bypasses the UI.

A super-admin-only capability mutation permits changing `enabled` for a known capability and account. The institute bindings page exposes this toggle. Disabling the capability preserves the teacher's default group and all student assignments; re-enabling restores management of the same data.

## Error handling and verification

Unknown capability names, non-teacher targets, non-super-admin administrators, and attempts to manage another teacher's group are rejected server-side. Provisioning is idempotent: repeated runs neither create duplicate groups nor override an explicit disabled capability.

Focused tests cover default grant and group creation, non-duplication, disabled mutation rejection, and data preservation after revocation. Verification includes the relevant lint checks, Convex deployment compilation to the development deployment, function metadata inspection, and browser checks for teacher and administrator flows.
