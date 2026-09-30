"use client";

import { useRef, useState } from "react";
import { Upload } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { CodeChip } from "./CodeChip";

interface ImportDropzoneProps {
  onFileSelected: (file: File) => void;
  disabled?: boolean;
}

export function ImportDropzone({ onFileSelected, disabled }: ImportDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleFile = (file: File | undefined): void => {
    if (file) onFileSelected(file);
  };

  return (
    <div>
      <button
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          handleFile(event.dataTransfer.files[0]);
        }}
        className={cn(
          "flex w-full flex-col items-center gap-2 rounded-[10px] border-[1.5px] border-dashed px-6 py-10 transition-colors",
          dragging
            ? "border-red bg-red-light"
            : "border-border hover:border-red hover:bg-red-light",
          disabled && "cursor-not-allowed opacity-60",
        )}
      >
        <Upload size={32} className="text-text-subtle" strokeWidth={1.6} />
        <span className="text-[13.5px] font-medium">
          Arraste um arquivo CSV ou clique para escolher
        </span>
        <span className="text-[12.5px] text-text-muted">
          Mesmo formato da exportação — separador <CodeChip>;</CodeChip>
        </span>
      </button>

      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        aria-label="Arquivo CSV"
        className="hidden"
        onChange={(event) => handleFile(event.target.files?.[0])}
      />
    </div>
  );
}
