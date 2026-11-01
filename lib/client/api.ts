import type { Failure, Success } from "../../shared/api.ts";
export class ApiClientError extends Error {
  readonly status: number;
  readonly fieldErrors: Record<string, string[]>;
  constructor(
    message: string,
    status = 0,
    fieldErrors: Record<string, string[]> = {},
  ) {
    super(message);
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}
export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!path.startsWith("/") || path.startsWith("//"))
    throw new ApiClientError("Invalid service path.");
  let response: Response;
  const timeout = AbortSignal.timeout(25000);
  const signal = init.signal
    ? AbortSignal.any([init.signal, timeout])
    : timeout;
  try {
    response = await fetch("/api/v1" + path, {
      ...init,
      credentials: "same-origin",
      cache: "no-store",
      signal,
    });
  } catch (error) {
    if (init.signal?.aborted) throw error;
    throw new ApiClientError(
      "The service could not be reached. Your details are still on this page. Try again.",
    );
  }
  let result: unknown;
  try {
    result = await response.json();
  } catch {
    throw new ApiClientError(
      "The service returned an unreadable response. Try again.",
      response.status,
    );
  }
  if (!response.ok) {
    const failure = result as Partial<Failure>;
    throw new ApiClientError(
      failure.error?.message ?? "The request could not be completed.",
      response.status,
      failure.error?.field_errors ?? {},
    );
  }
  if (!result || typeof result !== "object" || !("data" in result))
    throw new ApiClientError(
      "The service returned an incomplete response.",
      response.status,
    );
  return (result as Success<T>).data;
}
export function post<T>(path: string, body: unknown): Promise<T> {
  return api<T>(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
export function signInPath(returnTo: string): string {
  const safe =
    returnTo.startsWith("/") && !returnTo.startsWith("//")
      ? returnTo
      : "/workspace";
  return "/signin-with-chatgpt?return_to=" + encodeURIComponent(safe);
}
export function message(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "The request could not be completed.";
}
export function requestIdentity(
  previous: { payload: string; id: string } | null,
  payload: unknown,
) {
  const serialized = JSON.stringify(payload);
  return previous?.payload === serialized
    ? previous
    : { payload: serialized, id: crypto.randomUUID() };
}
