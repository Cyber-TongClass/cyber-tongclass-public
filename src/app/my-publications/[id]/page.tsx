"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft, Save } from "lucide-react"
import { useAuth } from "@/lib/hooks/use-auth"
import { usePublicationById, useCreatePublication, useUpdatePublication } from "@/lib/api"
import {
  CUSTOM_PUBLICATION_CATEGORY_VALUE,
  CUSTOM_PUBLICATION_SUBCATEGORY_VALUE,
  DEFAULT_PUBLICATION_CATEGORY,
  formatPublicationAuthors,
  getPublicationCategoryOptions,
  getPublicationSubCategoryOptions,
  isKnownPublicationCategory,
  isKnownPublicationSubCategory,
  parsePublicationAuthors,
} from "@/lib/publication-taxonomy"
import type { Publication } from "@/types"

type PublicationFormData = {
  title: string
  authors: string
  venue: string
  year: string
  abstract: string
  url: string
  category: string
  subCategory: string
}

const currentYear = new Date().getFullYear()

export default function MyPublicationEditorPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const publicationId = params.id
  const isCreateMode = publicationId === "new"

  const { currentUser, isAuthenticated, isLoading: authLoading } = useAuth()

  // Fetch publication from Convex
  const publicationData = usePublicationById(isCreateMode ? undefined : (publicationId as string))
  const createPublication = useCreatePublication()
  const updatePublicationFn = useUpdatePublication()

  const [loading, setLoading] = useState(true)
  const [publication, setPublication] = useState<Publication | null>(null)
  const [forbidden, setForbidden] = useState(false)
  const [formError, setFormError] = useState("")
  const [customCategory, setCustomCategory] = useState("")
  const [customSubCategory, setCustomSubCategory] = useState("")
  const [formData, setFormData] = useState<PublicationFormData>({
    title: "",
    authors: "",
    venue: "",
    year: String(currentYear),
    abstract: "",
    url: "",
    category: DEFAULT_PUBLICATION_CATEGORY,
    subCategory: "",
  })

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push(`/login?next=${encodeURIComponent(`/my-publications/${publicationId}`)}`)
    }
  }, [authLoading, isAuthenticated, publicationId, router])

  useEffect(() => {
    if (!currentUser) {
      return
    }

    if (isCreateMode) {
      setForbidden(false)
      setPublication(null)
      setLoading(false)
      return
    }

    if (publicationData === undefined) {
      return
    }

    if (!publicationData) {
      setLoading(false)
      return
    }

    if (publicationData.userId !== currentUser._id) {
      setForbidden(true)
      setLoading(false)
      return
    }

    setForbidden(false)
    setPublication(publicationData)
    const publicationCategory = publicationData.category
    const publicationSubCategory = publicationData.subCategory || ""
    const categoryIsKnown = isKnownPublicationCategory(publicationCategory)
    const subCategoryIsKnown = categoryIsKnown && isKnownPublicationSubCategory(publicationCategory, publicationSubCategory)

    setCustomCategory(categoryIsKnown ? "" : publicationCategory)
    setCustomSubCategory(publicationSubCategory && !subCategoryIsKnown ? publicationSubCategory : "")
    setFormData({
      title: publicationData.title,
      authors: formatPublicationAuthors(publicationData.authors),
      venue: publicationData.venue,
      year: String(publicationData.year),
      abstract: publicationData.abstract,
      url: publicationData.url || "",
      category: categoryIsKnown ? publicationCategory : CUSTOM_PUBLICATION_CATEGORY_VALUE,
      subCategory: publicationSubCategory
        ? (subCategoryIsKnown ? publicationSubCategory : CUSTOM_PUBLICATION_SUBCATEGORY_VALUE)
        : "",
    })
    setLoading(false)
  }, [currentUser, isCreateMode, publicationData])

  const categoryOptions = useMemo(
    () => getPublicationCategoryOptions(formData.category),
    [formData.category]
  )

  const subCategoryOptions = useMemo(
    () => getPublicationSubCategoryOptions(formData.category, formData.subCategory),
    [formData.category, formData.subCategory]
  )

  const handleCategoryChange = (category: string) => {
    const nextSubCategoryOptions =
      category === CUSTOM_PUBLICATION_CATEGORY_VALUE ? [] : getPublicationSubCategoryOptions(category)
    setFormData((previous) => ({
      ...previous,
      category,
      subCategory: nextSubCategoryOptions.includes(previous.subCategory) ? previous.subCategory : "",
    }))
    if (category !== CUSTOM_PUBLICATION_CATEGORY_VALUE) {
      setCustomCategory("")
      if (formData.subCategory === CUSTOM_PUBLICATION_SUBCATEGORY_VALUE) {
        setCustomSubCategory("")
      }
    }
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!currentUser) {
      return
    }

    const parsedAuthors = parsePublicationAuthors(formData.authors)
    if (parsedAuthors.length === 0) {
      setFormError("请至少填写一位作者。")
      return
    }

    const parsedYear = Number(formData.year)
    if (!Number.isInteger(parsedYear) || parsedYear < 1900 || parsedYear > currentYear + 1) {
      setFormError("发表年份格式不正确。")
      return
    }

    const finalCategory =
      formData.category === CUSTOM_PUBLICATION_CATEGORY_VALUE
        ? customCategory.trim()
        : formData.category
    if (!finalCategory) {
      setFormError("请填写领域。")
      return
    }

    const finalSubCategory =
      formData.subCategory === CUSTOM_PUBLICATION_SUBCATEGORY_VALUE
        ? customSubCategory.trim()
        : formData.subCategory.trim()

    setFormError("")

    const payload = {
      title: formData.title.trim(),
      authors: parsedAuthors,
      venue: formData.venue.trim(),
      year: parsedYear,
      abstract: formData.abstract.trim(),
      url: formData.url.trim() || undefined,
      category: finalCategory,
      subCategory: finalSubCategory || undefined,
    }

    if (isCreateMode) {
      await createPublication({
        ...payload,
        userId: currentUser._id,
      })
    } else if (publication) {
      await updatePublicationFn({ id: publication._id as any, ...payload })
    }

    router.push("/my-publications")
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-slate-600">Loading...</p>
      </div>
    )
  }

  if (!isAuthenticated || !currentUser) {
    return null
  }

  if (forbidden) {
    return (
      <div className="min-h-screen bg-gray-50 py-10 px-4">
        <div className="max-w-3xl mx-auto space-y-6">
          <Button variant="ghost" onClick={() => router.push("/my-publications")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            返回个人学术
          </Button>
          <Card>
            <CardContent className="pt-6">
              <p className="text-red-600">你没有权限编辑这条成果记录。</p>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (!isCreateMode && !publication) {
    return (
      <div className="min-h-screen bg-gray-50 py-10 px-4">
        <div className="max-w-3xl mx-auto space-y-6">
          <Button variant="ghost" onClick={() => router.push("/my-publications")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            返回个人学术
          </Button>
          <Card>
            <CardContent className="pt-6">
              <p className="text-gray-500">未找到该成果记录。</p>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        <Button variant="ghost" onClick={() => router.push("/my-publications")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          返回个人学术
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>{isCreateMode ? "新建学术成果" : "编辑学术成果"}</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label htmlFor="title">标题</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(event) => setFormData((previous) => ({ ...previous, title: event.target.value }))}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="authors">作者（换行或逗号分隔）</Label>
                <Textarea
                  id="authors"
                  rows={4}
                  value={formData.authors}
                  onChange={(event) => setFormData((previous) => ({ ...previous, authors: event.target.value }))}
                  placeholder={"例如：Alice Zhang\nBob Li\nCarol Wang"}
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category">领域</Label>
                  <select
                    id="category"
                    className="w-full h-10 px-3 rounded-md border border-input bg-white focus:outline-none focus:ring-2 focus:ring-ring"
                    value={formData.category}
                    onChange={(event) => handleCategoryChange(event.target.value)}
                    required
                  >
                    {categoryOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  {formData.category === CUSTOM_PUBLICATION_CATEGORY_VALUE && (
                    <Input
                      className="mt-2"
                      placeholder="请输入自定义领域"
                      value={customCategory}
                      onChange={(event) => setCustomCategory(event.target.value)}
                      required
                    />
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subCategory">子领域</Label>
                  <select
                    id="subCategory"
                    className="w-full h-10 px-3 rounded-md border border-input bg-white focus:outline-none focus:ring-2 focus:ring-ring"
                    value={formData.subCategory}
                    onChange={(event) => setFormData((previous) => ({ ...previous, subCategory: event.target.value }))}
                  >
                    <option value="">未指定</option>
                    {subCategoryOptions.map((subCategory) => (
                      <option key={subCategory} value={subCategory}>
                        {subCategory === CUSTOM_PUBLICATION_SUBCATEGORY_VALUE ? "其他 / 自定义" : subCategory}
                      </option>
                    ))}
                  </select>
                  {formData.subCategory === CUSTOM_PUBLICATION_SUBCATEGORY_VALUE && (
                    <Input
                      className="mt-2"
                      placeholder="请输入自定义子领域"
                      value={customSubCategory}
                      onChange={(event) => setCustomSubCategory(event.target.value)}
                      required
                    />
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="venue">会议/期刊</Label>
                  <Input
                    id="venue"
                    placeholder="简称 (全称)，如 ICML (International Conference on Machine Learning)"
                    value={formData.venue}
                    onChange={(event) => setFormData((previous) => ({ ...previous, venue: event.target.value }))}
                    required
                  />
                  <p className="text-[11px] text-slate-400">请统一使用英文括号 <code>()</code>，为兼容老数据已有中文括号会自动替换。</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="year">年份</Label>
                  <Input
                    id="year"
                    type="number"
                    min={1900}
                    max={currentYear + 1}
                    value={formData.year}
                    onChange={(event) => setFormData((previous) => ({ ...previous, year: event.target.value }))}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="url">论文主页链接（或arxiv链接）</Label>
                <Input
                  id="url"
                  type="url"
                  value={formData.url}
                  onChange={(event) => setFormData((previous) => ({ ...previous, url: event.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="abstract">Abstract</Label>
                <Textarea
                  id="abstract"
                  rows={6}
                  value={formData.abstract}
                  onChange={(event) => setFormData((previous) => ({ ...previous, abstract: event.target.value }))}
                  required
                />
              </div>

              {formError && <p className="text-sm text-red-600">{formError}</p>}

              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => router.push("/my-publications")}>
                  取消
                </Button>
                <Button type="submit" className="bg-blue-900 hover:bg-blue-800">
                  <Save className="h-4 w-4 mr-2" />
                  {isCreateMode ? "创建成果" : "保存修改"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
