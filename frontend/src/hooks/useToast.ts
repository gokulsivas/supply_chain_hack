"use client";

/**
 * useToast — thin wrapper over sonner's `toast` imperative API.
 *
 * Provides typed helpers for each semantic level:
 * success, error, warning, info, loading, and dismiss.
 *
 * The `<Toaster />` component in layout.tsx must be rendered for
 * toasts to appear.
 */

import { toast } from "sonner";

interface ToastOptions {
  description?: string;
  duration?: number;
  id?: string | number;
}

interface UseToastReturn {
  success: (message: string, options?: ToastOptions) => void;
  error: (message: string, options?: ToastOptions) => void;
  warning: (message: string, options?: ToastOptions) => void;
  info: (message: string, options?: ToastOptions) => void;
  loading: (message: string, options?: ToastOptions) => string | number;
  dismiss: (id?: string | number) => void;
}

export function useToast(): UseToastReturn {
  return {
    success(message, options) {
      toast.success(message, options);
    },
    error(message, options) {
      toast.error(message, options);
    },
    warning(message, options) {
      toast.warning(message, options);
    },
    info(message, options) {
      toast.info(message, options);
    },
    loading(message, options) {
      return toast.loading(message, options);
    },
    dismiss(id) {
      toast.dismiss(id);
    },
  };
}
