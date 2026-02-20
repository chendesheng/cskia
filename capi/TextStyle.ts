import { pointerArrayBuffer, skLib, skStringNew } from "./binding.ts";

const sk = skLib.symbols;

export interface TextStyleOptions {
  color?: number;
  fontSize?: number;
  fontFamilies?: string[];
}

export class TextStyle {
  #ptr: Deno.PointerValue;

  constructor(opts?: TextStyleOptions) {
    this.#ptr = sk.sk_text_style_create();
    if (opts?.color !== undefined) this.setColor(opts.color);
    if (opts?.fontSize !== undefined) this.setFontSize(opts.fontSize);
    if (opts?.fontFamilies) this.setFontFamilies(opts.fontFamilies);
  }

  get _ptr(): Deno.PointerValue {
    return this.#ptr;
  }

  setColor(color: number): void {
    sk.sk_text_style_set_color(this.#ptr, color);
  }

  setFontSize(size: number): void {
    sk.sk_text_style_set_font_size(this.#ptr, size);
  }

  setFontFamilies(families: string[]): void {
    const ptrs = families.map((f) => skStringNew(f));
    try {
      const buf = pointerArrayBuffer(ptrs);
      sk.sk_text_style_set_font_families(
        this.#ptr,
        buf,
        BigInt(ptrs.length),
      );
    } finally {
      for (const p of ptrs) sk.sk_string_delete(p);
    }
  }

  delete(): void {
    // The C API doesn't expose sk_text_style_delete; the style is copied
    // when pushed into a builder, so the JS-side reference can simply be
    // dropped.
  }
}
