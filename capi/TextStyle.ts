import { pointerArrayBuffer, skLib, skStringNew } from "./binding.ts";
import { color4fToColor, colorToColor4f } from "./Color.ts";
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
  decoration?: number;
  decorationColor?: Color4f;
  decorationThickness?: number;
  decorationStyle?: number;
}

const TEXT_STYLE_HAS_COLOR = 1n << 0n;
const TEXT_STYLE_HAS_FONT_SIZE = 1n << 1n;
const TEXT_STYLE_HAS_FONT_FAMILIES = 1n << 2n;
const TEXT_STYLE_HAS_HEIGHT_MULTIPLIER = 1n << 3n;
const TEXT_STYLE_HAS_HALF_LEADING = 1n << 4n;
const TEXT_STYLE_HAS_LETTER_SPACING = 1n << 5n;
const TEXT_STYLE_HAS_WORD_SPACING = 1n << 6n;
const TEXT_STYLE_HAS_LOCALE = 1n << 7n;
const TEXT_STYLE_HAS_TEXT_BASELINE = 1n << 8n;
const TEXT_STYLE_HAS_FONT_STYLE = 1n << 9n;
const TEXT_STYLE_HAS_DECORATION_TYPE = 1n << 10n;
const TEXT_STYLE_HAS_DECORATION_COLOR = 1n << 11n;
const TEXT_STYLE_HAS_DECORATION_THICKNESS = 1n << 12n;
const TEXT_STYLE_HAS_DECORATION_STYLE = 1n << 13n;

export class TextStyle {
  #ptr: Deno.PointerValue;

  static _fromPtr(ptr: Deno.PointerValue): TextStyle {
    return new TextStyle(undefined, ptr);
  }

