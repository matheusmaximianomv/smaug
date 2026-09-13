export interface ApiResponse<T> {
  data: T;
  error?: ApiError;
}

export interface ApiError {
  error: string;
  message: string;
  details?: Record<string, string[]>;
}

export type LoadingState = "idle" | "loading" | "success" | "error";

export interface ToastNotification {
  id: string;
  type: "success" | "error" | "info" | "warning";
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  duration?: number;
}

export interface ModalState {
  isOpen: boolean;
  onClose: () => void;
  onConfirm?: () => void;
}
