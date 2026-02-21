import { toF32Bytes } from "./binding.ts";

/**
 * Rect as Float32Array: [left, top, right, bottom].
 * Matches sk_rect_t memory layout.
 */
export type Rect = Float32Array;

/**
 * RRect as 12-float Float32Array:
 * [left, top, right, bottom, rx1, ry1, rx2, ry2, rx3, ry3, rx4, ry4]
 * Corners: top-left, top-right, bottom-right, bottom-left.
 * Matches CanvasKit RRect layout.
 */
export type RRect = Float32Array;

export type IRect = Int32Array;

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

export function XYWHiRect(
  x: number,
  y: number,
  width: number,
  height: number,
): IRect {
  return new Int32Array([x, y, x + width, y + height]);
}

export function LTRBiRect(
  left: number,
  top: number,
  right: number,
  bottom: number,
): IRect {
  return new Int32Array([left, top, right, bottom]);
}

/**
 * Create an RRect with uniform corner radii, matching CanvasKit.RRectXY().
 */
export function RRectXY(rect: Rect | number[], rx: number, ry: number): RRect {
  const l = rect[0], t = rect[1], r = rect[2], b = rect[3];
  return new Float32Array([l, t, r, b, rx, ry, rx, ry, rx, ry, rx, ry]);
}

/** Extract the [left, top, right, bottom] portion of an RRect. */
export function rrectGetRect(rrect: RRect): Rect {
  return new Float32Array([rrect[0], rrect[1], rrect[2], rrect[3]]);
}

/** True when all four corners share the same rx and ry. */
export function rrectIsUniform(rrect: RRect): boolean {
  const rx = rrect[4], ry = rrect[5];
  return (
    rrect[6] === rx && rrect[7] === ry &&
    rrect[8] === rx && rrect[9] === ry &&
    rrect[10] === rx && rrect[11] === ry
  );
}

export function rectToBytes(rect: Rect): Uint8Array<ArrayBuffer> {
  return toF32Bytes(rect);
}
