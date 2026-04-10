import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { FileUpload } from "@/components/forms/FileUpload.js";

describe("FileUpload", () => {
  it("selectare fișier prin change", async () => {
    const onFilesSelected = vi.fn();
    render(<FileUpload onFilesSelected={onFilesSelected} />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["a"], "a.csv", { type: "text/csv" });
    fireEvent.change(input, { target: { files: [file] } });
    expect(onFilesSelected).toHaveBeenCalledWith([file]);
  });

  it("drop și drag state", () => {
    const onFilesSelected = vi.fn();
    render(<FileUpload onFilesSelected={onFilesSelected} />);
    const label = screen.getByText(/Trage fisiere/i).closest("label");
    if (label === null) throw new Error("FileUpload: lipsește <label> pentru drop");
    fireEvent.dragOver(label);
    fireEvent.drop(label, {
      dataTransfer: { files: [new File(["x"], "b.csv")] },
    });
    expect(onFilesSelected).toHaveBeenCalled();
  });

  it("disabled: nu emite drop", () => {
    const onFilesSelected = vi.fn();
    render(<FileUpload disabled onFilesSelected={onFilesSelected} />);
    const label = screen.getByText(/Trage fisiere/i).closest("label");
    if (label === null) throw new Error("FileUpload: lipsește <label> pentru drop");
    fireEvent.drop(label, {
      dataTransfer: { files: [new File(["x"], "b.csv")] },
    });
    expect(onFilesSelected).not.toHaveBeenCalled();
  });

  it("Browse Files declanșează click pe input", () => {
    const onFilesSelected = vi.fn();
    render(<FileUpload onFilesSelected={onFilesSelected} />);
    const clickSpy = vi.spyOn(HTMLInputElement.prototype, "click");
    fireEvent.click(screen.getByRole("button", { name: /Browse Files/i }));
    expect(clickSpy).toHaveBeenCalled();
    clickSpy.mockRestore();
  });
});
