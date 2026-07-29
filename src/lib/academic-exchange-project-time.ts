const PROJECT_TIME_PATTERN =
  /^(\d{4})[./-](\d{1,2})[./-](\d{1,2})\s*(?:-|–|—|~|至)\s*(\d{4})[./-](\d{1,2})[./-](\d{1,2})$/

function validDate(year: number, month: number, day: number) {
  const timestamp = Date.UTC(year, month - 1, day)
  const date = new Date(timestamp)
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
    ? timestamp
    : null
}

export function validateAcademicExchangeProjectTime(value: string) {
  const match = value.trim().match(PROJECT_TIME_PATTERN)
  if (!match) return "项目时间请按“YYYY-MM-DD 至 YYYY-MM-DD”填写。"
  const [, startYear, startMonth, startDay, endYear, endMonth, endDay] = match
  const start = validDate(Number(startYear), Number(startMonth), Number(startDay))
  const end = validDate(Number(endYear), Number(endMonth), Number(endDay))
  if (start === null || end === null) return "项目时间包含无效日期。"
  if (end < start) return "项目结束日期不能早于开始日期。"
  return null
}
