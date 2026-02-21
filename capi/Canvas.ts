import { skLib, toF32Bytes } from "./binding.ts";
import type { Color4f } from "./Color.ts";
import type { Paint } from "./Paint.ts";
import type { Path } from "./Path.ts";
import type { Paragraph } from "./Paragraph.ts";
import type { Rect } from "./Rect.ts";

const sk = skLib.symbols;

export class Canvas {
  #ptr: Deno.PointerValue;

  /** @internal Obtained from Surface.getCanvas(); not user-constructed. */
  constructor(ptr: Deno.PointerValue) {
    this.#ptr = ptr;
  }

  clear(color: Color4f): void {
    sk.sk_canvas_clear_color4f(this.#ptr, color);
  }

  save(): number {
    return sk.sk_canvas_save(this.#ptr) as number;
  }

  restore(): void {
    sk.sk_canvas_restore(this.#ptr);
  }

  saveLayerAlpha(rect: Rect | null, alpha: number): number {
    const rectBytes = rect ? toF32Bytes(rect) : null;
    return sk.sk_canvas_save_layer_alpha(this.#ptr, rectBytes, alpha) as number;
  }

  scale(sx: number, sy: number): void {
    sk.sk_canvas_scale(this.#ptr, sx, sy);
  }

  translate(dx: number, dy: number): void {
    sk.sk_canvas_translate(this.#ptr, dx, dy);
  }

  concat(matrix: Float32Array): void {
    sk.sk_canvas_concat(this.#ptr, toF32Bytes(matrix));
  }

  drawPath(path: Path, paint: Paint): void {
    sk.sk_canvas_draw_path(this.#ptr, path._ptr, paint._ptr);
  }

  drawRect(rect: Rect, paint: Paint): void {
    sk.sk_canvas_draw_rect(this.#ptr, toF32Bytes(rect), paint._ptr);
  }

  /**
   * Draw a rounded rectangle. Uniform corner radii (rx == ry for all corners).
   * Maps to sk_canvas_draw_round_rect.
   */
  drawRRect(rect: Rect, rx: number, ry: number, paint: Paint): void {
    sk.sk_canvas_draw_round_rect(this.#ptr, toF32Bytes(rect), rx, ry, paint._ptr);
  }

  drawLine(
    x0: number, y0: number, x1: number, y1: number,
    paint: Paint,
  ): void {
    sk.sk_canvas_draw_line(this.#ptr, x0, y0, x1, y1, paint._ptr);
  }

  drawCircle(cx: number, cy: number, radius: number, paint: Paint): void {
    sk.sk_canvas_draw_circle(this.#ptr, cx, cy, radius, paint._ptr);
  }

  clipRect(rect: Rect, op: number, antialias: boolean = false): void {
    sk.sk_canvas_clip_rect_with_operation(this.#ptr, toF32Bytes(rect), op, antialias);
  }

  clipPath(path: Path, op: number, antialias: boolean = false): void {
    sk.sk_canvas_clip_path_with_operation(this.#ptr, path._ptr, op, antialias);
  }

  drawParagraph(p: Paragraph, x: number, y: number): void {
    sk.sk_paragraph_paint(p._ptr, this.#ptr, x, y);
  }
}
