import { skLib } from "./binding.ts";
import type { Paragraph } from "./Paragraph.ts";

const sk = skLib.symbols;

export class Canvas {
  #ptr: Deno.PointerValue;

  /** @internal Obtained from Surface.getCanvas(); not user-constructed. */
  constructor(ptr: Deno.PointerValue) {
    this.#ptr = ptr;
  }

  clear(color: number): void {
    sk.sk_canvas_clear(this.#ptr, color);
  }

  drawParagraph(p: Paragraph, x: number, y: number): void {
    sk.sk_paragraph_paint(p._ptr, this.#ptr, x, y);
  }
}
