/**
 * binding.ts — Deno FFI bindings for libskiawindow.dylib.
 *
 * The dylib bundles both the NSWindow/Metal window management (window.m) and
 * the Skia C API (sk_capi.cpp + Skia static libs) into a single shared
 * library so Deno only needs one dlopen call.
 */

import { join, dirname, fromFileUrl } from "jsr:@std/path";

const libDir = join(dirname(fromFileUrl(import.meta.url)), "build");
const libPath = join(libDir, "libskiawindow.dylib");

// ---------------------------------------------------------------------------
// FFI symbol definitions
// ---------------------------------------------------------------------------

export const lib = Deno.dlopen(libPath, {
  // --- Window API ---

  /** Create a window. Returns an opaque window_t* handle. */
  window_create: {
    parameters: ["i32", "i32", "buffer"],
    result: "pointer",
    nonblocking: false,
  },

  /**
   * Register the frame render callback.
   * Signature: (sk_canvas_t*, int width, int height, double scale) -> void
   */
  window_set_on_render: {
    parameters: ["pointer", "function"],
    result: "void",
    nonblocking: false,
  },

  /** Start the NSApplication run loop. Blocks until the window is closed. */
  window_run: {
    parameters: ["pointer"],
    result: "void",
    nonblocking: false,
  },

  /** Free the window_t struct (call after window_run returns). */
  window_destroy: {
    parameters: ["pointer"],
    result: "void",
    nonblocking: false,
  },

  // --- Window property setters ---

  window_set_title: {
    parameters: ["pointer", "buffer"],
    result: "void",
    nonblocking: false,
  },

  window_set_width: {
    parameters: ["pointer", "i32"],
    result: "void",
    nonblocking: false,
  },

  window_set_height: {
    parameters: ["pointer", "i32"],
    result: "void",
    nonblocking: false,
  },

  window_set_close_button_visible: {
    parameters: ["pointer", "bool"],
    result: "void",
    nonblocking: false,
  },

  window_set_miniaturize_button_visible: {
    parameters: ["pointer", "bool"],
    result: "void",
    nonblocking: false,
  },

  window_set_zoom_button_visible: {
    parameters: ["pointer", "bool"],
    result: "void",
    nonblocking: false,
  },

  window_set_resizable: {
    parameters: ["pointer", "bool"],
    result: "void",
    nonblocking: false,
  },

  // --- Window property getters ---

  /** Writes null-terminated UTF-8 title into caller-supplied buffer of bufLen bytes. */
  window_get_title: {
    parameters: ["pointer", "buffer", "i32"],
    result: "void",
    nonblocking: false,
  },

  window_get_width: {
    parameters: ["pointer"],
    result: "i32",
    nonblocking: false,
  },

  window_get_height: {
    parameters: ["pointer"],
    result: "i32",
    nonblocking: false,
  },

  window_get_close_button_visible: {
    parameters: ["pointer"],
    result: "bool",
    nonblocking: false,
  },

  window_get_miniaturize_button_visible: {
    parameters: ["pointer"],
    result: "bool",
    nonblocking: false,
  },

  window_get_zoom_button_visible: {
    parameters: ["pointer"],
    result: "bool",
    nonblocking: false,
  },

  window_get_resizable: {
    parameters: ["pointer"],
    result: "bool",
    nonblocking: false,
  },

  // --- Window event callbacks (all have signature: () -> void) ---

  window_set_on_resize: {
    parameters: ["pointer", "function"],
    result: "void",
    nonblocking: false,
  },

  window_set_on_close: {
    parameters: ["pointer", "function"],
    result: "void",
    nonblocking: false,
  },

  window_set_on_mouse_down: {
    parameters: ["pointer", "function"],
    result: "void",
    nonblocking: false,
  },

  window_set_on_mouse_up: {
    parameters: ["pointer", "function"],
    result: "void",
    nonblocking: false,
  },

  window_set_on_mouse_move: {
    parameters: ["pointer", "function"],
    result: "void",
    nonblocking: false,
  },

  window_set_on_key_down: {
    parameters: ["pointer", "function"],
    result: "void",
    nonblocking: false,
  },

  window_set_on_key_up: {
    parameters: ["pointer", "function"],
    result: "void",
    nonblocking: false,
  },

  // --- Canvas ---

  /** Clear the entire canvas with an ARGB colour (e.g. 0xFFFFFFFF = opaque white). */
  sk_canvas_clear: {
    parameters: ["pointer", "u32"],
    result: "void",
    nonblocking: false,
  },

  // --- Font manager ---

  /** Return a ref to the default system font manager. */
  sk_fontmgr_ref_default: {
    parameters: [],
    result: "pointer",
    nonblocking: false,
  },

  // --- Font collection ---

  sk_font_collection_new: {
    parameters: [],
    result: "pointer",
    nonblocking: false,
  },

  sk_font_collection_set_default_font_manager: {
    parameters: ["pointer", "pointer"],
    result: "void",
    nonblocking: false,
  },

  sk_font_collection_unref: {
    parameters: ["pointer"],
    result: "void",
    nonblocking: false,
  },

  // --- sk_string ---

  /** Create an sk_string_t from a UTF-8 buffer and byte length. */
  sk_string_new: {
    parameters: ["buffer", "usize"],
    result: "pointer",
    nonblocking: false,
  },

  sk_string_delete: {
    parameters: ["pointer"],
    result: "void",
    nonblocking: false,
  },

  // --- Text style ---

  sk_text_style_create: {
    parameters: [],
    result: "pointer",
    nonblocking: false,
  },

  sk_text_style_set_color: {
    parameters: ["pointer", "u32"],
    result: "void",
    nonblocking: false,
  },

  sk_text_style_set_font_size: {
    parameters: ["pointer", "f32"],
    result: "void",
    nonblocking: false,
  },

  /**
   * Set font families from an array of sk_string_t* pointers.
   * Parameters: (sk_text_style_t*, const sk_string_t**, size_t count)
   */
  sk_text_style_set_font_families: {
    parameters: ["pointer", "buffer", "usize"],
    result: "void",
    nonblocking: false,
  },

  // --- Paragraph style ---

  sk_paragraph_style_new: {
    parameters: [],
    result: "pointer",
    nonblocking: false,
  },

  sk_paragraph_style_set_text_style: {
    parameters: ["pointer", "pointer"],
    result: "void",
    nonblocking: false,
  },

  sk_paragraph_style_delete: {
    parameters: ["pointer"],
    result: "void",
    nonblocking: false,
  },

  // --- Paragraph builder ---

  sk_paragraph_builder_new: {
    parameters: ["pointer", "pointer"],
    result: "pointer",
    nonblocking: false,
  },

  sk_paragraph_builder_push_style: {
    parameters: ["pointer", "pointer"],
    result: "void",
    nonblocking: false,
  },

  sk_paragraph_builder_add_text: {
    parameters: ["pointer", "buffer", "usize"],
    result: "void",
    nonblocking: false,
  },

  /** Consumes the builder and returns a sk_paragraph_t*. */
  sk_paragraph_builder_build: {
    parameters: ["pointer"],
    result: "pointer",
    nonblocking: false,
  },

  sk_paragraph_builder_delete: {
    parameters: ["pointer"],
    result: "void",
    nonblocking: false,
  },

  // --- Paragraph ---

  sk_paragraph_layout: {
    parameters: ["pointer", "f32"],
    result: "void",
    nonblocking: false,
  },

  sk_paragraph_get_height: {
    parameters: ["pointer"],
    result: "f32",
    nonblocking: false,
  },

  sk_paragraph_paint: {
    parameters: ["pointer", "pointer", "f32", "f32"],
    result: "void",
    nonblocking: false,
  },
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Encode a JS string as a null-terminated UTF-8 Uint8Array backed by a plain ArrayBuffer. */
export function toCString(s: string): Uint8Array<ArrayBuffer> {
  const encoded = new TextEncoder().encode(s);
  const buf = new Uint8Array(new ArrayBuffer(encoded.length + 1));
  buf.set(encoded);
  // last byte is already 0 from ArrayBuffer zero-initialisation
  return buf;
}

/**
 * Build a pointer array (as a Uint8Array<ArrayBuffer>) containing the raw pointer
 * values of the given pointer handles.  Used to pass arrays of sk_string_t*
 * to functions like sk_text_style_set_font_families.
 */
export function pointerArrayBuffer(
  ptrs: Deno.PointerValue[],
): Uint8Array<ArrayBuffer> {
  const ab = new ArrayBuffer(8 * ptrs.length);
  const view = new DataView(ab);
  for (let i = 0; i < ptrs.length; i++) {
    const p = Deno.UnsafePointer.value(ptrs[i]);
    view.setBigUint64(i * 8, BigInt(p), true /* little-endian */);
  }
  return new Uint8Array(ab);
}

/** The FFI definition for the render callback passed to window_set_on_render. */
export const renderCallbackDef = {
  parameters: ["pointer", "i32", "i32", "f64"],
  result: "void",
} as const;

/** The FFI definition for the zero-argument event callbacks (resize, close, mouse, key). */
export const eventCallbackDef = {
  parameters: [],
  result: "void",
} as const;
