import { z } from "zod";

/** The one error shape the Go API sends (RFC 9457 problem details). See api/http.go. */
const ProblemSchema = z.object({
  code: z.string(),
  detail: z.string().optional(),
  errors: z
    .array(z.object({ field: z.string(), message: z.string() }))
    .optional(),
});

export type ApiFieldError = { field: string; message: string };

export class ApiError extends Error {
  readonly status: number;
  /** Stable, machine-readable. Branch on this, never on the message. */
  readonly code: string;
  /** Filled on 422: one entry per request field the server rejected. */
  readonly fieldErrors: readonly ApiFieldError[];

  constructor(
    status: number,
    code: string,
    message: string,
    fieldErrors: readonly ApiFieldError[] = [],
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.fieldErrors = fieldErrors;
  }
}

/** Type guard: a caught error is `unknown` until we prove what it is. */
export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

/** Envelope of every list endpoint. Mirrors `page[T]` in api/http.go. */
export function pageOf<Item extends z.ZodType>(item: Item) {
  return z.object({ items: z.array(item), next_cursor: z.string().nullable() });
}

type RequestOptions<T> = {
  /** Types vanish at runtime; the schema does not. Every response is parsed. */
  schema: z.ZodType<T>;
  method?: "GET" | "POST";
  query?: Record<string, string | number | null | undefined>;
  body?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
};

/** The only place in the app that calls `fetch`. */
export async function api<T>(
  path: string,
  options: RequestOptions<T>,
): Promise<T> {
  const { schema, method = "GET", query, body, headers, signal } = options;

  const response = await fetch(`/api${path}${toQueryString(query)}`, {
    method,
    signal,
    headers: {
      Accept: "application/json",
      ...(body !== undefined && { "Content-Type": "application/json" }),
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (!response.ok) throw await toApiError(response);

  const payload: unknown =
    response.status === 204 ? undefined : await response.json();
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    // The backend broke the contract. Fail loudly here, not as wrong data on screen.
    console.error(
      `Contract mismatch on ${method} ${path}\n${z.prettifyError(parsed.error)}`,
    );
    throw new ApiError(
      response.status,
      "contract_mismatch",
      "The server sent an unexpected response.",
    );
  }
  return parsed.data;
}

async function toApiError(response: Response): Promise<ApiError> {
  const body: unknown = await response.json().catch(() => null);
  const problem = ProblemSchema.safeParse(body);
  if (!problem.success) {
    return new ApiError(
      response.status,
      "unknown_error",
      "Something went wrong. Please try again.",
    );
  }
  const { code, detail, errors } = problem.data;
  return new ApiError(
    response.status,
    code,
    detail ?? "Something went wrong. Please try again.",
    errors,
  );
}

function toQueryString(query: RequestOptions<unknown>["query"] = {}): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value != null && value !== "") params.set(key, String(value));
  }
  return params.size > 0 ? `?${params}` : "";
}
