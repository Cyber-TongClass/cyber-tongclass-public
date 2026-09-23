"use client";
import { useCallback, useSyncExternalStore } from "react";
import { makeFunctionReference } from "convex/server";
import { getQuizClient } from "./quiz-client";
import type { QuizAdminResults } from "./quiz-contracts";
const subscribe = (cb: () => void) => {
  window.addEventListener("storage", cb);
  window.addEventListener("tongclass-auth-storage", cb);
  return () => {
    window.removeEventListener("storage", cb);
    window.removeEventListener("tongclass-auth-storage", cb);
  };
};
const read = () => window.localStorage.getItem("tongclass_session_token") || "";
export function useQuizAdmin() {
  const token = useSyncExternalStore(subscribe, read, () => "");
  return useCallback(
    async <K extends keyof QuizAdminResults>(
      name: K,
      args: Record<string, unknown> = {},
    ): Promise<QuizAdminResults[K]> => {
      if (!token) throw new Error("请使用通班管理员账号登录");
      return getQuizClient().action(
        makeFunctionReference<"action">(`admin:${name}`),
        { ...args, mainToken: token },
      ) as Promise<QuizAdminResults[K]>;
    },
    [token],
  );
}
