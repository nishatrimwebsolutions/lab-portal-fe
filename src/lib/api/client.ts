export type ApiResponse<T> = Readonly<{ 
  data: T; 
  token?: string; 
  message?: string;
  [key: string]: any;
}>;

// Defaults to the same-origin proxy (src/app/api/[...path]/route.ts), which forwards to BACKEND_URL at runtime.
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "/api";

const getToken = (): string | null => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("pathology-lis-token");
};

async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const token = getToken();
  const headers = new Headers(options.headers || {});
  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const url = endpoint.startsWith("http") ? endpoint : `${API_BASE_URL}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;

  const res = await fetch(url, {
    ...options,
    headers,
  });

  const text = await res.text();
  let json: any = {};
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { message: text };
  }

  if (!res.ok) {
    let errorMsg = json.message || "";
    if (!errorMsg && json.error) {
      errorMsg = typeof json.error === "string" ? json.error : JSON.stringify(json.error);
    }
    if (!errorMsg && json.errors && Array.isArray(json.errors)) {
      errorMsg = json.errors.map((e: any) => e.message || (typeof e === "string" ? e : JSON.stringify(e))).join(", ");
    }
    if (!errorMsg) {
      if (res.status === 409) {
        errorMsg = "A conflict occurred. A record with this information already exists.";
      } else if (res.status === 400) {
        errorMsg = "Invalid input or validation error. Please check the entered fields.";
      } else if (res.status === 404) {
        errorMsg = "The requested resource was not found.";
      } else if (res.status === 403) {
        errorMsg = "Access denied for this operation.";
      } else {
        errorMsg = `Request failed with status ${res.status}`;
      }
    }
    const err: any = new Error(errorMsg);
    err.status = res.status;
    err.statusCode = res.status;
    err.response = { status: res.status, data: json };
    throw err;
  }

  return {
    data: json.data !== undefined ? json.data : json,
    token: json.token || (json.data && json.data.token) || undefined,
    message: json.message,
    ...(typeof json === "object" && json !== null ? json : {}),
  };
}

export const apiClient = {
  get: <T>(endpoint: string, params?: Record<string, any>) => {
    let url = endpoint;
    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== "") {
          searchParams.append(key, String(val));
        }
      });
      const qs = searchParams.toString();
      if (qs) {
        url += (url.includes("?") ? "&" : "?") + qs;
      }
    }
    return fetchApi<T>(url, { method: "GET" });
  },

  post: <T>(endpoint: string, body?: any) =>
    fetchApi<T>(endpoint, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    }),

  put: <T>(endpoint: string, body?: any) =>
    fetchApi<T>(endpoint, {
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
    }),

  delete: <T>(endpoint: string) =>
    fetchApi<T>(endpoint, {
      method: "DELETE",
    }),

  // Legacy wrapper for local functions if needed
  async request<T>(operation: () => Promise<T>): Promise<ApiResponse<T>> {
    try {
      return { data: await operation() };
    } catch (error) {
      throw error instanceof Error ? error : new Error("Unexpected API error.");
    }
  },
};
