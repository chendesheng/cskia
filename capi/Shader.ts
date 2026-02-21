import { skLib, toF32Bytes } from "./binding.ts";
import type { Color4f } from "./Color.ts";

const sk = skLib.symbols;

function packColors(colors: Color4f[]): Uint8Array<ArrayBuffer> {
  const n = colors.length;
  const data = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) {
    data[i * 4] = colors[i][0];
    data[i * 4 + 1] = colors[i][1];
    data[i * 4 + 2] = colors[i][2];
    data[i * 4 + 3] = colors[i][3];
  }
  return toF32Bytes(data);
}

function packPos(pos: number[] | null): Uint8Array<ArrayBuffer> | null {
  return pos ? toF32Bytes(new Float32Array(pos)) : null;
}

export class Shader {
  #ptr: Deno.PointerValue;

  constructor(ptr: Deno.PointerValue) {
    this.#ptr = ptr;
  }

  get _ptr(): Deno.PointerValue {
    return this.#ptr;
  }

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

    const ptr = sk.sk_shader_new_linear_gradient_color4f(
      points,
      packColors(colors),
      null,
      packPos(pos)!,
      colors.length,
      tileMode,
      null,
    );
    return ptr ? new Shader(ptr) : null;
  }

  static MakeRadialGradient(
    center: [number, number],
    radius: number,
    colors: Color4f[],
    pos: number[] | null,
    tileMode: number = 0,
  ): Shader | null {
    const centerBytes = toF32Bytes(new Float32Array(center));
    const ptr = sk.sk_shader_new_radial_gradient_color4f(
      centerBytes,
      radius,
      packColors(colors),
      null,
      packPos(pos)!,
      colors.length,
      tileMode,
      null,
    );
    return ptr ? new Shader(ptr) : null;
  }

  static MakeSweepGradient(
    cx: number, cy: number,
    colors: Color4f[],
    pos: number[] | null,
    tileMode: number = 0,
    startAngle: number = 0,
    endAngle: number = 360,
  ): Shader | null {
    const centerBytes = toF32Bytes(new Float32Array([cx, cy]));
    const ptr = sk.sk_shader_new_sweep_gradient_color4f(
      centerBytes,
      packColors(colors),
      null,
      packPos(pos)!,
      colors.length,
      tileMode,
      startAngle,
      endAngle,
      null,
    );
    return ptr ? new Shader(ptr) : null;
  }

  static MakeTwoPointConicalGradient(
    start: [number, number], startRadius: number,
    end: [number, number], endRadius: number,
    colors: Color4f[],
    pos: number[] | null,
    tileMode: number = 0,
  ): Shader | null {
    const startBytes = toF32Bytes(new Float32Array(start));
    const endBytes = toF32Bytes(new Float32Array(end));
    const ptr = sk.sk_shader_new_two_point_conical_gradient_color4f(
      startBytes,
      startRadius,
      endBytes,
      endRadius,
      packColors(colors),
      null,
      packPos(pos)!,
      colors.length,
      tileMode,
      null,
    );
    return ptr ? new Shader(ptr) : null;
  }

  static MakeColor(color: Color4f): Shader | null {
    const ptr = sk.sk_shader_new_color4f(toF32Bytes(color), null);
    return ptr ? new Shader(ptr) : null;
  }

  static MakeBlend(mode: number, one: Shader, two: Shader): Shader | null {
    const ptr = sk.sk_shader_new_blend(mode, one._ptr, two._ptr);
    return ptr ? new Shader(ptr) : null;
  }

  delete(): void {
    sk.sk_shader_unref(this.#ptr);
  }
}
