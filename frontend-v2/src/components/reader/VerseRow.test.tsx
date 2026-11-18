import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { HighlightedText, VerseRow } from "./VerseRow";

describe("Destaque no leitor sem acento (Etapa 9.1)", () => {
  afterEach(() => {
    cleanup();
  });

  it("buscar 'graca' destaca 'graça'", () => {
    const text = "Porque pela graça sois salvos, por meio da fé";
    const { container } = render(<HighlightedText text={text} query="graca" />);

    const mark = container.querySelector("mark");
    expect(mark).not.toBeNull();
    expect(mark?.textContent).toBe("graça");
  });

  it("buscar 'אלהים' destaca 'אֱלֹהִים'", () => {
    const text = "בְּרֵאשִׁ֖ית בָּרָ֣א אֱלֹהִ֑ים אֵ֥ת הַשָּׁמַ֖יִם";
    const { container } = render(<HighlightedText text={text} query="אלהים" />);

    const mark = container.querySelector("mark");
    expect(mark).not.toBeNull();
    expect(mark?.textContent).toBe("אֱלֹהִ֑ים");
  });

  it("renderiza VerseRow completo com highlightQuery sem acento", () => {
    const text = "A graça e a paz vos sejam multiplicadas";
    const { container } = render(
      <VerseRow
        verse={2}
        text={text}
        onClick={() => {}}
        highlightQuery="graca"
      />,
    );

    const mark = container.querySelector("mark");
    expect(mark).not.toBeNull();
    expect(mark?.textContent).toBe("graça");
  });

  it("renderiza VerseRow em hebraico com highlightQuery sem niqqud", () => {
    const text = "בְּרֵאשִׁ֖ית בָּרָ֣א אֱלֹהִ֑ים";
    const { container } = render(
      <VerseRow
        verse={1}
        text={text}
        onClick={() => {}}
        highlightQuery="אלהים"
      />,
    );

    const mark = container.querySelector("mark");
    expect(mark).not.toBeNull();
    expect(mark?.textContent).toBe("אֱלֹהִ֑ים");
  });
});
