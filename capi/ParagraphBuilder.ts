import { paragraphBuilderAddText, skLib } from "./binding.ts";
import type { FontCollection } from "./FontCollection.ts";
import { Paragraph } from "./Paragraph.ts";
import type { ParagraphStyle } from "./ParagraphStyle.ts";
import type { TextStyle } from "./TextStyle.ts";

const sk = skLib.symbols;

export class ParagraphBuilder {
  #ptr: Deno.PointerValue;

  private constructor(ptr: Deno.PointerValue) {
    this.#ptr = ptr;
  }

  static Make(
    style: ParagraphStyle,
    fontCollection: FontCollection,
  ): ParagraphBuilder {
    const ptr = sk.sk_paragraph_builder_new(style._ptr, fontCollection._ptr);
    return new ParagraphBuilder(ptr);
  }

  pushStyle(style: TextStyle): void {
    sk.sk_paragraph_builder_push_style(this.#ptr, style._ptr);
  }

  addText(text: string): void {
    paragraphBuilderAddText(this.#ptr, text);
  }

  build(): Paragraph {
    const ptr = sk.sk_paragraph_builder_build(this.#ptr);
    return new Paragraph(ptr);
  }

  delete(): void {
    sk.sk_paragraph_builder_delete(this.#ptr);
  }
}
