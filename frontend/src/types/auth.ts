// ── Auth types ───────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  name: string;
  role: "admin" | "manager" | "viewer" | "PROCUREMENT_USER" | string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface ApiErrorResponse {
  detail: string | { msg: string; type: string }[];
  status_code?: number;
}
