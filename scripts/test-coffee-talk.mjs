import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import path from "node:path"
import test from "node:test"
import { pathToFileURL } from "node:url"

const domainUrl = pathToFileURL(path.resolve("convex/lib/coffeeTalk.ts")).href
const uiUrl = pathToFileURL(path.resolve("src/lib/coffee-talk.ts")).href
const coffeeTalk = await import(domainUrl)
const coffeeTalkUi = await import(uiUrl)

const nonterminalStatuses = [
  "submitted",
  "under_review",
  "accepted",
]

const terminalStatuses = ["declined", "withdrawn", "cancelled", "completed"]

test("Coffee Talk validation helpers accept only declared literals", () => {
  assert.equal(coffeeTalk.isCoffeeTalkStatus("submitted"), true)
  assert.equal(coffeeTalk.isCoffeeTalkStatus("reopened"), false)
  assert.equal(coffeeTalk.isCoffeeTalkActorKind("teacher"), true)
  assert.equal(coffeeTalk.isCoffeeTalkActorKind("admin"), false)
  assert.equal(coffeeTalk.isCoffeeTalkAction("request_information"), false)
  assert.equal(coffeeTalk.isCoffeeTalkAction("supplement"), false)
  assert.equal(coffeeTalk.isCoffeeTalkAction("reopen"), false)
})

test("Coffee Talk permits each applicant transition", () => {
  for (const status of nonterminalStatuses) {
    assert.equal(
      coffeeTalk.transitionCoffeeTalk(status, "applicant", "withdraw"),
      "withdrawn",
    )
  }
})

test("Coffee Talk permits each teacher transition", () => {
  assert.equal(
    coffeeTalk.transitionCoffeeTalk("submitted", "teacher", "start_review"),
    "under_review",
  )
  assert.equal(
    coffeeTalk.transitionCoffeeTalk("under_review", "teacher", "accept"),
    "accepted",
  )
  assert.equal(
    coffeeTalk.transitionCoffeeTalk("under_review", "teacher", "decline"),
    "declined",
  )
  assert.equal(
    coffeeTalk.transitionCoffeeTalk("accepted", "teacher", "complete"),
    "completed",
  )
})

test("Coffee Talk permits coordinator cancellation and nonterminal corrections", () => {
  for (const status of nonterminalStatuses) {
    assert.equal(
      coffeeTalk.transitionCoffeeTalk(status, "coordinator", "cancel"),
      "cancelled",
    )
    assert.equal(
      coffeeTalk.transitionCoffeeTalk(status, "coordinator", "reassign"),
      status,
    )
    assert.equal(
      coffeeTalk.transitionCoffeeTalk(status, "coordinator", "correct"),
      status,
    )
  }
})

test("Coffee Talk rejects terminal reopen attempts and unauthorized actions", () => {
  for (const status of terminalStatuses) {
    assert.throws(
      () => coffeeTalk.transitionCoffeeTalk(status, "teacher", "start_review"),
      /COFFEE_TALK_TRANSITION_FORBIDDEN/,
    )
    assert.throws(
      () => coffeeTalk.transitionCoffeeTalk(status, "coordinator", "correct"),
      /COFFEE_TALK_TRANSITION_FORBIDDEN/,
    )
  }

  assert.throws(
    () => coffeeTalk.transitionCoffeeTalk("submitted", "applicant", "accept"),
    /COFFEE_TALK_TRANSITION_FORBIDDEN/,
  )
  assert.throws(
    () => coffeeTalk.transitionCoffeeTalk("under_review", "system", "decline"),
    /COFFEE_TALK_TRANSITION_FORBIDDEN/,
  )
  assert.throws(
    () => coffeeTalk.transitionCoffeeTalk("under_review", "teacher", "request_information"),
    /COFFEE_TALK_TRANSITION_FORBIDDEN/,
  )
  assert.throws(
    () => coffeeTalk.transitionCoffeeTalk("submitted", "applicant", "supplement"),
    /COFFEE_TALK_TRANSITION_FORBIDDEN/,
  )
})

test("Coffee Talk reports open states and only actor-permitted actions", () => {
  for (const status of nonterminalStatuses) {
    assert.equal(coffeeTalk.isCoffeeTalkOpen(status), true)
  }
  for (const status of terminalStatuses) {
    assert.equal(coffeeTalk.isCoffeeTalkOpen(status), false)
  }

  assert.deepEqual(
    coffeeTalk.allowedCoffeeTalkActions("under_review", "teacher"),
    ["accept", "decline"],
  )
  assert.deepEqual(
    coffeeTalk.allowedCoffeeTalkActions("accepted", "teacher"),
    ["complete"],
  )
  assert.deepEqual(
    coffeeTalk.allowedCoffeeTalkActions("submitted", "coordinator"),
    ["cancel", "reassign", "correct"],
  )
  assert.deepEqual(coffeeTalk.allowedCoffeeTalkActions("completed", "coordinator"), [])
  assert.deepEqual(coffeeTalk.allowedCoffeeTalkActions("submitted", "system"), [])
})

