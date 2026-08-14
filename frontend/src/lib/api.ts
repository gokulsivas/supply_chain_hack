/**
 * Centralised HTTP client.
 *
 * - One Axios instance for the entire app.
 * - Base URL read strictly from NEXT_PUBLIC_API_URL.
 * - Attaches Authorization header when a token cookie is present.
 * - Exports typed API-error helpers.
 * - Never hardcodes backend URLs.
 */

import axios, { AxiosError, type AxiosInstance } from "axios";
import { getToken } from "@/lib/auth";
import type { ApiErrorResponse, LoginRequest, LoginResponse } from "@/types/auth";

// ── Axios instance ────────────────────────────────────────────────

const api: AxiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
  timeout: 15_000,
});

// ── Request interceptor — attach bearer token ─────────────────────

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Response interceptor — surface errors cleanly ─────────────────

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorResponse>) => {
    // Bubble up as a typed ApiError so callers don't parse raw Axios errors.
    return Promise.reject(toApiError(error));
  }
);

// ── Error helpers ─────────────────────────────────────────────────

export class ApiError extends Error {
  readonly status: number;
  readonly detail: string;

  constructor(status: number, detail: string) {
    super(detail);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
  }

  get isUnauthorized(): boolean {
    return this.status === 401;
  }

  get isForbidden(): boolean {
    return this.status === 403;
  }

  get isNotFound(): boolean {
    return this.status === 404;
  }

  get isServerError(): boolean {
    return this.status >= 500;
  }
}

/**
 * Convert an AxiosError into a typed ApiError.
 * Falls back to the Axios message when no server response is available.
 */
export function toApiError(error: AxiosError<ApiErrorResponse>): ApiError {
  if (error.response) {
    const status = error.response.status;
    const raw = error.response.data?.detail;

    let detail: string;
    if (typeof raw === "string") {
      detail = raw;
    } else if (Array.isArray(raw)) {
      detail = raw.map((e) => e.msg).join("; ");
    } else {
      detail = error.message;
    }

    return new ApiError(status, detail);
  }

  if (error.request) {
    return new ApiError(0, "No response from server. Check your connection.");
  }

  return new ApiError(0, error.message);
}

/**
 * Type guard — use in catch blocks.
 *
 * @example
 * } catch (err) {
 *   if (isApiError(err)) { ... }
 * }
 */
export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

// ── Auth API helpers ──────────────────────────────────────────────

/**
 * POST /auth/login
 * Returns a typed LoginResponse on success; rejects with ApiError on failure.
 */
export async function login(payload: LoginRequest): Promise<LoginResponse> {
  const response = await api.post<LoginResponse>("/auth/login", payload);
  return response.data;
}

// ── Logistics API helpers ───────────────────────────────────────────

import type { 
  LogisticsAlert, 
  TrackingSearchResponse, 
  TruckPosition,
  YardSlotResponse,
  DockResponse,
  DockAssignmentResponse,
  DockRecommendationResponse,
  DockAlertResponse
} from "@/types/logistics";

export async function searchTracking(query: string): Promise<TrackingSearchResponse> {
  const response = await api.get<TrackingSearchResponse>(`/logistics/track/${encodeURIComponent(query)}`);
  return response.data;
}

export async function listTrucks(): Promise<TruckPosition[]> {
  const response = await api.get<TruckPosition[]>("/logistics/trucks");
  return response.data;
}

export async function simulateTruckStep(truckId: string): Promise<TruckPosition> {
  const response = await api.post<TruckPosition>(`/logistics/trucks/${encodeURIComponent(truckId)}/simulate-step`);
  return response.data;
}

export async function simulateAllTrucks(): Promise<TruckPosition[]> {
  const response = await api.post<TruckPosition[]>("/logistics/simulate-all");
  return response.data;
}

export async function listLogisticsAlerts(): Promise<LogisticsAlert[]> {
  const response = await api.get<LogisticsAlert[]>("/logistics/alerts");
  return response.data;
}

// ── Yard & Dock API helpers ───────────────────────────────────────

export async function getYard(): Promise<YardSlotResponse[]> {
  const response = await api.get<YardSlotResponse[]>("/logistics/yard");
  return response.data;
}

export async function listDocks(): Promise<DockResponse[]> {
  const response = await api.get<DockResponse[]>("/logistics/docks");
  return response.data;
}

export async function listDockAssignments(): Promise<DockAssignmentResponse[]> {
  const response = await api.get<DockAssignmentResponse[]>("/logistics/dock-assignments");
  return response.data;
}

export async function listDockAlerts(): Promise<DockAlertResponse[]> {
  const response = await api.get<DockAlertResponse[]>("/logistics/dock-alerts");
  return response.data;
}

export async function getDockRecommendation(truckId: string): Promise<DockRecommendationResponse> {
  const response = await api.get<DockRecommendationResponse>(`/logistics/trucks/${encodeURIComponent(truckId)}/dock-recommendation`);
  return response.data;
}

export async function assignDock(truckId: string, dockId: string): Promise<DockAssignmentResponse> {
  const response = await api.post<DockAssignmentResponse>(
    `/logistics/trucks/${encodeURIComponent(truckId)}/assign-dock`,
    { dock_id: dockId }
  );
  return response.data;
}

export async function releaseDock(dockId: string): Promise<DockResponse> {
  const response = await api.post<DockResponse>(`/logistics/docks/${encodeURIComponent(dockId)}/release`);
  return response.data;
}

export async function resetLogisticsDemo(): Promise<{ status: string; message: string }> {
  const response = await api.post<{ status: string; message: string }>("/logistics/demo/reset");
  return response.data;
}

// ── Procurement API helpers ───────────────────────────────────────

import type {
  ExtractionResultResponse,
  CreatePurchaseRequestRequest,
  PurchaseRequest
} from "@/types/procurement";

export async function extractRequisition(message: string): Promise<ExtractionResultResponse> {
  const response = await api.post<ExtractionResultResponse>("/procurement/extract", { message });
  return response.data;
}

export async function createPurchaseRequest(payload: CreatePurchaseRequestRequest): Promise<PurchaseRequest> {
  const response = await api.post<PurchaseRequest>("/procurement/purchase-requests", payload);
  return response.data;
}

export async function listPurchaseRequests(): Promise<PurchaseRequest[]> {
  const response = await api.get<PurchaseRequest[]>("/procurement/purchase-requests");
  return response.data;
}

import type {
  SupplierRecommendationsResponse,
  PurchaseOrderResponse
} from "@/types/procurement";

export async function getPurchaseRequestSupplierRecommendations(requestId: string): Promise<SupplierRecommendationsResponse> {
  const response = await api.get<SupplierRecommendationsResponse>(`/procurement/purchase-requests/${encodeURIComponent(requestId)}/supplier-recommendations`);
  return response.data;
}

export async function approveSupplier(requestId: string, supplierId: string): Promise<PurchaseOrderResponse> {
  const response = await api.post<PurchaseOrderResponse>(`/procurement/purchase-requests/${encodeURIComponent(requestId)}/approve-supplier`, { supplier_id: supplierId });
  return response.data;
}

export async function listPurchaseOrders(): Promise<PurchaseOrderResponse[]> {
  const response = await api.get<PurchaseOrderResponse[]>("/procurement/purchase-orders");
  return response.data;
}

export async function getPurchaseOrder(poId: string): Promise<PurchaseOrderResponse> {
  const response = await api.get<PurchaseOrderResponse>(`/procurement/purchase-orders/${encodeURIComponent(poId)}`);
  return response.data;
}

export default api;
