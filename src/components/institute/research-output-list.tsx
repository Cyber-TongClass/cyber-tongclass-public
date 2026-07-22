import { BookOpenText } from "lucide-react"
import type { PublicResearchOutput } from "@/components/institute/demo-directory-data"

type ResearchOutputListProps = {
  outputs: readonly PublicResearchOutput[]
  heading?: string
  emptyMessage?: string
}

export function ResearchOutputList({
  outputs,
  heading = "相关成果",
  emptyMessage = "暂未发布可公开展示的相关成果。",
}: ResearchOutputListProps) {
  return (
    <section aria-labelledby="research-output-title" className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-primary">
          <BookOpenText className="h-5 w-5" aria-hidden="true" />
        </div>
        <div>
          <h2 id="research-output-title" className="text-xl font-extrabold tracking-tight text-slate-900">
            {heading}
          </h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">仅展示已批准公开的目录条目。</p>
        </div>
      </div>

      {outputs.length > 0 ? (
        <ul className="mt-6 space-y-3" aria-label={heading}>
          {outputs.map((output) => (
            <li key={output.id} className="rounded-lg border border-slate-200 p-4">
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-primary">
                <span>{output.kind}</span>
                <span aria-hidden="true">·</span>
                <span>{output.year}</span>
                {output.isDemo ? (
                  <span className="rounded-full bg-amber-50 px-2 py-0.5 text-amber-800">演示数据</span>
                ) : null}
              </div>
              <h3 className="mt-2 text-base font-bold text-slate-900">{output.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{output.summary}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-6 rounded-lg bg-slate-50 p-4 text-sm leading-6 text-slate-600">{emptyMessage}</p>
      )}
    </section>
  )
}
