import type { ApiErrorBody } from "@/types/api";

export function getErrorMessage(err: unknown, fallback: string): string {
  const body = (err as { response?: { data?: ApiErrorBody } })?.response?.data;
  return body?.message || body?.error || fallback;
}
