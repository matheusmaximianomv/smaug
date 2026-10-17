import { Trash2 } from "lucide-react";
import { Modal } from "./Modal";
import { Button } from "./Button";

export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDanger?: boolean;
  isLoading?: boolean;
}

/**
 * Sempre na camada `top`: a confirmação costuma abrir sobre outro modal (a Ficha)
 * e precisa ficar visualmente acima dele; o Radix garante que Escape feche só ela.
 */
export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title = "Confirmar ação",
  message,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  isDanger = false,
  isLoading = false,
}: ConfirmDialogProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      width="sm"
      layer="top"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={isLoading}>
            {cancelLabel}
          </Button>
          <Button
            variant={isDanger ? "danger" : "default"}
            onClick={onConfirm}
            isLoading={isLoading}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      {isDanger && (
        <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-full bg-red-light text-red">
          <Trash2 size={16} aria-hidden />
        </div>
      )}
      <p className="text-sm text-text-muted">{message}</p>
    </Modal>
  );
}
