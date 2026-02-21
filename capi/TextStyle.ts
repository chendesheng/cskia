import { pointerArrayBuffer, skLib, skStringNew } from "./binding.ts";
import { color4fToColor } from "./Color.ts";
import type { Color4f } from "./Color.ts";
import type { Paint } from "./Paint.ts";

const sk = skLib.symbols;

export interface FontStyleSpec {
  weight?: number;
  slant?: number;
  width?: number;
}

export interface TextStyleOptions {
  color?: Color4f;
  fontSize?: number;
  fontFamilies?: string[];
  heightMultiplier?: number;
  halfLeading?: boolean;
  letterSpacing?: number;
  wordSpacing?: number;
  locale?: string;
  textBaseline?: number;
  fontStyle?: FontStyleSpec;
}

export class TextStyle {
  #ptr: Deno.PointerValue;

  constructor(opts?: TextStyleOptions) {
    this.#ptr = sk.sk_text_style_create();
    if (opts?.color !== undefined) this.setColor(opts.color);
    if (opts?.fontSize !== undefined) this.setFontSize(opts.fontSize);
    if (opts?.fontFamilies) this.setFontFamilies(opts.fontFamilies);
    if (opts?.heightMultiplier !== undefined) this.setHeightMultiplier(opts.heightMultiplier);
    if (opts?.halfLeading !== undefined) this.setHalfLeading(opts.halfLeading);
    if (opts?.letterSpacing !== undefined) this.setLetterSpacing(opts.letterSpacing);
    if (opts?.wordSpacing !== undefined) this.setWordSpacing(opts.wordSpacing);
    if (opts?.locale !== undefined) this.setLocale(opts.locale);
    if (opts?.textBaseline !== undefined) this.setTextBaseline(opts.textBaseline);
    if (opts?.fontStyle !== undefined) this.setFontStyle(opts.fontStyle);
  }

  get _ptr(): Deno.PointerValue {
    return this.#ptr;
  }

  setColor(color: Color4f): void {
    sk.sk_text_style_set_color(this.#ptr, color4fToColor(color));
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

  setForegroundPaint(paint: Paint): void {
    sk.sk_text_style_set_foreground_paint(this.#ptr, paint._ptr);
  }

  setBackgroundPaint(paint: Paint): void {
    sk.sk_text_style_set_background_paint(this.#ptr, paint._ptr);
  }

  setDecoration(
    decoration: number,
    decorationStyle: number = 0,
    decorationColor: number = 0xff000000,
    decorationMode: number = 0,
    decorationThickness: number = 1,
  ): void {
    sk.sk_text_style_set_decoration_mode(
      this.#ptr,
      decoration,
      decorationStyle,
      decorationColor,
      decorationMode,
      decorationThickness,
    );
  }

  setDecorationColor(color: Color4f): void {
    sk.sk_text_style_set_decoration_color(this.#ptr, color4fToColor(color));
  }

  setFontStyle(fontStyle: FontStyleSpec): void {
    const fsPtr = sk.sk_fontstyle_new(
      fontStyle.weight ?? 400,
      fontStyle.width ?? 5,
      fontStyle.slant ?? 0,
    );
    sk.sk_text_style_set_fontstyle(this.#ptr, fsPtr);
  }

  setHeightMultiplier(height: number): void {
    sk.sk_text_style_set_height(this.#ptr, height);
    sk.sk_text_style_set_height_override(this.#ptr, true);
  }

  setHalfLeading(halfLeading: boolean): void {
    sk.sk_text_style_set_half_leading(this.#ptr, halfLeading);
  }

  setLetterSpacing(spacing: number): void {
    sk.sk_text_style_set_letter_spacing(this.#ptr, spacing);
  }

  setWordSpacing(spacing: number): void {
    sk.sk_text_style_set_word_spacing(this.#ptr, spacing);
  }

  setLocale(locale: string): void {
    const ptr = skStringNew(locale);
    try {
      sk.sk_text_style_set_locale(this.#ptr, ptr);
    } finally {
      sk.sk_string_delete(ptr);
    }
  }

  setTextBaseline(baseline: number): void {
    sk.sk_text_style_set_text_baseline(this.#ptr, baseline);
  }

  delete(): void {
    // The C API doesn't expose sk_text_style_delete; the style is copied
    // when pushed into a builder, so the JS-side reference can simply be
    // dropped.
  }
}
