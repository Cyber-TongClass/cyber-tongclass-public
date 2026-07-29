"use client"

// Compatibility barrel for older imports. Components must use the canonical,
// session-aware wrappers from src/lib/api.ts rather than calling Convex directly.
export {
  useApproveCourseReview,
  useCourseById,
  useCourseByName,
  useCourseListWithReviews as useCourseList,
  useCourseReviews,
  useCourses,
  useCreateCourse,
  useCreateCourseReview,
  useDeleteCourse,
  useDeleteCourseReview,
  usePendingReviews,
  useRejectCourseReview,
  useUpdateCourse,
  useUpdateCourseReview,
} from "@/lib/api"
