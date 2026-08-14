const MARKER_PATTERN = /[□☐○◯☒☑●■]/g

export function normalizeWordChoiceOption(value: string) {
  return value.normalize("NFKC").replace(/[（(].*$/, "").replace(/[\u00a0\u3000]/g, " ").replace(/\s+/g, " ").trim()
}

function groupLabel(value: string) {
  return value.normalize("NFKC")
    .replace(/^[一二三四五六七八九十0-9]+[、.．]\s*/, "")
    .replace(/[：:]\s*$/, "")
    .replace(/[\u00a0\u3000]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 100)
}

interface ChoiceRecord { option: string; group: string }

function choiceRecords(paragraphTexts: readonly string[]) {
  const records: ChoiceRecord[] = []
  let group = ""
  for (const text of paragraphTexts) {
    const markers = [...text.matchAll(MARKER_PATTERN)]
    if (!markers.length) {
      const nextGroup = groupLabel(text)
      if (nextGroup) group = nextGroup
      continue
    }
    const prefix = text.slice(0, markers[0].index ?? 0)
    const inlineGroup = groupLabel(prefix)
    if (inlineGroup) group = inlineGroup
    markers.forEach((marker, index) => {
      const start = (marker.index ?? 0) + marker[0].length
      const end = markers[index + 1]?.index ?? text.length
      const option = normalizeWordChoiceOption(text.slice(start, end))
      if (option) records.push({ option, group })
    })
  }
  return records
}

export function extractVisibleWordChoiceOptions(paragraphTexts: readonly string[]) {
  return choiceRecords(paragraphTexts).map((record) => record.option)
}

export function extractGroupedWordChoiceOptions(paragraphTexts: readonly string[]) {
  const records = choiceRecords(paragraphTexts)
  const optionCounts = new Map<string, number>()
  const baseCounts = new Map<string, number>()
  for (const record of records) {
    optionCounts.set(record.option, (optionCounts.get(record.option) || 0) + 1)
    const base = `${record.group}|${record.option}`
    baseCounts.set(base, (baseCounts.get(base) || 0) + 1)
  }
  const occurrences = new Map<string, number>()
  return records.map((record) => {
    if ((optionCounts.get(record.option) || 0) === 1) return record.option
    const base = `${record.group}|${record.option}`
    const occurrence = (occurrences.get(base) || 0) + 1
    occurrences.set(base, occurrence)
    const prefix = (baseCounts.get(base) || 0) > 1 ? `${record.group || "选项"} ${occurrence}` : record.group || "选项"
    return `${prefix} · ${record.option}`
  })
}

export function visibleWordChoiceOption(value: string) {
  const parts = value.split(/\s+·\s+/)
  return normalizeWordChoiceOption(parts.at(-1) || value)
}
