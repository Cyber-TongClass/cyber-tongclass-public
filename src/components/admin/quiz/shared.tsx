"use client";
import { useCallback, useEffect, useState } from "react";
import { useQuizAdmin } from "@/lib/api";
import type { QuizAdminResults } from "@/lib/quiz-contracts";
export function useAdminData<K extends keyof QuizAdminResults>(
  name: K,
  args: Record<string, unknown> = {},
) {
  const call = useQuizAdmin();
  const [data, setData] = useState<QuizAdminResults[K]>();
  const [error, setError] = useState("");
  const [version, setVersion] = useState(0);
  const key = JSON.stringify(args);
  useEffect(() => {
    let alive = true;
    setData(undefined);
    setError("");
    call(name, JSON.parse(key))
      .then((d) => {
        if (alive) setData(d);
      })
      .catch((e) => {
        if (alive) setError(e instanceof Error ? e.message : "加载失败");
      });
    return () => {
      alive = false;
    };
  }, [call, name, key, version]);
  const refresh = useCallback(() => setVersion((n) => n + 1), []);
  return { data, error, refresh, call };
}
export function Message({ error, note }: { error?: string; note?: string }) {
  return (
    <>
      {error && (
        <p
          role="alert"
          className="rounded-lg bg-red-50 p-3 text-sm text-red-700"
        >
          {error}
        </p>
      )}
      {note && (
        <p role="status" className="rounded-lg bg-primary/5 p-3 text-sm">
          {note}
        </p>
      )}
    </>
  );
}
export const fieldClass = "w-full rounded-md border bg-white px-3 py-2 text-sm";
export function message(e: unknown) {
  return e instanceof Error ? e.message : "操作失败";
}
