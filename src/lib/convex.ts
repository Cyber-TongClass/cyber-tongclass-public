"use client"

import { ConvexReactClient } from "convex/react"
import { aiaConvexUrl } from "./convex-endpoint"

export const convex = new ConvexReactClient(aiaConvexUrl)
