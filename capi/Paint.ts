import { skLib, toF32Bytes } from "./binding.ts";
import { Color4fFromColor } from "./Color.ts";
import type { Color4f } from "./Color.ts";
import type { MaskFilter } from "./MaskFilter.ts";
import type { Shader } from "./Shader.ts";

const sk = skLib.symbols;

interface Deletable { _ptr: Deno.PointerValue }

export class Paint {
  #ptr: Deno.PointerValue;

  constructor(ptr?: Deno.PointerValue) {
    this.#ptr = ptr ?? sk.sk_paint_new();
  }

  get _ptr(): Deno.PointerValue {
    return this.#ptr;
  }

  copy(): Paint {
    return new Paint(sk.sk_paint_clone(this.#ptr));
  }

  getColor(): Color4f {
    const c = sk.sk_paint_get_color(this.#ptr) as number;
    return Color4fFromColor(c);
  }

  setColor(color: Color4f): void {
    sk.sk_paint_set_color4f(this.#ptr, toF32Bytes(color), null);
  }

  setAlphaf(alpha: number): void {
    const c = new Float32Array(4);
    c[3] = alpha;
    sk.sk_paint_set_color4f(this.#ptr, toF32Bytes(c), null);
  }

  setAntiAlias(aa: boolean): void {
    sk.sk_paint_set_antialias(this.#ptr, aa);
  }

  setStyle(style: number): void {
    sk.sk_paint_set_style(this.#ptr, style);
  }

  getStrokeWidth(): number {
    return sk.sk_paint_get_stroke_width(this.#ptr) as number;
  }

  setStrokeWidth(width: number): void {
    sk.sk_paint_set_stroke_width(this.#ptr, width);
  }

  getStrokeMiter(): number {
    return sk.sk_paint_get_stroke_miter(this.#ptr) as number;
  }

  setStrokeMiter(miter: number): void {
    sk.sk_paint_set_stroke_miter(this.#ptr, miter);
  }

  getStrokeCap(): number {
    return sk.sk_paint_get_stroke_cap(this.#ptr) as number;
  }

  setStrokeCap(cap: number): void {
    sk.sk_paint_set_stroke_cap(this.#ptr, cap);
  }

  getStrokeJoin(): number {
    return sk.sk_paint_get_stroke_join(this.#ptr) as number;
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

  setColorFilter(filter: Deletable | null): void {
    sk.sk_paint_set_colorfilter(this.#ptr, filter ? filter._ptr : null);
  }

  setImageFilter(filter: Deletable | null): void {
    sk.sk_paint_set_imagefilter(this.#ptr, filter ? filter._ptr : null);
  }

  setPathEffect(effect: Deletable | null): void {
    sk.sk_paint_set_path_effect(this.#ptr, effect ? effect._ptr : null);
  }

  setDither(shouldDither: boolean): void {
    sk.sk_paint_set_dither(this.#ptr, shouldDither);
  }

  delete(): void {
    sk.sk_paint_delete(this.#ptr);
  }
}
