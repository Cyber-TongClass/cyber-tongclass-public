import { query } from "./_generated/server"

// Compatibility shim for the early TechDay prototype module.
// The production implementation lives under convex/techday/*.
export const overview = query({
  args: {},
  handler: async (ctx) => {
    const submissions = await ctx.db
      .query("techDaySubmissions")
      .filter((q) => q.eq(q.field("reviewStatus"), "approved"))
      .take(12)

    const posts = await ctx.db
      .query("techDayPosts")
      .withIndex("by_published_date", (q) => q.eq("published", true))
      .order("desc")
      .take(6)

    return {
      announcements: posts.map((post) => ({
        _id: post._id,
        title: post.title,
        body: post.summary,
        category: post.category || "general",
        publishedAt: Date.parse(post.date) || post.updatedAt,
      })),
      sessions: [],
      acceptedSubmissions: submissions.map((submission) => ({
        _id: submission._id,
        title: submission.title,
        authors: Array.isArray(submission.authors)
          ? submission.authors
          : submission.authors
            ? String(submission.authors).split(",").map((author: string) => author.trim()).filter(Boolean)
            : [],
        topic: "other",
        status: submission.reviewStatus === "approved" ? "accepted" : submission.reviewStatus,
      })),
    }
  },
})