  constructor(opts?: TextStyleOptions, ptr?: Deno.PointerValue) {
    if (ptr) {
      this.#ptr = ptr;
      return;
    }
    const fontPtrs = opts?.fontFamilies?.map((f) => skStringNew(f)) ?? [];
    const fontFamiliesBuf = pointerArrayBuffer(fontPtrs);
    const localePtr = opts?.locale !== undefined ? skStringNew(opts.locale) : null;
    let flags = 0n;
    if (opts?.color !== undefined) flags |= TEXT_STYLE_HAS_COLOR;
    if (opts?.fontSize !== undefined) flags |= TEXT_STYLE_HAS_FONT_SIZE;
    if (opts?.fontFamilies !== undefined) flags |= TEXT_STYLE_HAS_FONT_FAMILIES;
    if (opts?.heightMultiplier !== undefined) {
      flags |= TEXT_STYLE_HAS_HEIGHT_MULTIPLIER;
    }
    if (opts?.halfLeading !== undefined) flags |= TEXT_STYLE_HAS_HALF_LEADING;
    if (opts?.letterSpacing !== undefined) flags |= TEXT_STYLE_HAS_LETTER_SPACING;
    if (opts?.wordSpacing !== undefined) flags |= TEXT_STYLE_HAS_WORD_SPACING;
    if (opts?.locale !== undefined) flags |= TEXT_STYLE_HAS_LOCALE;
    if (opts?.textBaseline !== undefined) flags |= TEXT_STYLE_HAS_TEXT_BASELINE;
    if (opts?.fontStyle !== undefined) flags |= TEXT_STYLE_HAS_FONT_STYLE;
    if (opts?.decoration !== undefined) flags |= TEXT_STYLE_HAS_DECORATION_TYPE;
    if (opts?.decorationColor !== undefined) flags |= TEXT_STYLE_HAS_DECORATION_COLOR;
    if (opts?.decorationThickness !== undefined) {
      flags |= TEXT_STYLE_HAS_DECORATION_THICKNESS;
    }
    if (opts?.decorationStyle !== undefined) flags |= TEXT_STYLE_HAS_DECORATION_STYLE;

    try {
      this.#ptr = sk.sk_text_style_new_with_options(
        flags,
        opts?.color !== undefined ? color4fToColor(opts.color) : 0,
        opts?.fontSize ?? 0,
        opts?.heightMultiplier ?? 0,
        opts?.halfLeading ?? false,
        opts?.letterSpacing ?? 0,
        opts?.wordSpacing ?? 0,
        opts?.textBaseline ?? 0,
        opts?.fontStyle?.weight ?? 400,
        opts?.fontStyle?.width ?? 5,
        opts?.fontStyle?.slant ?? 0,
        opts?.decoration ?? 0,
        opts?.decorationStyle ?? 0,
        opts?.decorationColor ? color4fToColor(opts.decorationColor) : 0,
        opts?.decorationThickness ?? 1,
        fontFamiliesBuf,
        BigInt(fontPtrs.length),
        localePtr,
      );
    } finally {
      for (const ptr of fontPtrs) sk.sk_string_delete(ptr);
      if (localePtr) sk.sk_string_delete(localePtr);
    }
  }

  get _ptr(): Deno.PointerValue {
    return this.#ptr;
  }

  get color(): Color4f {
    return colorToColor4f(sk.sk_text_style_get_color(this.#ptr) as number);
  }

  set color(color: Color4f | undefined) {
    if (color === undefined) return;
    this.setColor(color);
  }

  setColor(color: Color4f): void {
    sk.sk_text_style_set_color(this.#ptr, color4fToColor(color));
  }

  get fontSize(): number {
    return sk.sk_text_style_get_font_size(this.#ptr) as number;
  }

  set fontSize(size: number | undefined) {
    if (size === undefined) return;
    this.setFontSize(size);
  }

  setFontSize(size: number): void {
    sk.sk_text_style_set_font_size(this.#ptr, size);
  }

  get fontFamilies(): string[] {
    const countBuf = new BigUint64Array(1);
    const countBytes = new Uint8Array(
      countBuf.buffer,
    ) as Uint8Array<ArrayBuffer>;
    const ptr = sk.sk_text_style_get_font_families(this.#ptr, countBytes);
    const count = Number(countBuf[0]);
    if (!ptr || count === 0) return [];
    const raw = new Uint8Array(count * 8);
    new Deno.UnsafePointerView(ptr).copyInto(raw);
    const dv = new DataView(raw.buffer, raw.byteOffset, raw.byteLength);
    const out: string[] = [];
    try {
      for (let i = 0; i < count; i++) {
        const value = dv.getBigUint64(i * 8, true);
        const strPtr = Deno.UnsafePointer.create(value);
        if (!strPtr) continue;
        const cStr = sk.sk_string_get_c_str(strPtr);
        if (!cStr) continue;
        out.push(new Deno.UnsafePointerView(cStr).getCString());
      }
      return out;
    } finally {
      sk.sk_text_style_destroy_font_families(ptr, BigInt(count));
    }
  }

  set fontFamilies(families: string[] | undefined) {
    if (families === undefined) return;
    this.setFontFamilies(families);
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

  get decoration(): number {
    return sk.sk_text_style_get_decoration_type(this.#ptr) as number;
  }

  set decoration(decoration: number | undefined) {
    if (decoration === undefined) return;
    sk.sk_text_style_set_decoration_type(this.#ptr, decoration);
  }

  get decorationStyle(): number {
    return sk.sk_text_style_get_decoration_style(this.#ptr) as number;
  }

  set decorationStyle(style: number | undefined) {
    if (style === undefined) return;
    sk.sk_text_style_set_decoration_style(this.#ptr, style);
  }

  get decorationColor(): Color4f {
    return colorToColor4f(sk.sk_text_style_get_decoration_color(this.#ptr) as number);
  }

  set decorationColor(color: Color4f | undefined) {
    if (color === undefined) return;
    this.setDecorationColor(color);
  }

  get decorationThickness(): number {
    return sk.sk_text_style_get_decoration_thickness_multiplier(this.#ptr) as number;
  }

  set decorationThickness(thickness: number | undefined) {
    if (thickness === undefined) return;
    sk.sk_text_style_set_decoration_thickness_multiplier(this.#ptr, thickness);
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

  get fontStyle(): FontStyleSpec {
    const ptr = sk.sk_text_style_get_fontstyle(this.#ptr);
    if (!ptr) return { weight: 400, width: 5, slant: 0 };
    return {
      weight: sk.sk_fontstyle_get_weight(ptr) as number,
      width: sk.sk_fontstyle_get_width(ptr) as number,
      slant: sk.sk_fontstyle_get_slant(ptr) as number,
    };
  }

  set fontStyle(fontStyle: FontStyleSpec | undefined) {
    if (fontStyle === undefined) return;
    this.setFontStyle(fontStyle);
  }

  setFontStyle(fontStyle: FontStyleSpec): void {
    const fsPtr = sk.sk_fontstyle_new(
      fontStyle.weight ?? 400,
      fontStyle.width ?? 5,
      fontStyle.slant ?? 0,
    );
    try {
      sk.sk_text_style_set_fontstyle(this.#ptr, fsPtr);
    } finally {
      sk.sk_fontstyle_delete(fsPtr);
    }
  }

  get heightMultiplier(): number | undefined {
    if (!(sk.sk_text_style_get_height_override(this.#ptr) as boolean)) {
      return undefined;
    }
    return sk.sk_text_style_get_height(this.#ptr) as number;
  }

  set heightMultiplier(height: number | undefined) {
    if (height === undefined) {
      sk.sk_text_style_set_height_override(this.#ptr, false);
      return;
    }
    this.setHeightMultiplier(height);
  }

  setHeightMultiplier(height: number): void {
    sk.sk_text_style_set_height(this.#ptr, height);
    sk.sk_text_style_set_height_override(this.#ptr, true);
  }

  get halfLeading(): boolean {
    return sk.sk_text_style_get_half_leading(this.#ptr) as boolean;
  }

  set halfLeading(halfLeading: boolean | undefined) {
    if (halfLeading === undefined) return;
    this.setHalfLeading(halfLeading);
  }

  setHalfLeading(halfLeading: boolean): void {
    sk.sk_text_style_set_half_leading(this.#ptr, halfLeading);
  }

  get letterSpacing(): number {
    return sk.sk_text_style_get_letter_spacing(this.#ptr) as number;
  }

  set letterSpacing(spacing: number | undefined) {
    if (spacing === undefined) return;
    this.setLetterSpacing(spacing);
  }

  setLetterSpacing(spacing: number): void {
    sk.sk_text_style_set_letter_spacing(this.#ptr, spacing);
  }

  get wordSpacing(): number {
    return sk.sk_text_style_get_word_spacing(this.#ptr) as number;
  }

  set wordSpacing(spacing: number | undefined) {
    if (spacing === undefined) return;
    this.setWordSpacing(spacing);
  }

  setWordSpacing(spacing: number): void {
    sk.sk_text_style_set_word_spacing(this.#ptr, spacing);
  }

  get locale(): string {
    const ptr = sk.sk_text_style_get_locale(this.#ptr);
    if (!ptr) return "";
    try {
      const cStr = sk.sk_string_get_c_str(ptr);
      if (!cStr) return "";
      return new Deno.UnsafePointerView(cStr).getCString();
    } finally {
      sk.sk_string_delete(ptr);
    }
  }

  set locale(locale: string | undefined) {
    if (locale === undefined) return;
    this.setLocale(locale);
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

  get textBaseline(): number {
    return sk.sk_text_style_get_text_baseline(this.#ptr) as number;
  }

  set textBaseline(baseline: number | undefined) {
    if (baseline === undefined) return;
    this.setTextBaseline(baseline);
  }

  delete(): void {
    sk.sk_text_style_delete(this.#ptr);
  }
}
