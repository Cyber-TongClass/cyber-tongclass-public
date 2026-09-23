export type ImportedQuizQuestion = {
  id: string;
  type: "single_choice" | "multiple_choice" | "fill_blank";
  difficulty?: "easy" | "medium" | "hard";
  stem: string;
  timeLimitSeconds?: number;
  explanation?: string;
  options?: { id: string; text: string }[];
  answer: string | string[];
};

/** Accept current banks and the original ToNG question/choices/correct-ans files. */
export function parseQuizImport(source: unknown): ImportedQuizQuestion[] {
  const rows = Array.isArray(source)
    ? source
    : source && typeof source === "object" && "questions" in source
      ? source.questions
      : null;
  if (!Array.isArray(rows) || rows.length < 1 || rows.length > 1000)
    throw new Error("文件须包含1–1000道题");
  const seen = new Set<string>();
  return rows.map((row: unknown, index) => {
    if (!row || typeof row !== "object")
      throw new Error(`第 ${index + 1} 题格式无效`);
    const q = row as Record<string, unknown>;
    const legacy = "correct-ans" in q;
    const id = String(q.id ?? index + 1);
    if (seen.has(id)) throw new Error(`重复的题目 ID：${id}`);
    seen.add(id);
    const type = q.type ?? (legacy ? "single_choice" : undefined);
    if (
      type !== "single_choice" &&
      type !== "multiple_choice" &&
      type !== "fill_blank"
    )
      throw new Error(`第 ${index + 1} 题类型无效`);
    const stem = q.stem ?? q.question;
    const answer = q.answer ?? q["correct-ans"];
    if (
      typeof stem !== "string" ||
      !stem.trim() ||
      !(
        typeof answer === "string" ||
        (Array.isArray(answer) &&
          answer.length &&
          answer.every((a) => typeof a === "string"))
      )
    )
      throw new Error(`第 ${index + 1} 题缺少题干或答案`);
    if (
      q.difficulty !== undefined &&
      !["easy", "medium", "hard"].includes(String(q.difficulty))
    )
      throw new Error(`第 ${index + 1} 题难度无效`);
    const timeLimitSeconds = q.timeLimitSeconds ?? 30;
    if (
      !Number.isInteger(timeLimitSeconds) ||
      Number(timeLimitSeconds) < 1 ||
      Number(timeLimitSeconds) > 3600
    )
      throw new Error(`第 ${index + 1} 题限时须为1–3600秒的整数`);
    if (
      q.explanation !== undefined &&
      (typeof q.explanation !== "string" || q.explanation.length > 20000)
    )
      throw new Error(`第 ${index + 1} 题解析格式无效`);
    const rawOptions = q.options ?? q.choices;
    const options = Array.isArray(rawOptions)
      ? rawOptions.map((option: unknown, i) => {
          if (typeof option === "string") {
            if (i >= 26) throw new Error("旧格式最多支持26个选项");
            return { id: String.fromCharCode(65 + i), text: option };
          }
          if (
            option &&
            typeof option === "object" &&
            "id" in option &&
            "text" in option &&
            typeof option.id === "string" &&
            typeof option.text === "string"
          )
            return { id: option.id, text: option.text };
          throw new Error(`第 ${index + 1} 题选项格式无效`);
        })
      : undefined;
    if (legacy && q["choice-count"] !== options?.length)
      throw new Error(`第 ${index + 1} 题选项数不一致`);
    if (type !== "fill_blank") {
      const keys = Array.isArray(answer) ? answer : [answer];
      if (
        !options ||
        options.length < 2 ||
        new Set(options.map((o) => o.id)).size !== options.length ||
        keys.some((a) => !options.some((o) => o.id === a)) ||
        (type === "single_choice" && keys.length !== 1)
      )
        throw new Error(`第 ${index + 1} 题答案与选项不一致`);
    }
    return {
      id,
      type,
      stem,
      ...(q.difficulty
        ? { difficulty: q.difficulty as ImportedQuizQuestion["difficulty"] }
        : {}),
      timeLimitSeconds: Number(timeLimitSeconds),
      explanation: (q.explanation as string | undefined) ?? "",
      ...(options ? { options } : {}),
      answer: answer as string | string[],
    };
  });
}
