import type { OAFormField, OAResultField } from "@/types";

export type ReviewStatus = "pending" | "approved" | "rejected" | "needs_changes";

export type SubmissionFormSnapshot = {
  title: string;
  description?: string;
  fields: OAFormField[];
  resultFields?: OAResultField[];
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

export type SubmissionDisplayField = {
  type?: string;
  columns?: Array<{ id: string; label?: string }>;
};

export type SubmissionAnswerDisplay =
  | { kind: "scalar"; text: string }
  | { kind: "multiple"; items: string[] }
  | { kind: "files"; files: Array<{ storageId: string; fileName: string }> }
  | { kind: "table"; columns: string[]; rows: string[][] };

const unavailableComplexValue = "复杂内容无法显示";

function isFileAnswer(value: unknown): value is { storageId: string; fileName: string } {
  return Boolean(
    value &&
      typeof value === "object" &&
      "storageId" in value &&
      typeof value.storageId === "string" &&
      "fileName" in value &&
      typeof value.fileName === "string",
  );
}

function displayText(value: unknown, empty = "-") {
  if (value === undefined || value === null || value === "") return empty;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return unavailableComplexValue;
}

/**
 * Produces a safe, UI-ready answer model without exposing raw serialized values.
 */
export function formatSubmissionAnswer(
  field: SubmissionDisplayField,
  value: unknown,
): SubmissionAnswerDisplay {
  if (field.type === "table") {
    const columns = field.columns || [];
    const rows = Array.isArray(value)
      ? value.flatMap((row) => {
          if (!row || typeof row !== "object" || Array.isArray(row)) return [];
          const cells = columns.map((column) => displayText(row[column.id], ""));
          return cells.some(Boolean) ? [cells] : [];
        })
      : [];

    return { kind: "table", columns: columns.map((column) => column.label || column.id), rows };
  }

  if (field.type === "file") {
    const files = Array.isArray(value) ? value.filter(isFileAnswer) : [];
    return { kind: "files", files };
  }

  if (Array.isArray(value)) {
    return { kind: "multiple", items: value.map((item) => displayText(item)).filter((item) => item !== "-") };
  }

  return { kind: "scalar", text: displayText(value) };
}

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
