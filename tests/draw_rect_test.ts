import { assertImageSnapshot } from "./helpers/snapshot.ts";
import { Paint } from "../capi/Paint.ts";
import { Red, White } from "../capi/Color.ts";

Deno.test("draw red rectangle", async (t) => {
  await assertImageSnapshot(t, 200, 200, (canvas) => {
    canvas.clear(White);
    const paint = new Paint();
    paint.setColor(Red);
    canvas.drawRect(new Float32Array([20, 20, 180, 180]), paint);
    paint.delete();
  });
});