test("Coffee Talk fingerprints canonicalize nested object ordering and trim strings", async () => {
  const first = await coffeeTalk.requestFingerprint({
    topic: "  Learning systems  ",
    details: {
      purpose: "  Discuss research  ",
      availability: [{ endAt: 2, startAt: 1, note: "  weekday  " }],
    },
  })
  const second = await coffeeTalk.requestFingerprint({
    details: {
      availability: [{ note: "weekday", startAt: 1, endAt: 2 }],
      purpose: "Discuss research",
    },
    topic: "Learning systems",
  })

  assert.equal(first, second)
  assert.match(first, /^[a-f0-9]{64}$/)
  assert.equal(
    coffeeTalk.canonicalCoffeeTalkRequestPayload({ z: { b: " two ", a: " one " }, a: " root " }),
    '{"a":"root","z":{"a":"one","b":"two"}}',
  )
})

test("Coffee Talk notifications are generic and never include application content", () => {
  const notification = coffeeTalk.coffeeTalkNotificationContent()
  const serialized = JSON.stringify(notification)

  assert.deepEqual(notification, {
    title: "Coffee Talk 申请状态更新",
    body: "请查看 Coffee Talk 申请的最新状态。",
  })
  assert.doesNotMatch(serialized, /confidential topic|private@tongclass\.example|Monday 09:00/i)
})

test("teacher redaction reveals applicant email only after acceptance", () => {
  const rawApplication = {
    _id: "coffeeTalkApplications:1",
    applicantUserId: "users:student",
    assignedTeacherUserId: "users:teacher",
    contentFingerprint: "sensitive-fingerprint",
    contactConsentAt: 1_700_000_000_000,
    status: "under_review",
    topic: "confidential topic",
    purpose: "Discuss a private project",
    availabilityWindows: [{ startAt: 1, endAt: 2 }],
    contactSnapshot: {
      displayName: "Student",
      email: "private@tongclass.example",
      phone: "+1-555-0100",
    },
    internalOnly: "must-not-leak",
  }

  const beforeAcceptance = coffeeTalk.redactCoffeeTalkForTeacher(rawApplication)
  assert.deepEqual(beforeAcceptance.contact, { displayName: "Student" })
  assert.equal(Object.hasOwn(beforeAcceptance.contact, "email"), false)
  assert.equal(Object.hasOwn(beforeAcceptance, "contactSnapshot"), false)
  assert.equal(Object.hasOwn(beforeAcceptance, "applicantUserId"), false)
  assert.equal(Object.hasOwn(beforeAcceptance, "contentFingerprint"), false)
  assert.equal(Object.hasOwn(beforeAcceptance, "internalOnly"), false)
  assert.notStrictEqual(beforeAcceptance.availabilityWindows, rawApplication.availabilityWindows)

  const accepted = coffeeTalk.redactCoffeeTalkForTeacher({
    ...rawApplication,
    status: "accepted",
  })
  const completed = coffeeTalk.redactCoffeeTalkForTeacher({
    ...rawApplication,
    status: "completed",
  })
  assert.equal(accepted.contact.email, "private@tongclass.example")
  assert.equal(completed.contact.email, "private@tongclass.example")
})

test("UI Coffee Talk metadata covers statuses and actions without Convex imports", () => {
  const statuses = [
    "submitted",
    "under_review",
    "accepted",
    "declined",
    "withdrawn",
    "cancelled",
    "completed",
  ]
  const actions = [
    "start_review",
    "accept",
    "decline",
    "withdraw",
    "cancel",
    "complete",
    "reassign",
    "correct",
  ]

  for (const status of statuses) {
    assert.equal(typeof coffeeTalkUi.coffeeTalkStatusLabel(status), "string")
    assert.equal(typeof coffeeTalkUi.coffeeTalkStatusColor(status), "string")
  }
  for (const action of actions) {
    assert.equal(typeof coffeeTalkUi.coffeeTalkActionLabel(action), "string")
  }

  const source = readFileSync("src/lib/coffee-talk.ts", "utf8")
  assert.doesNotMatch(source, /from\s+["'][^"']*convex|convex\//)
})
