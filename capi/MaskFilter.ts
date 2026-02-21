import { skLib } from "./binding.ts";

const sk = skLib.symbols;

export class MaskFilter {
  #ptr: Deno.PointerValue;

  private constructor(ptr: Deno.PointerValue) {
    this.#ptr = ptr;
  }

  get _ptr(): Deno.PointerValue {
    return this.#ptr;
  }

  static MakeBlur(
    style: number,
    sigma: number,
    respectCTM: boolean = true,
  ): MaskFilter | null {
    const ptr = sk.sk_maskfilter_new_blur_with_flags(style, sigma, respectCTM);
    if (!ptr) return null;
    return new MaskFilter(ptr);
  }

  delete(): void {
    sk.sk_maskfilter_unref(this.#ptr);
  }
}
