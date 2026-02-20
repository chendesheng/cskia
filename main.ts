/**
 * main.ts — Deno entry point.
 *
 * Creates an NSWindow (via FFI → libskiawindow.dylib), registers event
 * callbacks that accumulate event names, and renders them using Skia's
 * paragraph API each frame.
 *
 * Build the dylib first:
 *   bash build_lib.sh
 *
 * Run:
 *   deno run --allow-ffi --allow-read --unstable-ffi main.ts
 */

import {
  lib,
  toCString,
  pointerArrayBuffer,
  renderCallbackDef,
  eventCallbackDef,
} from "./binding.ts";

// ---------------------------------------------------------------------------
// Event log — accumulates event names as they fire.
// ---------------------------------------------------------------------------

const eventNames: string[] = [];

function makeEventCallback(name: string): Deno.UnsafeCallback {
  return new Deno.UnsafeCallback(eventCallbackDef, () => {
    eventNames.push(name);
  });
}

const onResize    = makeEventCallback("resize");
const onClose     = makeEventCallback("close");
const onMouseDown = makeEventCallback("mouse_down");
const onMouseUp   = makeEventCallback("mouse_up");
const onMouseMove = makeEventCallback("mouse_move");
const onKeyDown   = makeEventCallback("key_down");
const onKeyUp     = makeEventCallback("key_up");

// ---------------------------------------------------------------------------
// Render callback — called each frame by SkiaMetalView inside the dylib.
// ---------------------------------------------------------------------------

function onRender(
  canvasPtr: Deno.PointerValue,
  width: number,
  height: number,
  scale: number,
): void {
  const { symbols } = lib;

  // Clear to dark background (Catppuccin Mocha base: #1E1E2E)
  symbols.sk_canvas_clear(canvasPtr, 0xFF1E1E2E);

  // ---- Font collection ----
  const fontCollection = symbols.sk_font_collection_new();
  const fontMgr = symbols.sk_fontmgr_ref_default();
  symbols.sk_font_collection_set_default_font_manager(fontCollection, fontMgr);

  // ---- Text style ----
  const textStyle = symbols.sk_text_style_create();
  symbols.sk_text_style_set_color(textStyle, 0xFFCDD6F4); // Catppuccin text
  symbols.sk_text_style_set_font_size(textStyle, 24.0 * scale);

  const familyNameStr = toCString("Helvetica Neue");
  const familyNamePtr = symbols.sk_string_new(
    familyNameStr,
    BigInt(familyNameStr.length - 1),
  );
  const familiesArray = pointerArrayBuffer([familyNamePtr]);
  symbols.sk_text_style_set_font_families(textStyle, familiesArray, 1n);

  // ---- Paragraph style ----
  const paraStyle = symbols.sk_paragraph_style_new();
  symbols.sk_paragraph_style_set_text_style(paraStyle, textStyle);

  // ---- Build paragraph with event names ----
  const builder = symbols.sk_paragraph_builder_new(paraStyle, fontCollection);
  symbols.sk_paragraph_builder_push_style(builder, textStyle);

  const text = eventNames.length > 0
    ? eventNames.join(", ")
    : "(no events yet)";
  const textBytes = toCString(text);
  symbols.sk_paragraph_builder_add_text(
    builder,
    textBytes,
    BigInt(textBytes.length - 1),
  );

  const paragraph = symbols.sk_paragraph_builder_build(builder);

  // ---- Layout and paint ----
  symbols.sk_paragraph_layout(paragraph, width);
  const paraHeight = symbols.sk_paragraph_get_height(paragraph);
  const y = (height - paraHeight) * 0.5;

  symbols.sk_paragraph_paint(paragraph, canvasPtr, 24.0 * scale, y);

  // ---- Cleanup ----
  symbols.sk_paragraph_builder_delete(builder);
  symbols.sk_paragraph_style_delete(paraStyle);
  symbols.sk_string_delete(familyNamePtr);
  symbols.sk_font_collection_unref(fontCollection);
}

// ---------------------------------------------------------------------------
// Application lifecycle
// ---------------------------------------------------------------------------

const renderCallback = new Deno.UnsafeCallback(
  renderCallbackDef,
  (canvasPtr, width, height, scale) => {
    onRender(canvasPtr, width as number, height as number, scale as number);
  },
);

const titleBuf = toCString("Skia Metal Demo");
const win = lib.symbols.window_create(800, 500, titleBuf);

lib.symbols.window_set_on_render(win, renderCallback.pointer);

// Register event callbacks
lib.symbols.window_set_on_resize(win, onResize.pointer);
lib.symbols.window_set_on_close(win, onClose.pointer);
lib.symbols.window_set_on_mouse_down(win, onMouseDown.pointer);
lib.symbols.window_set_on_mouse_up(win, onMouseUp.pointer);
lib.symbols.window_set_on_mouse_move(win, onMouseMove.pointer);
lib.symbols.window_set_on_key_down(win, onKeyDown.pointer);
lib.symbols.window_set_on_key_up(win, onKeyUp.pointer);

// Blocks until the window is closed.
lib.symbols.window_run(win);

lib.symbols.window_destroy(win);
renderCallback.close();
onResize.close();
onClose.close();
onMouseDown.close();
onMouseUp.close();
onMouseMove.close();
onKeyDown.close();
onKeyUp.close();
