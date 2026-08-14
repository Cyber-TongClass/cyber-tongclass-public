const EXCLUDED_SECTION_LABELS = /(?:清单|信息|经历|声明|签名|日期)$/
const NARRATIVE_CUES = /(?:阐述|概述|推荐信|说明|简介|事迹|理由|意见|摘要|成效|做法|创新|发现|价值)/

function normalized(value: string) {
  return value.normalize("NFKC").replace(/[\u00a0\u3000]/g, " ").replace(/\s+/g, " ").trim()
}

export function narrativeLengthHint(value: string) {
  const match = /(?:(?:不超过|最多|限)\s*(\d{1,6})\s*(?:个?字|字符)|(?:\(|（)?\s*(\d{1,6})\s*(?:个?字|字符)\s*(?:以内|内))/u.exec(normalized(value))
  return match ? Number(match[1] || match[2]) : undefined
}

export function genericNarrativeHeading(value: string) {
  const text = normalized(value)
  const match = /^[一二三四五六七八九十0-9]+[、.．]\s*(.+)$/u.exec(text)
  if (!match) return null
  const label = match[1]
    .replace(/[（(][^）)]*(?:(?:不超过|以内|最多|限)|字)[^）)]*[）)]/gu, "")
    .replace(/[：:]\s*$/u, "")
    .trim()
  if (!label || label.length > 100 || EXCLUDED_SECTION_LABELS.test(label) || !NARRATIVE_CUES.test(label)) return null
  return { label, maxLength: narrativeLengthHint(text) }
}

export function looksLikeNarrativeInstruction(value: string) {
  const text = normalized(value)
  return text.length > 0 && text.length <= 500 && (/^[（(]/u.test(text) || /(?:请|提炼|概括|阐述|总结|说明|字内|以内|不超过)/u.test(text))
}
