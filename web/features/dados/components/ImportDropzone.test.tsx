import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ImportDropzone } from "./ImportDropzone";

const csvFile = (name = "dados.csv") =>
  new File(["competencia;natureza"], name, { type: "text/csv" });

describe("ImportDropzone", () => {
  it("convida o usuário a soltar ou escolher o arquivo", () => {
    render(<ImportDropzone onFileSelected={vi.fn()} />);

    expect(screen.getByText("Arraste um arquivo CSV ou clique para escolher")).toBeInTheDocument();
  });

  it("aceita apenas CSV no seletor de arquivo", () => {
    render(<ImportDropzone onFileSelected={vi.fn()} />);

    expect(screen.getByLabelText("Arquivo CSV")).toHaveAttribute("accept", ".csv,text/csv");
  });

  it("entrega o arquivo escolhido no seletor", async () => {
    const onFileSelected = vi.fn();
    render(<ImportDropzone onFileSelected={onFileSelected} />);

    await userEvent.upload(screen.getByLabelText("Arquivo CSV"), csvFile());

    expect(onFileSelected).toHaveBeenCalledWith(expect.objectContaining({ name: "dados.csv" }));
  });

  it("entrega o arquivo solto na área", () => {
    const onFileSelected = vi.fn();
    render(<ImportDropzone onFileSelected={onFileSelected} />);

    fireEvent.drop(screen.getByRole("button"), { dataTransfer: { files: [csvFile("solto.csv")] } });

    expect(onFileSelected).toHaveBeenCalledWith(expect.objectContaining({ name: "solto.csv" }));
  });

  it("ignora um drop sem arquivo", () => {
    const onFileSelected = vi.fn();
    render(<ImportDropzone onFileSelected={onFileSelected} />);

    fireEvent.drop(screen.getByRole("button"), { dataTransfer: { files: [] } });

    expect(onFileSelected).not.toHaveBeenCalled();
  });

  it("destaca a área enquanto o arquivo está sobre ela", () => {
    render(<ImportDropzone onFileSelected={vi.fn()} />);
    const dropzone = screen.getByRole("button");

    fireEvent.dragOver(dropzone);
    expect(dropzone.className).toContain("border-red");

    fireEvent.dragLeave(dropzone);
    expect(dropzone.className).toContain("border-border");
  });

  it("abre o seletor ao clicar na área", async () => {
    render(<ImportDropzone onFileSelected={vi.fn()} />);
    const click = vi.spyOn(screen.getByLabelText("Arquivo CSV"), "click");

    await userEvent.click(screen.getByRole("button"));

    expect(click).toHaveBeenCalled();
  });

  it("fica indisponível enquanto o arquivo anterior é lido", () => {
    render(<ImportDropzone onFileSelected={vi.fn()} disabled />);

    expect(screen.getByRole("button")).toBeDisabled();
  });
});
