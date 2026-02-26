import { assertEquals, assertAlmostEquals } from "jsr:@std/assert";
import {
  identity,
  invert,
  mapPoints,
  multiply,
  rotated,
  scaled,
  translated,
  type Matrix3x3,
} from "../capi/Matrix.ts";

function assertMatrixClose(
  actual: Matrix3x3,
  expected: Matrix3x3,
  tolerance = 1e-5,
) {
  assertEquals(actual.length, expected.length);
  for (let i = 0; i < actual.length; i++) {
    assertAlmostEquals(actual[i]!, expected[i]!, tolerance, `element [${i}]`);
  }
}

const I = identity();

Deno.test("identity returns the 3x3 identity matrix", () => {
  assertEquals(I, new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1]));
});

Deno.test("rotate 180° twice returns identity", () => {
  const r180 = rotated(Math.PI);
  const result = multiply(r180, r180);
  assertMatrixClose(result, I);
});

Deno.test("multiply with identity is no-op", () => {
  const m = scaled(3, 7);
  assertMatrixClose(multiply(m, I), m);
  assertMatrixClose(multiply(I, m), m);
});

Deno.test("scale then invert gives identity", () => {
  const s = scaled(2, 3);
  const sInv = invert(s)!;
  assertMatrixClose(multiply(s, sInv), I);
});

Deno.test("translate then invert gives identity", () => {
  const t = translated(5, -3);
  const tInv = invert(t)!;
  assertMatrixClose(multiply(t, tInv), I);
});

Deno.test("mapPoints with identity leaves points unchanged", () => {
  const pts = [1, 2, 3, 4];
  const mapped = mapPoints(I, pts);
  for (let i = 0; i < pts.length; i++) {
    assertAlmostEquals(mapped[i]!, pts[i]!, 1e-5);
  }
});

Deno.test("mapPoints with translation shifts points", () => {
  const t = translated(10, 20);
  const mapped = mapPoints(t, [1, 2, 3, 4]);
  assertAlmostEquals(mapped[0]!, 11, 1e-5);
  assertAlmostEquals(mapped[1]!, 22, 1e-5);
  assertAlmostEquals(mapped[2]!, 13, 1e-5);
  assertAlmostEquals(mapped[3]!, 24, 1e-5);
});

Deno.test("invert of singular matrix returns null", () => {
  const singular = scaled(0, 0);
  assertEquals(invert(singular), null);
});
