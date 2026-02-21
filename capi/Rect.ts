import { toF32Bytes } from "./binding.ts";

/**
 * Rect as Float32Array: [left, top, right, bottom].
 * Matches sk_rect_t memory layout.
 */
export type Rect = Float32Array;

export function XYWHRect(
  x: number,
  y: number,
  width: number,
  height: number,
): Rect {
  return new Float32Array([x, y, x + width, y + height]);
}

export function LTRBRect(
  left: number,
  top: number,
  right: number,
  bottom: number,
): Rect {
  return new Float32Array([left, top, right, bottom]);
}

export function rectToBytes(rect: Rect): Uint8Array<ArrayBuffer> {
  return toF32Bytes(rect);
}
