import { skLib } from "./binding.ts";

const sk = skLib.symbols;

export class FontMgr {
  #ptr: Deno.PointerValue;

  private constructor(ptr: Deno.PointerValue) {
    this.#ptr = ptr;
  }

  static RefDefault(): FontMgr {
    const ptr = sk.sk_fontmgr_ref_default();
    return new FontMgr(ptr);
  }

  get _ptr(): Deno.PointerValue {
    return this.#ptr;
  }
}
