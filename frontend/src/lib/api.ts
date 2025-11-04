export const API_BASE: string = typeof import.meta.env.VITE_API_BASE === "string" ? import.meta.env.VITE_API_BASE : "";

export const api = (path: string, init: RequestInit = {}) => {
  const url = `${API_BASE}${path}`;
  const { body, headers: headersInit, ...rest } = init;
  const headers = new Headers(headersInit ?? undefined);

  if (!(body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  return fetch(url, {
    ...rest,
    body,
    headers,
  });
};
