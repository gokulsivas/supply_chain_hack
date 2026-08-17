// ── Auth types ───────────────────────────────────────────────────

export interface UserResponse {
  id: string;
  name: string;
  email: string;
  role: string;
  created_at: string;
  updated_at: string;
}

export interface UserInToken {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user: UserInToken;
}

export interface ApiErrorResponse {
  detail: string | { msg: string; type: string }[];
  status_code?: number;
}
