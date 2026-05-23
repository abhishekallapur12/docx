export function getAuthToken() {
  return localStorage.getItem("docuflow_token") || "";
}

export function setAuthSession(token: string, user: unknown) {
  localStorage.setItem("docuflow_token", token);
  localStorage.setItem("docuflow_user", JSON.stringify(user));
}

export function clearAuthSession() {
  localStorage.removeItem("docuflow_token");
  localStorage.removeItem("docuflow_user");
}

export function getStoredUser() {
  const value = localStorage.getItem("docuflow_user");
  if (!value) return null;

  try {
    return JSON.parse(value);
  } catch {
    clearAuthSession();
    return null;
  }
}

export function authFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const token = getAuthToken();
  const headers = new Headers(init.headers);

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  return fetch(input, {
    ...init,
    headers,
  });
}
