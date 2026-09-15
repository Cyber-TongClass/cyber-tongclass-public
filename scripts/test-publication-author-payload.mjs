import assert from "node:assert/strict"
import { parsePublicationAuthors, toPublicationAuthorInput, toPublicPublicationAuthor } from "../src/lib/publication-authors.ts"

const authors = parsePublicationAuthors([
  "Alice [tc-author:%7B%22isTongClass%22%3Atrue%2C%22userId%22%3A%22u1%22%2C%22username%22%3A%22alice%22%2C%22coFirst%22%3Atrue%7D]",
  "Bob",
])
const details = authors.map(toPublicationAuthorInput)

assert.deepEqual(details.map((author) => author.snapshot), [
  "Alice [tc-author:%7B%22isTongClass%22%3Atrue%2C%22userId%22%3A%22u1%22%2C%22username%22%3A%22alice%22%2C%22coFirst%22%3Atrue%7D]",
  "Bob",
])
assert.equal(details[0].tongClassUserId, "u1")
assert.equal(details[0].tongClassUsername, "alice")
assert.equal(details[0].coFirst, true)
assert.equal(details[1].corresponding, false)

const linked = { name: 'Researcher', memberUserId: 'member-1', institutePersonSlug: 'researcher', skipAutoMatch: true, corresponding: true }
const linkedInput = toPublicationAuthorInput(linked)
const [roundTrip] = parsePublicationAuthors([linkedInput.snapshot])
assert.equal(roundTrip.memberUserId, linked.memberUserId)
assert.equal(roundTrip.institutePersonSlug, linked.institutePersonSlug)
assert.equal(roundTrip.skipAutoMatch, true)
assert.equal(roundTrip.corresponding, true)
assert.equal(linkedInput.snapshot, `Researcher [tc-author:${encodeURIComponent(JSON.stringify({institutePersonSlug:'researcher', memberUserId:'member-1', skipAutoMatch:true, corresponding:true}))}]`)
assert.deepEqual(toPublicPublicationAuthor(roundTrip).profile, { kind: 'institute_person', slug: 'researcher' })

console.log("publication author payload contract passed")
