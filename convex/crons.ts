import { cronJobs, makeFunctionReference } from "convex/server"

const crons = cronJobs()
const runScheduled = makeFunctionReference<"action">("externalNewsSync:runScheduled")

crons.interval("discover fixed AIA external news", { hours: 1 }, runScheduled, {})

export default crons
