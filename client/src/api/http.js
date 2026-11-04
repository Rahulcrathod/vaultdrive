const API_URL = import.meta.env.VITE_API_URL !== undefined
  ? import.meta.env.VITE_API_URL
  : (import.meta.env.PROD ? "" : "http://localhost:5000");

export async function api(path, options = {}) {
  const isRawBody =
    options.body instanceof FormData ||
    options.body instanceof Blob ||
    options.body instanceof ArrayBuffer ||
    options.body instanceof Uint8Array;

  const headers = { ...options.headers };
  if (options.body && !isRawBody && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: "include",
    headers
  });

  if (response.status === 204) return null;

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg = data.error || (data.details ? data.details.map(d => d.message).join(", ") : `Request failed with status ${response.status}`);
    throw new Error(errorMsg);
  }

  return data;
}

export { API_URL };
