"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { PublicationAuthorEditor } from "@/components/publications/publication-author-editor"
import { PublicationVenueInput } from "@/components/publications/publication-venue-input"
import { ArrowLeft, Save } from "lucide-react"
import { useAuth } from "@/lib/hooks/use-auth"
import {
  usePublicationById,
  usePublicationVenues,
  usePublications,
  useCreatePublication,
  useUpdatePublication,
  useUsers,
} from "@/lib/api"
import { findSimilarPublicationTitle } from "@/lib/publication-title-match"
import { canEditPublication } from "@/lib/publication-authors"
import { getPublicationVenueOptions } from "@/lib/publication-venues"
import {
  CUSTOM_PUBLICATION_CATEGORY_VALUE,
  CUSTOM_PUBLICATION_SUBCATEGORY_VALUE,
  DEFAULT_PUBLICATION_CATEGORY,
  getPublicationCategoryOptions,
  getPublicationSubCategoryOptions,
  isKnownPublicationCategory,
  isKnownPublicationSubCategory,
} from "@/lib/publication-taxonomy"
import type { Publication } from "@/types"

type PublicationFormData = {
  title: string
  authors: string[]
  publicationStatus: "" | "published" | "preprint"
  venue: string
  year: string
  abstract: string
  url: string
  category: string
  subCategory: string
}

const currentYear = new Date().getFullYear()
const PREPRINT_VENUE = "arXiv Preprint"

function isPreprintVenue(venue: string) {
  return venue.trim().toLowerCase() === PREPRINT_VENUE.toLowerCase()
}

export default function MyPublicationEditorPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const publicationId = params.id
  const isCreateMode = publicationId === "new"

  const { currentUser, isAuthenticated, isLoading: authLoading } = useAuth()

  // Fetch publication from Convex
  const publicationData = usePublicationById(isCreateMode ? undefined : (publicationId as string))
  const publicationsData = usePublications({ limit: 1000 })
  const publications: Publication[] = publicationsData || []
  const publicationVenuesData = usePublicationVenues() || []
  const usersData = useUsers({ limit: 1000, classMembersOnly: true })
  const users = usersData || []
  const createPublication = useCreatePublication()
  const updatePublicationFn = useUpdatePublication()

  const [loading, setLoading] = useState(true)
  const [publication, setPublication] = useState<Publication | null>(null)
  const [forbidden, setForbidden] = useState(false)
  const [formError, setFormError] = useState("")
  const [authorError, setAuthorError] = useState("")
  const [hasInvalidTongClassAuthor, setHasInvalidTongClassAuthor] = useState(false)
  const [customCategory, setCustomCategory] = useState("")
  const [customSubCategory, setCustomSubCategory] = useState("")
  const [formData, setFormData] = useState<PublicationFormData>({
    title: "",
    authors: [],
    publicationStatus: "",
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

    if (!canEditPublication(publicationData, currentUser._id)) {
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
      authors: publicationData.authors,
      publicationStatus: isPreprintVenue(publicationData.venue) ? "preprint" : "published",
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

  const similarTitleMatch = useMemo(() => {
    if (!isCreateMode) return null
    return findSimilarPublicationTitle(formData.title, publications)
  }, [formData.title, isCreateMode, publications])

  const venueOptions = useMemo(() => {
    return Array.from(
      new Set([
        ...publicationVenuesData.map((venue: any) => venue.name),
        ...getPublicationVenueOptions(publications),
      ])
    ).sort((a, b) => a.localeCompare(b))
  }, [publicationVenuesData, publications])

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

    if (isCreateMode && similarTitleMatch) {
      const message = similarTitleMatch.exact
        ? `已有一篇标题相同的成果：\n《${similarTitleMatch.publication.title}》\n\n仍要继续创建吗？`
        : `可能已有一篇标题非常相似的成果：\n《${similarTitleMatch.publication.title}》\n\n仍要继续创建吗？`
      if (!window.confirm(message)) {
        return
      }
    }

    const parsedAuthors = formData.authors.filter(Boolean)
    if (parsedAuthors.length === 0) {
      setAuthorError("请至少填写一位作者。")
      return
    }

    if (hasInvalidTongClassAuthor) {
      setAuthorError("有作者姓名匹配到通班成员，但尚未选择“是他”或“不是他”。请先确认后再保存。")
      return
    }
    setAuthorError("")

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

    if (!formData.publicationStatus) {
      setFormError("请选择成果状态。")
      return
    }

    const finalVenue = formData.publicationStatus === "preprint"
      ? PREPRINT_VENUE
      : formData.venue.trim()

    if (formData.publicationStatus === "published" && !finalVenue) {
      setFormError("请填写会议/期刊。")
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
      venue: finalVenue,
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
                {similarTitleMatch && (
                  <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                    {similarTitleMatch.exact ? "已有标题相同的成果：" : "可能已有标题非常相似的成果："}
                    <span className="font-semibold">《{similarTitleMatch.publication.title}》</span>
                    <span className="ml-1 text-amber-700">
                      {similarTitleMatch.publication.venue} · {similarTitleMatch.publication.year}
                    </span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <PublicationAuthorEditor
                  value={formData.authors}
                  users={users}
                  error={authorError}
                  onValidationChange={setHasInvalidTongClassAuthor}
                  onChange={(authors) => {
                    setAuthorError("")
                    setFormData((previous) => ({ ...previous, authors }))
                  }}
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
                  <Label htmlFor="publicationStatus">成果状态</Label>
                  <div id="publicationStatus" className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Button
                      type="button"
                      variant={formData.publicationStatus === "published" ? "default" : "outline"}
                      onClick={() =>
                        setFormData((previous) => ({
                          ...previous,
                          publicationStatus: "published",
                          venue: isPreprintVenue(previous.venue) ? "" : previous.venue,
                        }))
                      }
                    >
                      已发表论文
                    </Button>
                    <Button
                      type="button"
                      variant={formData.publicationStatus === "preprint" ? "default" : "outline"}
                      onClick={() =>
                        setFormData((previous) => ({
                          ...previous,
                          publicationStatus: "preprint",
                          venue: PREPRINT_VENUE,
                        }))
                      }
                    >
                      Preprint
                    </Button>
                  </div>
                </div>
                {formData.publicationStatus === "published" ? (
                  <div className="space-y-2">
                    <Label htmlFor="venue">会议/期刊</Label>
                    <PublicationVenueInput
                      id="venue"
                      placeholder="简称 (全称)，如 ICML (International Conference on Machine Learning)"
                      value={formData.venue}
                      venues={venueOptions}
                      onChange={(venue) => setFormData((previous) => ({ ...previous, venue }))}
                      required
                    />
                    <p className="text-[11px] text-slate-400">请统一使用英文括号 <code>()</code>，为兼容老数据已有中文括号会自动替换。</p>
                  </div>
                ) : formData.publicationStatus === "preprint" ? (
                  <p className="rounded-md bg-slate-100 px-3 py-2 text-sm text-slate-600">
                    Preprint 将自动记录为 <span className="font-semibold text-slate-900">{PREPRINT_VENUE}</span>。
                  </p>
                ) : null}
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
