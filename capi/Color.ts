/** Packed uint32 ARGB color, same as SkColor / sk_color_t. */
export type Color = number;

/** 4-element Float32Array [R, G, B, A] in 0..1, matches sk_color4f_t layout. */
export type Color4f = Float32Array;

/** 3-element Float32Array [hue 0..360, saturation 0..1, value 0..1]. */
export type HSV = Float32Array;

export function Color(a: number, r: number, g: number, b: number): Color {
  return (((a & 0xff) << 24) | ((r & 0xff) << 16) | ((g & 0xff) << 8) | (b & 0xff)) >>> 0;
}

export function Color4f(r: number, g: number, b: number, a: number = 1.0): Color4f {
  return new Float32Array([r, g, b, a]);
}

export function Color4fFromColor(color: Color): Color4f {
  return new Float32Array([
    ((color >> 16) & 0xff) / 255,
    ((color >> 8) & 0xff) / 255,
    (color & 0xff) / 255,
    ((color >>> 24) & 0xff) / 255,
  ]);
}

export function color4fToColor(c: Color4f): Color {
  const a = Math.round(c[3] * 255) & 0xff;
  const r = Math.round(c[0] * 255) & 0xff;
  const g = Math.round(c[1] * 255) & 0xff;
  const b = Math.round(c[2] * 255) & 0xff;
  return ((a << 24) | (r << 16) | (g << 8) | b) >>> 0;
}

export function colorToColor4f(color: Color): Color4f {
  return Color4fFromColor(color);
}

export function color4fSetAlpha(c: Color4f, a: number): Color4f {
  return new Float32Array([c[0], c[1], c[2], a]);
}

export function color4fToHSV(c: Color4f): HSV {
  const r = c[0], g = c[1], b = c[2];
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;

  let h = 0;
  if (d !== 0) {
    if (max === r) {
      h = ((g - b) / d) % 6;
    } else if (max === g) {
      h = (b - r) / d + 2;
    } else {
      h = (r - g) / d + 4;
    }
    h *= 60;
    if (h < 0) h += 360;
  }

  const s = max === 0 ? 0 : d / max;
  return new Float32Array([h, s, max]);
}

export function hsvToColor4f(hsv: HSV, alpha: number = 1.0): Color4f {
  const h = hsv[0], s = hsv[1], v = hsv[2];
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;

  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; }
  else if (h < 120) { r = x; g = c; }
  else if (h < 180) { g = c; b = x; }
  else if (h < 240) { g = x; b = c; }
  else if (h < 300) { r = x; b = c; }
  else { r = c; b = x; }

  return new Float32Array([r + m, g + m, b + m, alpha]);
}

export const Transparent: Color4f = Color4f(0, 0, 0, 0);
export const Black: Color4f       = Color4f(0, 0, 0, 1);
export const White: Color4f       = Color4f(1, 1, 1, 1);
export const Red: Color4f         = Color4f(1, 0, 0, 1);
export const Green: Color4f       = Color4f(0, 1, 0, 1);
export const Blue: Color4f        = Color4f(0, 0, 1, 1);
export const Yellow: Color4f      = Color4f(1, 1, 0, 1);
export const Cyan: Color4f        = Color4f(0, 1, 1, 1);
export const Magenta: Color4f     = Color4f(1, 0, 1, 1);
export const DkGray: Color4f      = Color4f(0.25, 0.25, 0.25, 1);
export const Gray: Color4f        = Color4f(0.50, 0.50, 0.50, 1);
export const LtGray: Color4f      = Color4f(0.75, 0.75, 0.75, 1);
