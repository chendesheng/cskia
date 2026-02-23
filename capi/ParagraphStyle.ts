import { encodeUtf8, skLib } from "./binding.ts";
import { TextStyle, type TextStyleOptions } from "./TextStyle.ts";

const sk = skLib.symbols;

export interface ParagraphStyleOptions {
  textStyle?: TextStyle | TextStyleOptions;
  textAlign?: number;
  textDirection?: number;
  maxLines?: number;
  ellipsis?: string;
  heightMultiplier?: number;
}

export class ParagraphStyle {
  #ptr: Deno.PointerValue;

  constructor(opts?: ParagraphStyleOptions) {
    this.#ptr = sk.sk_paragraph_style_new();
    if (opts?.textStyle) {
      const ts =
        opts.textStyle instanceof TextStyle
          ? opts.textStyle
          : new TextStyle(opts.textStyle);
      this.setTextStyle(ts);
    }
    if (opts?.textAlign !== undefined) this.setTextAlign(opts.textAlign);
    if (opts?.textDirection !== undefined) this.setTextDirection(opts.textDirection);
    if (opts?.maxLines !== undefined) this.setMaxLines(opts.maxLines);
    if (opts?.ellipsis !== undefined) this.setEllipsis(opts.ellipsis);
    if (opts?.heightMultiplier !== undefined) this.setHeight(opts.heightMultiplier);
  }

  get _ptr(): Deno.PointerValue {
    return this.#ptr;
  }

  setTextStyle(style: TextStyle): void {
    sk.sk_paragraph_style_set_text_style(this.#ptr, style._ptr);
  }

  setTextAlign(align: number): void {
    sk.sk_paragraph_style_set_text_align(this.#ptr, align);
  }

  setTextDirection(dir: number): void {
    sk.sk_paragraph_style_set_text_direction(this.#ptr, dir);
  }

  setMaxLines(maxLines: number): void {
    sk.sk_paragraph_style_set_max_lines(this.#ptr, BigInt(maxLines));
  }

  setEllipsis(ellipsis: string): void {
    const bytes = encodeUtf8(ellipsis);
    sk.sk_paragraph_style_set_ellipsis(this.#ptr, bytes, BigInt(bytes.length));
  }

  setHeight(height: number): void {
    sk.sk_paragraph_style_set_height(this.#ptr, height);
  }

  delete(): void {
    sk.sk_paragraph_style_delete(this.#ptr);
  }
}
