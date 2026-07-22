"use client"

import { useState, type KeyboardEvent } from "react"
import { X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AUDIENCE_OPTIONS, normalizeTags, type Audience } from "@/lib/updates"

type ContentTagsEditorProps = {
  audiences: Audience[]
  tags: string[]
  onAudiencesChange: (audiences: Audience[]) => void
  onTagsChange: (tags: string[]) => void
}

export function ContentTagsEditor({ audiences, tags, onAudiencesChange, onTagsChange }: ContentTagsEditorProps) {
  const [tagInput, setTagInput] = useState("")

  const toggleAudience = (audience: Audience) => {
    onAudiencesChange(
      audiences.includes(audience)
        ? audiences.filter((value) => value !== audience)
        : [...audiences, audience],
    )
  }

  const addTag = () => {
    const nextTags = normalizeTags([...tags, tagInput])
    if (nextTags.length !== tags.length) {
      onTagsChange(nextTags)
    }
    setTagInput("")
  }

  const handleTagKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter") return
    event.preventDefault()
    addTag()
  }

  return (
    <div className="space-y-5 rounded-md border border-slate-200 bg-slate-50 p-4">
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-slate-900">可见范围</legend>
        <p className="text-xs text-muted-foreground">可多选；未选择时，这条内容只会在“全部”中显示。</p>
        <div className="flex flex-wrap gap-x-5 gap-y-2 pt-1">
          {AUDIENCE_OPTIONS.map((option) => (
            <label key={option.value} className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={audiences.includes(option.value)}
                onChange={() => toggleAudience(option.value)}
                className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
              />
              {option.label}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="space-y-2">
        <Label htmlFor="custom-tag-input">自定义分类</Label>
        <div className="flex gap-2">
          <Input
            id="custom-tag-input"
            value={tagInput}
            onChange={(event) => setTagInput(event.target.value)}
            onKeyDown={handleTagKeyDown}
            placeholder="输入分类后按回车"
          />
          <button
            type="button"
            onClick={addTag}
            className="shrink-0 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            添加分类
          </button>
        </div>
        {tags.length > 0 ? (
          <div className="flex flex-wrap gap-2 pt-1">
            {tags.map((tag) => (
              <span key={tag} className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                {tag}
                <button
                  type="button"
                  aria-label={`删除分类 ${tag}`}
                  onClick={() => onTagsChange(tags.filter((value) => value !== tag))}
                  className="rounded-full p-0.5 hover:bg-primary/20"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  )
}
