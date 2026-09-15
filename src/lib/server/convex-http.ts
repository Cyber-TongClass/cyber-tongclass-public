import { ConvexHttpClient } from "convex/browser"
import { aiaConvexUrl } from "../convex-endpoint"

export function getConvexHttpClient() {
    return new ConvexHttpClient(aiaConvexUrl)
}
