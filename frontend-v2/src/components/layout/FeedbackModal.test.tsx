import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
} from "@testing-library/react";

const post = vi.fn();
vi.mock("@/lib/api", async () => {
  class ApiError extends Error {
    constructor(
      message: string,
      public readonly status: number,
    ) {
      super(message);
    }
  }
  return { api: { post: (...a: unknown[]) => post(...a) }, ApiError };
});
vi.mock("next/navigation", () => ({ usePathname: () => "/leitor" }));

import { FeedbackModal } from "./FeedbackModal";
import { ApiError } from "@/lib/api";

function fillAndSubmit(text: string) {
  fireEvent.change(screen.getByPlaceholderText(/Conte o que achou/i), {
    target: { value: text },
  });
  const form = screen
    .getByPlaceholderText(/Conte o que achou/i)
    .closest("form");
  if (!form) throw new Error("formulário não encontrado");
  fireEvent.submit(form);
}

describe("FeedbackModal — envio real (antes era simulado)", () => {
  // Chaves obrigatórias: devolver o mock faria o vitest chamá-lo como teardown.
  beforeEach(() => {
    post.mockReset();
  });
  afterEach(() => {
    cleanup();
  });

  it("envia ao backend e só então mostra sucesso", async () => {
    post.mockResolvedValue({ success: true, data: { id: "fb-1" } });
    render(<FeedbackModal isOpen onClose={() => undefined} />);
    fillAndSubmit("O leitor travou no capítulo 3.");

    await waitFor(() =>
      expect(screen.getByText(/Enviado com Sucesso/i)).toBeTruthy(),
    );
    expect(post).toHaveBeenCalledWith(
      "/feedback",
      expect.objectContaining({
        message: "O leitor travou no capítulo 3.",
        pathname: "/leitor",
      }),
    );
    expect(JSON.stringify(post.mock.calls[0][1])).not.toContain("userId");
  });

  it("falha do servidor NÃO mostra sucesso e mantém o texto", async () => {
    post.mockImplementation(() =>
      Promise.reject(new ApiError("indisponível", 503)),
    );
    render(<FeedbackModal isOpen onClose={() => undefined} />);
    fillAndSubmit("Não consigo me cadastrar.");

    await waitFor(() =>
      expect(screen.getByText(/Seu texto foi mantido/i)).toBeTruthy(),
    );
    expect(post).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(/Enviado com Sucesso/i)).toBeNull();
    expect(
      (screen.getAllByRole("textbox") as HTMLTextAreaElement[]).some(
        (el) => el.value === "Não consigo me cadastrar.",
      ),
    ).toBe(true);
  });
});
