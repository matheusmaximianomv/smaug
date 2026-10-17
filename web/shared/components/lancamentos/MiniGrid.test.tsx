import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { MiniGrid } from "./MiniGrid";

describe("MiniGrid", () => {
  it("pinta só as células com cor", () => {
    const { container } = render(<MiniGrid cells={[null, "#3b5bdb", null, null, null, null]} />);
    const cells = container.querySelectorAll("span");

    expect(cells).toHaveLength(6);
    expect(cells[1]).toHaveStyle({ backgroundColor: "#3b5bdb" });
    expect(cells[0].getAttribute("style")).toBeNull();
  });
});
