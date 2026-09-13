import { Modal } from "@/shared/components/Modal";
import { Button } from "@/shared/components/Button";

interface DeleteWarningModalProps {
  isOpen: boolean;
  onClose: () => void;
  categoryName: string;
}

export function DeleteWarningModal({ isOpen, onClose, categoryName }: DeleteWarningModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Não é possível excluir" width="sm">
      <p className="text-sm leading-relaxed text-text-muted">
        A categoria <strong>&quot;{categoryName}&quot;</strong> possui despesas vinculadas e não
        pode ser excluída. Remova ou reclassifique as despesas antes de excluir a categoria.
      </p>
      <div className="flex justify-end pt-4 border-t border-border mt-4">
        <Button onClick={onClose}>Entendido</Button>
      </div>
    </Modal>
  );
}
