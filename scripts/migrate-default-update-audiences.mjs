import { execFileSync } from "node:child_process"

if (process.env.CONFIRM_UPDATE_AUDIENCE_MIGRATION !== "1") {
  console.error("Refusing to mutate data. Re-run with CONFIRM_UPDATE_AUDIENCE_MIGRATION=1.")
  process.exit(1)
}

const batchArguments = JSON.stringify({ limit: 100 })
let remaining = Number.POSITIVE_INFINITY

while (remaining > 0) {
  const output = execFileSync(
    "npx",
    ["convex", "run", "updateMigrations:backfillDefaultAudiences", batchArguments],
    { cwd: process.cwd(), encoding: "utf8" },
  ).trim()
  const result = JSON.parse(output)
  const updated = result.newsUpdated + result.eventsUpdated

  console.log(`Updated ${result.newsUpdated} news and ${result.eventsUpdated} events; ${result.remaining} remaining.`)

  if (updated === 0 && result.remaining > 0) {
    throw new Error("Migration made no progress while records remain.")
  }

  remaining = result.remaining
}

console.log("Audience migration complete.")
