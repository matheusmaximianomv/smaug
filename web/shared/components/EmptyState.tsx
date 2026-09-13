import { Button } from "./Button";

export interface EmptyStateProps {
  icon?: React.ReactNode;
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({ icon, message, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      {icon && <div className="mb-3 text-border">{icon}</div>}
      <p className="text-sm text-text-subtle">{message}</p>
      {action && (
        <div className="mt-3">
          <Button size="sm" onClick={action.onClick}>
            {action.label}
          </Button>
        </div>
      )}
    </div>
  );
}
