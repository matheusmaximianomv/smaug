import { Modal } from "../Modal";
import { Skeleton } from "../Skeleton";
import { ErrorNotice } from "./ErrorNotice";

interface FichaPlaceholderProps {
  title: string;
  errorMessage: string | null;
  onRetry: () => void;
  onClose: () => void;
}

/** Ficha enquanto o detalhe da série carrega, ou quando a leitura falha. */
export function FichaPlaceholder({ title, errorMessage, onRetry, onClose }: FichaPlaceholderProps) {
  return (
    <Modal isOpen onClose={onClose} title={title} width="2xl">
      {errorMessage ? (
        <ErrorNotice message={errorMessage} onRetry={onRetry} />
      ) : (
        <div className="space-y-3" aria-busy="true">
          <Skeleton className="h-16" />
          <Skeleton className="h-24" />
        </div>
      )}
    </Modal>
  );
}
