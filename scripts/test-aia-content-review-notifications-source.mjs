import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

test("content-review notifications route explicitly to class work and are never classified as Coffee Talk", async () => {
  const [backend, client] = await Promise.all([
    readFile("convex/oaForms.ts", "utf8"),
    readFile("src/components/notifications/aia-notification-inbox-client.tsx", "utf8"),
  ])

  const hrefResolver = backend.slice(
    backend.indexOf("async function genericNotificationHref"),
    backend.indexOf("export const listMyNotifications"),
  )
  assert.match(hrefResolver, /notification\.kind === "content_review"/)
  assert.match(hrefResolver, /\/class-work\/\$\{submission\.category\}\/submissions\//)

  const projection = backend.slice(
    backend.indexOf("export const listMyNotifications"),
    backend.indexOf("export const markMyNotificationRead"),
  )
  assert.match(projection, /notification\.kind === "content_review"\s*\?\s*"class-work"/)
  assert.match(projection, /notification\.kind === "content_review"\s*\?\s*"content_review"/)
  assert.doesNotMatch(client, /category \?\? \(hasGenericNotificationHooks \? "general" : "coffee-talk"\)/)
})
