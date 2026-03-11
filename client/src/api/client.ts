const AUTH_KEY = "prompts_auth_password";

export function getStoredPassword(): string {
  return localStorage.getItem(AUTH_KEY) ?? "";
}

export function setStoredPassword(password: string): void {
  localStorage.setItem(AUTH_KEY, password);
}

export function clearStoredPassword(): void {
  localStorage.removeItem(AUTH_KEY);
}

class ApiError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const password = getStoredPassword();

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  if (password) {
    headers["Authorization"] = `Bearer ${password}`;
  }

  const res = await fetch(path, {
    ...options,
    headers,
  });

  if (res.status === 204) {
    return undefined as T;
  }

  const data = await res.json();

  if (!res.ok) {
    if (res.status === 401) {
      clearStoredPassword();
      window.dispatchEvent(new Event("auth:logout"));
    }
    const errData = data?.error ?? {};
    throw new ApiError(
      res.status,
      errData.code ?? "UNKNOWN_ERROR",
      errData.message ?? "An error occurred"
    );
  }

  return data as T;
}

export const apiClient = {
  get<T>(path: string): Promise<T> {
    return request<T>(path);
  },

  post<T>(path: string, body: unknown): Promise<T> {
    return request<T>(path, {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  postFormData<T>(path: string, formData: FormData): Promise<T> {
    return request<T>(path, {
      method: "POST",
      body: formData,
    });
  },

  patch<T>(path: string, body: unknown): Promise<T> {
    return request<T>(path, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
  },

  delete(path: string): Promise<void> {
    return request<void>(path, { method: "DELETE" });
  },
};

export { ApiError };
