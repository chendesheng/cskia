import { skLib } from "./binding.ts";
import type { TextStyle } from "./TextStyle.ts";

const sk = skLib.symbols;

export interface ParagraphStyleOptions {
  textStyle?: TextStyle;
}

export class ParagraphStyle {
  #ptr: Deno.PointerValue;

  constructor(opts?: ParagraphStyleOptions) {
    this.#ptr = sk.sk_paragraph_style_new();
    if (opts?.textStyle) this.setTextStyle(opts.textStyle);
  }

  get _ptr(): Deno.PointerValue {
    return this.#ptr;
  }

  setTextStyle(style: TextStyle): void {
    sk.sk_paragraph_style_set_text_style(this.#ptr, style._ptr);
  }

  delete(): void {
    sk.sk_paragraph_style_delete(this.#ptr);
  }
}
