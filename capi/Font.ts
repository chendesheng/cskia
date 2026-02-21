import { skLib, asFfiBuffer, encodeUtf8 } from "./binding.ts";

const sk = skLib.symbols;

export interface FontMetrics {
  flags: number;
  top: number;
  ascent: number;
  descent: number;
  bottom: number;
  leading: number;
  avgCharWidth: number;
  maxCharWidth: number;
  xMin: number;
  xMax: number;
  xHeight: number;
  capHeight: number;
  underlineThickness: number;
  underlinePosition: number;
  strikeoutThickness: number;
  strikeoutPosition: number;
}

const METRICS_BYTES = 4 + 15 * 4; // uint32 + 15 floats = 64 bytes

export class Font {
  #ptr: Deno.PointerValue;

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

  getSize(): number {
    return sk.sk_font_get_size(this.#ptr) as number;
  }

  setSize(size: number): void {
    sk.sk_font_set_size(this.#ptr, size);
  }

  getMetrics(): FontMetrics {
    const buf = new ArrayBuffer(METRICS_BYTES);
    const bytes = new Uint8Array(buf) as Uint8Array<ArrayBuffer>;
    sk.sk_font_get_metrics(this.#ptr, bytes);
    const dv = new DataView(buf);
    return {
      flags: dv.getUint32(0, true),
      top: dv.getFloat32(4, true),
      ascent: dv.getFloat32(8, true),
      descent: dv.getFloat32(12, true),
      bottom: dv.getFloat32(16, true),
      leading: dv.getFloat32(20, true),
      avgCharWidth: dv.getFloat32(24, true),
      maxCharWidth: dv.getFloat32(28, true),
      xMin: dv.getFloat32(32, true),
      xMax: dv.getFloat32(36, true),
      xHeight: dv.getFloat32(40, true),
      capHeight: dv.getFloat32(44, true),
      underlineThickness: dv.getFloat32(48, true),
      underlinePosition: dv.getFloat32(52, true),
      strikeoutThickness: dv.getFloat32(56, true),
      strikeoutPosition: dv.getFloat32(60, true),
    };
  }

  getGlyphIDs(text: string): Uint16Array {
    const utf8 = encodeUtf8(text);
    const maxGlyphs = text.length * 2;
    const glyphs = new Uint16Array(maxGlyphs);
    const glyphBuf = asFfiBuffer(glyphs);
    const count = sk.sk_font_text_to_glyphs(
      this.#ptr, utf8, BigInt(utf8.length), 0 /* UTF8 */, glyphBuf, maxGlyphs,
    ) as number;
    return glyphs.subarray(0, count);
  }

  getGlyphWidths(glyphs: Uint16Array): Float32Array {
    const count = glyphs.length;
    const widths = new Float32Array(count);
    const glyphBuf = asFfiBuffer(glyphs);
    const widthBuf = asFfiBuffer(widths);
    sk.sk_font_glyph_widths(this.#ptr, glyphBuf, count, widthBuf, null!);
    return widths;
  }

  setSubpixel(enable: boolean): void {
    sk.sk_font_set_subpixel(this.#ptr, enable);
  }

  setHinting(hinting: number): void {
    sk.sk_font_set_hinting(this.#ptr, hinting);
  }

  delete(): void {
    sk.sk_font_delete(this.#ptr);
  }
}
