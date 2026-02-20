import {
  createBackendRenderTarget,
  GR_SURFACE_ORIGIN_TOP_LEFT,
  SK_COLOR_TYPE_BGRA_8888,
  skLib,
} from "./binding.ts";
import { Canvas } from "./Canvas.ts";
import type { GrDirectContext } from "./GrDirectContext.ts";

const sk = skLib.symbols;

export class Surface {
  #ptr: Deno.PointerValue;
  #backendTarget: Deno.PointerValue;

  private constructor(
    ptr: Deno.PointerValue,
    backendTarget: Deno.PointerValue,
  ) {
    this.#ptr = ptr;
    this.#backendTarget = backendTarget;
  }

  static MakeFromBackendRenderTarget(
    ctx: GrDirectContext,
    width: number,
    height: number,
    texture: Deno.PointerValue,
    origin: number = GR_SURFACE_ORIGIN_TOP_LEFT,
    colorType: number = SK_COLOR_TYPE_BGRA_8888,
  ): Surface | null {
    const target = createBackendRenderTarget(width, height, texture);
    const ptr = sk.sk_surface_new_backend_render_target(
      ctx._ptr,
      target,
      origin,
      colorType,
      null,
      null,
    );
    if (!ptr) {
      sk.gr_backendrendertarget_delete(target);
      return null;
    }
    return new Surface(ptr, target);
  }

  getCanvas(): Canvas {
    const ptr = sk.sk_surface_get_canvas(this.#ptr);
    return new Canvas(ptr);
  }

  delete(): void {
    sk.sk_surface_unref(this.#ptr);
    sk.gr_backendrendertarget_delete(this.#backendTarget);
  }
}
