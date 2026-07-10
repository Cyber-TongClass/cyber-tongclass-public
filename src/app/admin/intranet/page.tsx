"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  ArrowDown,
  ArrowUp,
  Eye,
  EyeOff,
  ExternalLink,
  LayoutGrid,
  RotateCcw,
  ShieldCheck,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useCC2026List, useCC2026Set } from "@/lib/api"
import { useAuth } from "@/lib/hooks/use-auth"
import { getCCSessionToken } from "@/lib/creative-challenge-2026"
import {
  createDefaultIntranetModuleSettings,
  defaultIntranetModules,
  normalizeIntranetModuleSettings,
  type IntranetModuleSetting,
} from "@/lib/intranet-modules"

export default function AdminIntranetModulesPage() {
  const { isSuperAdmin } = useAuth()
  const setCC2026Mutation = useCC2026Set()
  const cc2026IntranetModules = useCC2026List("intranet_modules")
  const [settings, setSettings] = useState<IntranetModuleSetting[]>([])

  useEffect(() => {
    const raw = (cc2026IntranetModules || []).find((d: any) => d.key === "_")
    if (raw) {
      try { setSettings(normalizeIntranetModuleSettings(JSON.parse(raw.value))) } catch { setSettings(createDefaultIntranetModuleSettings()) }
    } else {
      setSettings(createDefaultIntranetModuleSettings())
    }
  }, [cc2026IntranetModules])

  function persistSettings(normalizedSettings: IntranetModuleSetting[]) {
    setSettings(normalizedSettings)
    const st = getCCSessionToken()
    setCC2026Mutation({
      collection: "intranet_modules",
      key: "_",
      value: JSON.stringify(normalizedSettings),
      sessionToken: st || undefined,
    })
  }
  const [message, setMessage] = useState("")

  const modulesById = useMemo(
    () => new Map(defaultIntranetModules.map((module) => [module.id, module])),
    []
  )
  const visibleCount = settings.filter((item) => item.visible).length

  function persist(nextSettings: IntranetModuleSetting[], nextMessage = "内网模块设置已保存。") {
    const normalizedSettings = normalizeIntranetModuleSettings(nextSettings)
    persistSettings(normalizedSettings)
    setMessage(nextMessage)
  }

  function toggleModule(id: IntranetModuleSetting["id"], visible: boolean) {
    persist(settings.map((item) => item.id === id ? { ...item, visible } : item))
  }

  function moveModule(index: number, direction: -1 | 1) {
    const targetIndex = index + direction
    if (targetIndex < 0 || targetIndex >= settings.length) return

    const nextSettings = [...settings]
    const current = nextSettings[index]
    nextSettings[index] = nextSettings[targetIndex]
    nextSettings[targetIndex] = current
    persist(nextSettings)
  }

  function resetModules() {
    persist(createDefaultIntranetModuleSettings(), "已恢复默认模块顺序和显示状态。")
  }

  if (!isSuperAdmin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>内网模块管理</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-slate-600">
          只有超级管理员可以调整内网首页模块。
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="rounded-md border-blue-200 bg-blue-50 text-blue-800">
              内网首页
            </Badge>
            <Badge variant="outline" className="rounded-md border-violet-200 bg-violet-50 text-violet-800">
              超级管理员
            </Badge>
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900">内网模块管理</h1>
          <p className="mt-1 text-sm text-gray-500">
            调整内网首页模块的展示顺序，并选择哪些模块对成员可见。
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href="/intranet">
              <ExternalLink className="mr-2 h-4 w-4" />
              查看内网首页
            </Link>
          </Button>
          <Button variant="outline" onClick={resetModules}>
            <RotateCcw className="mr-2 h-4 w-4" />
            恢复默认
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">模块总数</CardTitle>
            <LayoutGrid className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold">{settings.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">当前展示</CardTitle>
            <Eye className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold">{visibleCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">已隐藏</CardTitle>
            <EyeOff className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold">{settings.length - visibleCount}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <ShieldCheck className="h-5 w-5 text-primary" />
            模块展示配置
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {message ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              {message}
            </div>
          ) : null}

          <div className="space-y-3">
            {settings.map((setting, index) => {
              const moduleDefinition = modulesById.get(setting.id)
              if (!moduleDefinition) return null
              const Icon = moduleDefinition.icon

              return (
                <div
                  key={setting.id}
                  className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 lg:grid-cols-[minmax(0,1fr)_160px_160px] lg:items-center"
                >
                  <div className="flex items-start gap-3">
                    <div className="rounded-lg bg-slate-100 p-2">
                      <Icon className="h-5 w-5 text-slate-700" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="font-semibold text-slate-950">{moduleDefinition.title}</h2>
                        <Badge variant={setting.visible ? "success" : "secondary"} className="rounded-md">
                          {setting.visible ? "展示中" : "已隐藏"}
                        </Badge>
                      </div>
                      <p className="mt-1 text-sm leading-6 text-slate-500">{moduleDefinition.description}</p>
                      <p className="mt-2 text-xs text-slate-400">{moduleDefinition.href}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={index === 0}
                      onClick={() => moveModule(index, -1)}
                    >
                      <ArrowUp className="mr-2 h-4 w-4" />
                      上移
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={index === settings.length - 1}
                      onClick={() => moveModule(index, 1)}
                    >
                      <ArrowDown className="mr-2 h-4 w-4" />
                      下移
                    </Button>
                  </div>

                  <label className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                    <span className="font-medium">在内网首页展示</span>
                    <input
                      type="checkbox"
                      checked={setting.visible}
                      onChange={(event) => toggleModule(setting.id, event.target.checked)}
                      className="h-4 w-4 rounded border-slate-300"
                    />
                  </label>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
