export const PaintStyle = {
  Fill: 0,
  Stroke: 1,
  StrokeAndFill: 2,
} as const;

export const ClipOp = {
  Difference: 0,
  Intersect: 1,
} as const;

export const BlurStyle = {
  Normal: 0,
  Solid: 1,
  Outer: 2,
  Inner: 3,
} as const;

export const TileMode = {
  Clamp: 0,
  Repeat: 1,
  Mirror: 2,
  Decal: 3,
} as const;

export const StrokeCap = {
  Butt: 0,
  Round: 1,
  Square: 2,
} as const;

export const StrokeJoin = {
  Miter: 0,
  Round: 1,
  Bevel: 2,
} as const;

export const TextAlign = {
  Left: 0,
  Right: 1,
  Center: 2,
  Justify: 3,
  Start: 4,
  End: 5,
} as const;

export const TextDirection = {
  RTL: 0,
  LTR: 1,
} as const;

export const FontWeight = {
  Invisible: 0,
  Thin: 100,
  ExtraLight: 200,
  Light: 300,
  Normal: 400,
  Medium: 500,
  SemiBold: 600,
  Bold: 700,
  ExtraBold: 800,
  Black: 900,
  ExtraBlack: 1000,
} as const;

export const FontSlant = {
  Upright: 0,
  Italic: 1,
  Oblique: 2,
} as const;

export const FontWidth = {
  UltraCondensed: 1,
  ExtraCondensed: 2,
  Condensed: 3,
  SemiCondensed: 4,
  Normal: 5,
  SemiExpanded: 6,
  Expanded: 7,
  ExtraExpanded: 8,
  UltraExpanded: 9,
} as const;

export const RectHeightStyle = {
  Tight: 0,
  Max: 1,
  IncludeLineSpacingMiddle: 2,
  IncludeLineSpacingTop: 3,
  IncludeLineSpacingBottom: 4,
  Strut: 5,
} as const;

export const RectWidthStyle = {
  Tight: 0,
  Max: 1,
} as const;

export const Affinity = {
  Upstream: 0,
  Downstream: 1,
} as const;

export const PlaceholderAlignment = {
  Baseline: 0,
  AboveBaseline: 1,
  BelowBaseline: 2,
  Top: 3,
  Bottom: 4,
  Middle: 5,
} as const;

export const TextDecoration = {
  NoDecoration: 0x0,
  Underline: 0x1,
  Overline: 0x2,
  LineThrough: 0x4,
} as const;
