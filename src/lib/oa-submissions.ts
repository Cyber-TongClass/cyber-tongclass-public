export type ReviewStatus = "pending" | "approved" | "rejected" | "needs_changes";

export type SubmissionFormSnapshot = {
  title: string;
  description?: string;
  fields: unknown[];
  resultFields?: unknown[];
  resultsVisible?: boolean;
};

export type SubmissionWithFormSnapshot = {
  formSnapshot?: SubmissionFormSnapshot | null;
};

export type FormSnapshotFallback = SubmissionFormSnapshot | null | undefined;

export type SubmissionForPresentation = {
  _id: string;
  formId: string;
  formTitle?: string;
  submittedAt: number;
  submitterName: string;
  reviewStatus: ReviewStatus;
  reviewerName?: string;
  reviewedAt?: number;
  adminNote?: string;
};

export type ApprovalTimelineNode = {
  label: string;
  actor: string;
  detail: string;
  timestamp?: number;
  state: "completed" | "in_progress" | ReviewStatus;
};

const reviewDetails: Record<ReviewStatus, string> = {
  pending: "等待管理员审核",
  approved: "审核已通过",
  rejected: "审核已拒绝",
  needs_changes: "需要补充或修改",
};

export function getSubmissionFormSnapshot(
  submission: SubmissionWithFormSnapshot,
  fallbackForm?: FormSnapshotFallback,
): SubmissionFormSnapshot | null {
  if (submission.formSnapshot) return submission.formSnapshot;
  if (!fallbackForm) return null;

  return {
    title: fallbackForm.title,
    ...(fallbackForm.description === undefined
      ? {}
      : { description: fallbackForm.description }),
    fields: fallbackForm.fields,
    ...(fallbackForm.resultFields === undefined
      ? {}
      : { resultFields: fallbackForm.resultFields }),
    ...(fallbackForm.resultsVisible === undefined
      ? {}
      : { resultsVisible: fallbackForm.resultsVisible }),
  };
}

export function getSubmissionTitle(
  submission: SubmissionForPresentation,
  all: SubmissionForPresentation[],
) {
  const sameForm = all
    .filter((row) => row.formId === submission.formId)
    .sort(
      (left, right) =>
        left.submittedAt - right.submittedAt || left._id.localeCompare(right._id),
    );
  const index = sameForm.findIndex((row) => row._id === submission._id);

  return `${submission.formTitle || "未命名表单"}的第 ${index + 1} 次提交`;
}

export function getApprovalTimeline(
  submission: SubmissionForPresentation,
): ApprovalTimelineNode[] {
  const reviewIsPending = submission.reviewStatus === "pending";
  const reviewDetail = reviewIsPending
    ? reviewDetails.pending
    : submission.adminNote
      ? `${reviewDetails[submission.reviewStatus]}：${submission.adminNote}`
      : reviewDetails[submission.reviewStatus];

  return [
    {
      label: "提交",
      actor: submission.submitterName,
      detail: "已提交表单",
      timestamp: submission.submittedAt,
      state: "completed",
    },
    {
      label: "管理员审核",
      actor: reviewIsPending
        ? "等待管理员"
        : submission.reviewerName || "管理员",
      detail: reviewDetail,
      timestamp: reviewIsPending ? undefined : submission.reviewedAt,
      state: reviewIsPending ? "in_progress" : submission.reviewStatus,
    },
    {
      label: "结束",
      actor: "",
      detail: reviewIsPending ? "等待审核完成" : reviewDetail,
      timestamp: reviewIsPending ? undefined : submission.reviewedAt,
      state: reviewIsPending ? "pending" : submission.reviewStatus,
    },
  ];
}
