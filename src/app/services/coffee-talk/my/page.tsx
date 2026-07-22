import { CoffeeTalkBackendUnavailableState } from "@/components/coffee-talk/coffee-talk-backend-unavailable-state"

export default function MyCoffeeTalkApplicationsPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-12 sm:py-16">
      <CoffeeTalkBackendUnavailableState
        title="Coffee Talk 状态查询暂未开放"
        message="当前无法加载个人 Coffee Talk 申请记录。服务接入后，此处将显示由服务器授权返回的状态。"
      />
    </main>
  )
}
