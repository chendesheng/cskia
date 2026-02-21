/**
 * 3x3 matrix utilities backed by Skia's SkMatrix via FFI.
 * Matrices are 9-element number arrays in row-major order:
 *   [scaleX, skewX, transX, skewY, scaleY, transY, persp0, persp1, persp2]
 */

import { skLib, toF32Bytes } from "./binding.ts";

const sk = skLib.symbols;
const MATRIX_FLOATS = 9;

export type Matrix3x3 = number[];

function f32Buf(): Float32Array {
  return new Float32Array(MATRIX_FLOATS);
}

function toArray(buf: Float32Array): Matrix3x3 {
  return Array.from(buf);
}

export function identity(): Matrix3x3 {
  return [1, 0, 0, 0, 1, 0, 0, 0, 1];
}

export function multiply(...matrices: Matrix3x3[]): Matrix3x3 {
  if (matrices.length === 0) return identity();
  let result = matrices[0];
  for (let i = 1; i < matrices.length; i++) {
    const out = f32Buf();
    sk.sk_matrix_concat(
      toF32Bytes(out),
      toF32Bytes(new Float32Array(result)),
      toF32Bytes(new Float32Array(matrices[i])),
    );
    result = toArray(out);
  }
  return result;
}

export function rotated(radians: number): Matrix3x3 {
  const out = f32Buf();
  sk.sk_matrix_rotate_rad(radians, toF32Bytes(out));
  return toArray(out);
}

export function scaled(sx: number, sy: number): Matrix3x3 {
  const out = f32Buf();
  sk.sk_matrix_scale(sx, sy, toF32Bytes(out));
  return toArray(out);
}

export function translated(dx: number, dy: number): Matrix3x3 {
  const out = f32Buf();
  sk.sk_matrix_translate(dx, dy, toF32Bytes(out));
  return toArray(out);
}

export function skewed(kx: number, ky: number): Matrix3x3 {
  const out = f32Buf();
  sk.sk_matrix_skew(kx, ky, toF32Bytes(out));
  return toArray(out);
}

export function invert(m: Matrix3x3): Matrix3x3 | null {
  const out = f32Buf();
  const ok = sk.sk_matrix_invert(
    toF32Bytes(new Float32Array(m)),
    toF32Bytes(out),
  );
  return ok ? toArray(out) : null;
}

/**
 * Transform an array of [x, y, x, y, ...] points by the given matrix.
 */
export function mapPoints(m: Matrix3x3, points: number[]): number[] {
  const count = points.length / 2;
  const src = new Float32Array(points);
  const dst = new Float32Array(points.length);
  sk.sk_matrix_map_points(
    toF32Bytes(new Float32Array(m)),
    toF32Bytes(dst),
    toF32Bytes(src),
    count,
  );
  return Array.from(dst);
}
