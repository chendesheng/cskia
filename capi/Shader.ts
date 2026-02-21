import { skLib, toF32Bytes } from "./binding.ts";
import type { Color4f } from "./Color.ts";

const sk = skLib.symbols;

export class Shader {
  #ptr: Deno.PointerValue;

  private constructor(ptr: Deno.PointerValue) {
    this.#ptr = ptr;
  }

  get _ptr(): Deno.PointerValue {
    return this.#ptr;
  }

  /**
   * Create a linear gradient shader.
   * @param start [x, y] start point
   * @param end [x, y] end point
   * @param colors Array of Color4f values
   * @param pos Color stop positions (0..1), or null for even spacing
   * @param tileMode TileMode enum value (default Clamp = 0)
   */
  static MakeLinearGradient(
    start: [number, number],
    end: [number, number],
    colors: Color4f[],
    pos: number[] | null,
    tileMode: number = 0,
  ): Shader | null {
    const points = toF32Bytes(new Float32Array([
      start[0], start[1], end[0], end[1],
    ]));

    const colorCount = colors.length;
    const colorData = new Float32Array(colorCount * 4);
    for (let i = 0; i < colorCount; i++) {
      colorData[i * 4] = colors[i][0];
      colorData[i * 4 + 1] = colors[i][1];
      colorData[i * 4 + 2] = colors[i][2];
      colorData[i * 4 + 3] = colors[i][3];
    }
    const colorsBytes = toF32Bytes(colorData);

    const posBytes = pos ? toF32Bytes(new Float32Array(pos)) : null!;

    const ptr = sk.sk_shader_new_linear_gradient_color4f(
      points,
      colorsBytes,
      null,
      posBytes,
      colorCount,
      tileMode,
      null,
    );
    if (!ptr) return null;
    return new Shader(ptr);
  }

  delete(): void {
    sk.sk_shader_unref(this.#ptr);
  }
}
