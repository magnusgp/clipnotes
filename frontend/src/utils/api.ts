import { api } from "../lib/api";
export class ApiError extends Error {
  readonly status: number;
  readonly payload: unknown;

  constructor(status: number, message: string, payload: unknown = null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
  }
}

export interface ApiRequestOptions extends RequestInit {
  /** Optional JSON body to serialise with the proper headers. */
  json?: unknown;
  /** Optional authentication token added as a Bearer header. */
  authToken?: string;
  /** Custom list of acceptable HTTP status codes; defaults to 200–204 range. */
  expectedStatus?: number | number[];
  /** Skip JSON parsing for endpoints returning raw payloads. */
  parseJson?: boolean;
}

const DEFAULT_EXPECTED = [200, 201, 202, 204];

function buildHeaders(
  headersInit: HeadersInit | undefined,
  authToken: string | undefined,
  hasJsonBody: boolean,
  body: BodyInit | null | undefined,
): Headers {
  const headers = new Headers(headersInit ?? undefined);
  headers.set("Accept", "application/json");

  if (authToken) {
    headers.set("Authorization", `Bearer ${authToken}`);
  }

  const isFormPayload = body instanceof FormData;
  if (hasJsonBody && !isFormPayload) {
    headers.set("Content-Type", "application/json");
  } else if (body && !headers.has("Content-Type") && !isFormPayload) {
    headers.set("Content-Type", "application/json");
  }

  return headers;
}

export async function apiRequest<T>(path: string, init: ApiRequestOptions = {}): Promise<T> {
  const { json, authToken, expectedStatus, parseJson, headers: headersInit, body, ...fetchOptions } = init;

  const expectedList = Array.isArray(expectedStatus)
    ? expectedStatus
    : expectedStatus !== undefined
    ? [expectedStatus]
    : DEFAULT_EXPECTED;

  const headers = buildHeaders(headersInit, authToken, json !== undefined, body ?? null);
  const payload: RequestInit = {
    ...fetchOptions,
    headers,
  };

  if (json !== undefined) {
    payload.body = JSON.stringify(json);
  } else if (body !== undefined) {
    payload.body = body;
  }

  const response = await api(path, payload);

  if (!expectedList.includes(response.status)) {
    let errorPayload: unknown = null;
    try {
      errorPayload = await response.json();
    } catch {
      errorPayload = await response.text();
    }
    const message =
      typeof errorPayload === "object" && errorPayload !== null && "error" in errorPayload
        ? String((errorPayload as Record<string, unknown>).error)
        : `Request failed with status ${response.status}`;
    throw new ApiError(response.status, message, errorPayload);
  }

  if (parseJson === false || response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  if (!text) {
    return undefined as T;
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new ApiError(response.status, "Failed to parse JSON response", text);
  }
}
