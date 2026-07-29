export type CoffeeTalkStatus =
  | "submitted"
  | "under_review"
  | "needs_information"
  | "accepted"
  | "declined"
  | "withdrawn"
  | "cancelled"
  | "completed"

export type CoffeeTalkAction =
  | "start_review"
  | "accept"
  | "decline"
  | "withdraw"
  | "cancel"
  | "complete"
  | "reassign"
  | "correct"
  | "request_information"
  | "supplement"

export const coffeeTalkStatusLabels: Readonly<Record<CoffeeTalkStatus, string>> = {
  submitted: "已提交",
  under_review: "审核中",
  needs_information: "待补充材料",
  accepted: "已接受",
  declined: "未通过",
  withdrawn: "已撤回",
  cancelled: "已取消",
  completed: "已完成",
}

export const coffeeTalkStatusColors: Readonly<Record<CoffeeTalkStatus, string>> = {
  submitted: "bg-sky-100 text-sky-800",
  under_review: "bg-amber-100 text-amber-800",
  needs_information: "bg-violet-100 text-violet-800",
  accepted: "bg-emerald-100 text-emerald-800",
  declined: "bg-rose-100 text-rose-800",
  withdrawn: "bg-slate-100 text-slate-700",
  cancelled: "bg-slate-200 text-slate-800",
  completed: "bg-teal-100 text-teal-800",
}

export const coffeeTalkActionLabels: Readonly<Record<CoffeeTalkAction, string>> = {
  start_review: "开始审核",
  accept: "接受申请",
  decline: "婉拒申请",
  withdraw: "撤回申请",
  cancel: "取消申请",
  complete: "标记完成",
  reassign: "重新分配",
  correct: "更正记录",
  request_information: "请求补充材料",
  supplement: "提交补充材料",
}

export function coffeeTalkStatusLabel(status: CoffeeTalkStatus): string {
  return coffeeTalkStatusLabels[status]
}

export function coffeeTalkStatusColor(status: CoffeeTalkStatus): string {
  return coffeeTalkStatusColors[status]
}

export function coffeeTalkActionLabel(action: CoffeeTalkAction): string {
  return coffeeTalkActionLabels[action]
}

export function coffeeTalkErrorMessage(error: unknown, fallback = "操作未成功完成，请稍后重试。") {
  const message = error instanceof Error ? error.message : String(error || "")
  const mappings: Array<[string, string]> = [
    ["COFFEE_TALK_SUBMISSION_TOO_SOON", "提交过于频繁，请等待一分钟后再试。"],
    ["COFFEE_TALK_APPLICANT_OPEN_LIMIT_REACHED", "你已有多条处理中申请，请先等待现有申请结束。"],
    ["COFFEE_TALK_TEACHER_CAPACITY_REACHED", "该教师当前待处理申请已满，请选择其他教师或稍后再试。"],
    ["COFFEE_TALK_RATE_LIMITED", "当前申请数量或提交频率已达上限，请稍后再试。"],
    ["COFFEE_TALK_IDEMPOTENCY_CONFLICT", "本次提交标识已用于不同内容，请刷新表单后重新提交。"],
    ["COFFEE_TALK_VERSION_CONFLICT", "申请状态已更新，请刷新后再操作。"],
    ["COFFEE_TALK_ACTION_FORBIDDEN", "当前账户或申请状态不允许执行此操作。"],
    ["COFFEE_TALK_REASSIGNMENT_TARGET_REQUIRED", "请选择新的接待教师。"],
    ["COFFEE_TALK_ACTION_NOTE_REQUIRED", "请填写本次操作说明。"],
  ]
  return mappings.find(([code]) => message.includes(code))?.[1] || fallback
}
