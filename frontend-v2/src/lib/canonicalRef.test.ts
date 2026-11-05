import { describe, it, expect } from "vitest";
import {
  toCanonicalRef,
  fromCanonicalRef,
  parseRefToCanonical,
  getChapterRange,
  isRefInRange,
} from "./canonicalRef";

describe("canonicalRef (Frontend T1.3)", () => {
  it("toCanonicalRef codifica corretamente no formato BBCCCVVV", () => {
    expect(toCanonicalRef(1, 1, 1)).toBe(1001001);
    expect(toCanonicalRef(43, 3, 16)).toBe(43003016);
    expect(toCanonicalRef(66, 22, 21)).toBe(66022021);
  });

  it("fromCanonicalRef decodifica corretamente", () => {
    expect(fromCanonicalRef(1001001)).toEqual({
      bookId: 1,
      chapter: 1,
      verse: 1,
    });
    expect(fromCanonicalRef(43003016)).toEqual({
      bookId: 43,
      chapter: 3,
      verse: 16,
    });
  });

  it("parseRefToCanonical parseia nomes em português e inglês case-insensitive", () => {
    expect(parseRefToCanonical("John 3:16")).toBe(43003016);
    expect(parseRefToCanonical("john 3:16")).toBe(43003016);
    expect(parseRefToCanonical("João 3:16")).toBe(43003016);
    expect(parseRefToCanonical("Gênesis 1:1")).toBe(1001001);
  });

  it("getChapterRange e isRefInRange identificam versículos no escopo", () => {
    const range = getChapterRange(43, 3);
    expect(range.startRef).toBe(43003001);
    expect(range.endRef).toBe(43003999);
    expect(isRefInRange(43003016, range.startRef, range.endRef)).toBe(true);
    expect(isRefInRange(43004001, range.startRef, range.endRef)).toBe(false);
  });
});
