import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { Skeleton } from "./Skeleton";

describe("Skeleton", () => {
  it("aplica a animação de pulso", () => {
    const { container } = render(<Skeleton />);

    expect(container.firstChild).toHaveClass("animate-pulse");
  });

  it("mescla o className recebido com as classes base", () => {
    const { container } = render(<Skeleton className="h-4 w-20" />);

    expect(container.firstChild).toHaveClass("animate-pulse", "rounded", "h-4", "w-20");
  });

  it("deixa o className vencer conflitos do Tailwind", () => {
    const { container } = render(<Skeleton className="rounded-full" />);

    expect(container.firstChild).toHaveClass("rounded-full");
    expect(container.firstChild).not.toHaveClass("rounded");
  });
});
