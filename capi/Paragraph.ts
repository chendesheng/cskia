import { skLib } from "./binding.ts";

const sk = skLib.symbols;

export class Paragraph {
  #ptr: Deno.PointerValue;

  /** @internal Use ParagraphBuilder.build() to create instances. */
  constructor(ptr: Deno.PointerValue) {
    this.#ptr = ptr;
  }

  get _ptr(): Deno.PointerValue {
    return this.#ptr;
  }

  layout(width: number): void {
    sk.sk_paragraph_layout(this.#ptr, width);
  }

  getHeight(): number {
    return sk.sk_paragraph_get_height(this.#ptr) as number;
  }

  delete(): void {
    // Paragraph lifecycle is managed by the builder in the C API;
    // no separate delete symbol is currently exposed.
  }
}
