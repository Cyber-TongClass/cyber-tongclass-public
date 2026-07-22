"use client"

// Legacy import path retained for consumers. User mutations live exclusively
// in the canonical API layer so every call receives the stored main session.
export {
  useUsers,
  useUserById,
  useUserByEmail,
  useUserByStudentId,
  useUsersCount,
  useSearchUsers,
  useCreateUser,
  useUpdateUser,
  useUpdateUserRole,
  useDeleteUser,
} from "@/lib/api"
