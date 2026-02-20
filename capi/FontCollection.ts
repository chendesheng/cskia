import { skLib } from "./binding.ts";
import type { FontMgr } from "./FontMgr.ts";

const sk = skLib.symbols;

export class FontCollection {
  #ptr: Deno.PointerValue;

  private constructor(ptr: Deno.PointerValue) {
    this.#ptr = ptr;
  }

  static Make(): FontCollection {
    const ptr = sk.sk_font_collection_new();
    return new FontCollection(ptr);
  }

  get _ptr(): Deno.PointerValue {
    return this.#ptr;
  }

  setDefaultFontManager(mgr: FontMgr): void {
    sk.sk_font_collection_set_default_font_manager(this.#ptr, mgr._ptr);
  }

  delete(): void {
    sk.sk_font_collection_unref(this.#ptr);
  }
}
