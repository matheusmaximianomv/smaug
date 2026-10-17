import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CompetenceSelect } from "./CompetenceSelect";

const APR_26 = { year: 2026, month: 4 };

describe("CompetenceSelect", () => {
  it("oferece 36 meses a partir de from, por extenso", () => {
    render(
      <CompetenceSelect label="Competência" value={APR_26} from={APR_26} onChange={vi.fn()} />,
    );
    const options = screen.getAllByRole("option");

    expect(options).toHaveLength(36);
    expect(options[0]).toHaveTextContent("Abril 2026");
    expect(options[35]).toHaveTextContent("Março 2029");
  });

  it("inclui no topo o valor atual quando está fora da lista", () => {
    render(
      <CompetenceSelect
        label="Competência"
        value={{ year: 2026, month: 2 }}
        from={APR_26}
        onChange={vi.fn()}
      />,
    );

    expect(screen.getAllByRole("option")).toHaveLength(37);
    expect(screen.getByLabelText(/Competência/)).toHaveDisplayValue("Fevereiro 2026");
  });

  it("devolve a competência escolhida", async () => {
    const onChange = vi.fn();
    render(
      <CompetenceSelect label="Termina em" value={APR_26} from={APR_26} onChange={onChange} />,
    );

    await userEvent.selectOptions(screen.getByLabelText(/Termina em/), "Janeiro 2027");

    expect(onChange).toHaveBeenCalledWith({ year: 2027, month: 1 });
  });

  it("liga o erro ao campo e omite o asterisco quando opcional", () => {
    render(
      <CompetenceSelect
        label="Fim"
        value={APR_26}
        from={APR_26}
        onChange={vi.fn()}
        required={false}
        error="Deve ser igual ou posterior ao início"
      />,
    );
    const select = screen.getByLabelText("Fim");

    expect(select).toHaveAccessibleDescription("Deve ser igual ou posterior ao início");
    expect(select).toHaveAttribute("aria-invalid", "true");
  });
});
