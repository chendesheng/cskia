import { skLib } from "./binding.ts";

const sk = skLib.symbols;

export class Font {
  #ptr: Deno.PointerValue;

  /**
   * Create a font from a typeface pointer and size.
   * @param typeface Raw SkTypeface pointer (from FontMgr or TypefaceFontProvider)
   * @param size Font size in points
   * @param scaleX Horizontal scale (default 1.0)
   * @param skewX Horizontal skew (default 0.0)
   */
  constructor(
    typeface: Deno.PointerValue,
    size: number,
    scaleX: number = 1.0,
    skewX: number = 0.0,
  ) {
    this.#ptr = sk.sk_font_new_with_values(typeface, size, scaleX, skewX);
    if (!this.#ptr) throw new Error("Failed to create Font");
  }

  get _ptr(): Deno.PointerValue {
    return this.#ptr;
  }

  delete(): void {
    sk.sk_font_delete(this.#ptr);
  }
}
