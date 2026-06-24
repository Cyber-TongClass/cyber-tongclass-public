import Link from "next/link"
import { FileText } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

export default function ReviewerReimbursementsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-950">报销申请</h1>
        <p className="mt-1 text-sm text-slate-500">只读查看已授权的报销申请。</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Link href="/reviewer/reimbursements/academic-exchange">
          <Card className="transition hover:border-slate-400 hover:shadow-sm">
            <CardContent className="flex items-center gap-4 p-6">
              <span className="flex h-12 w-12 items-center justify-center rounded-md bg-slate-900 text-white">
                <FileText className="h-6 w-6" />
              </span>
              <span>
                <span className="block font-semibold text-slate-950">学术交流支持</span>
                <span className="text-sm text-slate-500">查看和下载学术交流支持申请表</span>
              </span>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  )
}
