import { skLib, toF32Bytes } from "./binding.ts";
import type { Color4f } from "./Color.ts";
import type { MaskFilter } from "./MaskFilter.ts";
import type { Shader } from "./Shader.ts";

const sk = skLib.symbols;

export class Paint {
  #ptr: Deno.PointerValue;

  constructor() {
    this.#ptr = sk.sk_paint_new();
  }

  get _ptr(): Deno.PointerValue {
    return this.#ptr;
  }

  setColor(color: Color4f): void {
    sk.sk_paint_set_color4f(this.#ptr, toF32Bytes(color), null);
  }

  setAntiAlias(aa: boolean): void {
    sk.sk_paint_set_antialias(this.#ptr, aa);
  }

  setStyle(style: number): void {
    sk.sk_paint_set_style(this.#ptr, style);
  }

  setStrokeWidth(width: number): void {
    sk.sk_paint_set_stroke_width(this.#ptr, width);
  }

  setStrokeMiter(miter: number): void {
    sk.sk_paint_set_stroke_miter(this.#ptr, miter);
  }

  setStrokeCap(cap: number): void {
    sk.sk_paint_set_stroke_cap(this.#ptr, cap);
  }

  setStrokeJoin(join: number): void {
    sk.sk_paint_set_stroke_join(this.#ptr, join);
  }

  setShader(shader: Shader | null): void {
    sk.sk_paint_set_shader(this.#ptr, shader ? shader._ptr : null);
  }

  setMaskFilter(filter: MaskFilter | null): void {
    sk.sk_paint_set_maskfilter(this.#ptr, filter ? filter._ptr : null);
  }

  setBlendMode(mode: number): void {
    sk.sk_paint_set_blend_mode(this.#ptr, mode);
  }

  delete(): void {
    sk.sk_paint_delete(this.#ptr);
  }
}
