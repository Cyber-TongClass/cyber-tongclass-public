export type CoffeeTalkStatus =
  | "submitted"
  | "under_review"
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

export const coffeeTalkStatusLabels: Readonly<Record<CoffeeTalkStatus, string>> = {
  submitted: "已提交",
  under_review: "审核中",
  accepted: "已接受",
  declined: "未通过",
  withdrawn: "已撤回",
  cancelled: "已取消",
  completed: "已完成",
}

export const coffeeTalkStatusColors: Readonly<Record<CoffeeTalkStatus, string>> = {
  submitted: "bg-sky-100 text-sky-800",
  under_review: "bg-amber-100 text-amber-800",
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
