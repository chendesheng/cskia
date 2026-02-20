/**
 * binding.ts — Deno FFI bindings for libskiawindow.dylib.
 *
 * The dylib bundles both the NSWindow/Metal window management (window.m) and
 * the Skia C API (sk_capi.cpp + Skia static libs) into a single shared
 * library so Deno only needs one dlopen call.
 */

import { join, dirname, fromFileUrl } from "jsr:@std/path";

const libDir = join(dirname(fromFileUrl(import.meta.url)), ".build", "release");
const libPath = join(libDir, "libSkiaWindow.dylib");
const WINDOW_MOUSE_EVENT_STRUCT = {
  struct: ["u32", "i32", "f64", "f64"],
} as const satisfies Deno.NativeStructType;
const WINDOW_KEY_EVENT_STRUCT = {
  struct: ["u32", "u16", "u8", "u8", "i32", "u32"],
} as const satisfies Deno.NativeStructType;
const WINDOW_RESIZE_EVENT_STRUCT = {
  struct: ["i32", "i32"],
} as const satisfies Deno.NativeStructType;
type StructType = Deno.NativeStructType;
type HeaderNativeType = "i32";
type EventNativeType = HeaderNativeType | "u64" | "u32" | "f64" | "u16" | "u8" | StructType;

function primitiveSize(nativeType: HeaderNativeType | "u64" | "u32" | "f64" | "u16" | "u8"): number {
  switch (nativeType) {
    case "u8":
      return 1;
    case "u16":
      return 2;
    case "i32":
    case "u32":
      return 4;
    case "u64":
    case "f64":
      return 8;
  }
}

function typeInfo(nativeType: EventNativeType): { size: number; align: number } {
  if (typeof nativeType !== "object") {
    const size = primitiveSize(nativeType);
    return { size, align: size };
  }
  return structInfo(nativeType);
}

function structInfo(structType: StructType): { size: number; align: number } {
  let size = 0;
  let maxAlign = 1;
  for (const fieldType of structType.struct) {
    const { size: fieldSize, align } = typeInfo(fieldType as EventNativeType);
    size = Math.ceil(size / align) * align;
    size += fieldSize;
    maxAlign = Math.max(maxAlign, align);
  }
  return {
    size: Math.ceil(size / maxAlign) * maxAlign,
    align: maxAlign,
  };
}

function unionPayloadSize(...members: readonly StructType[]): number {
  return members.reduce((max, member) => Math.max(max, structInfo(member).size), 0);
}

const WINDOW_EVENT_PAYLOAD_SIZE = unionPayloadSize(
  WINDOW_MOUSE_EVENT_STRUCT,
  WINDOW_KEY_EVENT_STRUCT,
  WINDOW_RESIZE_EVENT_STRUCT,
);
// Deno doesn't support C unions directly; use the most aligned/large member to
// preserve ABI alignment/size for the payload region.
const WINDOW_EVENT_PAYLOAD_STRUCT = WINDOW_MOUSE_EVENT_STRUCT;
// Represent return-by-value as raw 32-byte aligned payload (u64[4]) to avoid
// nested-struct ABI mismatches when crossing FFI boundaries.
const WINDOW_EVENT_STRUCT = {
  struct: ["u64", "u64", "u64", "u64"],
} as const satisfies Deno.NativeStructType;

// ---------------------------------------------------------------------------
// FFI symbol definitions
// ---------------------------------------------------------------------------

export const lib = Deno.dlopen(libPath, {
  // --- Window API ---

  /** Create a window. Returns an opaque window_t* handle. */
  window_create: {
    parameters: ["i32", "i32", "buffer", "usize"],
    result: "pointer",
    nonblocking: false,
  },

  /** Show and activate the window without entering NSApp.run(). */
  window_show: {
    parameters: ["pointer"],
    result: "void",
    nonblocking: false,
  },

  /** Pump pending AppKit events once (non-blocking). */
  window_pump: {
    parameters: ["pointer"],
    result: "void",
    nonblocking: false,
  },

  /** Poll one queued event into caller-provided event buffer. */
  window_poll_event: {
    parameters: ["pointer", "buffer"],
    result: "bool",
    nonblocking: false,
  },

  /** Begin a frame and return sk_canvas_t* (or null if no drawable is available). */
  window_begin_frame: {
    parameters: ["pointer"],
    result: "pointer",
    nonblocking: false,
  },

  /** End the active frame (flush/present). */
  window_end_frame: {
    parameters: ["pointer"],
    result: "void",
    nonblocking: false,
  },

  /** Return the backing scale factor for HiDPI-aware layout. */
  window_get_scale: {
    parameters: ["pointer"],
    result: "f64",
    nonblocking: false,
  },

  /** Free the window_t struct. */
  window_destroy: {
    parameters: ["pointer"],
    result: "void",
    nonblocking: false,
  },

  // --- Window property setters ---

  window_set_title: {
    parameters: ["pointer", "buffer", "usize"],
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

  /** Copies UTF-8 title bytes into caller buffer and returns total UTF-8 byte length. */
  window_get_title: {
    parameters: ["pointer", "buffer", "usize"],
    result: "usize",
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
// Window events
// ---------------------------------------------------------------------------

const EVENT_TYPE_WINDOW_CLOSE = 1;
const EVENT_TYPE_WINDOW_RESIZE = 2;
const EVENT_TYPE_WINDOW_FRAME_READY = 3;
const EVENT_TYPE_MOUSE_DOWN = 4;
const EVENT_TYPE_MOUSE_UP = 5;
const EVENT_TYPE_MOUSE_MOVE = 6;
const EVENT_TYPE_KEY_DOWN = 7;
const EVENT_TYPE_KEY_UP = 8;

const MOD_CTRL = 1 << 0;
const MOD_SHIFT = 1 << 1;
const MOD_ALT = 1 << 2;
const MOD_META = 1 << 3;
type HeaderFieldName = "type" | "payload";
type HeaderField = { name: HeaderFieldName; type: EventNativeType };
const WINDOW_EVENT_HEADER_FIELDS: readonly HeaderField[] = [
  { name: "type", type: "u64" },
  { name: "payload", type: WINDOW_EVENT_PAYLOAD_STRUCT },
] as const;

function buildStructLayout<FieldName extends string>(
  fields: ReadonlyArray<{ name: FieldName; type: EventNativeType }>,
): { size: number; offsets: Readonly<Record<FieldName, number>> } {
  let size = 0;
  let maxAlign = 1;
  const offsets = {} as Record<FieldName, number>;
  for (const field of fields) {
    const { size: fieldSize, align } = typeInfo(field.type);
    size = Math.ceil(size / align) * align;
    offsets[field.name] = size;
    size += fieldSize;
    maxAlign = Math.max(maxAlign, align);
  }
  return { size: Math.ceil(size / maxAlign) * maxAlign, offsets };
}

const WINDOW_EVENT_LAYOUT = buildStructLayout(WINDOW_EVENT_HEADER_FIELDS);
const MOUSE_LAYOUT = buildStructLayout([
  { name: "modBits", type: "u32" },
  { name: "button", type: "i32" },
  { name: "x", type: "f64" },
  { name: "y", type: "f64" },
] as const);
const KEY_LAYOUT = buildStructLayout([
  { name: "modBits", type: "u32" },
  { name: "keyCode", type: "u16" },
  { name: "isRepeat", type: "u8" },
  { name: "reserved0", type: "u8" },
  { name: "specialKey", type: "i32" },
  { name: "key", type: "u32" },
] as const);
const RESIZE_LAYOUT = buildStructLayout([
  { name: "width", type: "i32" },
  { name: "height", type: "i32" },
] as const);

const eventBuffer = new Uint8Array(
  new ArrayBuffer(structInfo(WINDOW_EVENT_STRUCT).size),
);
const eventView = new DataView(eventBuffer.buffer);
const utf8Encoder = new TextEncoder();
const utf8Decoder = new TextDecoder();

export type Modifiers = {
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  metaKey: boolean;
};

export type EventType =
  | "windowClose"
  | "windowResize"
  | "windowFrameReady"
  | "mouseDown"
  | "mouseUp"
  | "mouseMove"
  | "keyDown"
  | "keyUp";

export enum SpecialKey {
  Text = 1,
  Dead = 2,
  Unidentified = 3,
  Enter = 10,
  Tab = 11,
  Backspace = 12,
  Escape = 13,
  CapsLock = 14,
  Shift = 15,
  Control = 16,
  Alt = 17,
  Meta = 18,
  ArrowLeft = 19,
  ArrowRight = 20,
  ArrowUp = 21,
  ArrowDown = 22,
  Home = 23,
  End = 24,
  PageUp = 25,
  PageDown = 26,
  Delete = 27,
  F1 = 28,
  F2 = 29,
  F3 = 30,
  F4 = 31,
  F5 = 32,
  F6 = 33,
  F7 = 34,
  F8 = 35,
  F9 = 36,
  F10 = 37,
  F11 = 38,
  F12 = 39,
}

type EventBase<T extends EventType> = {
  type: T;
};
export type WindowCloseEvent = EventBase<"windowClose">;
export type WindowFrameReadyEvent = EventBase<"windowFrameReady">;
export type WindowResizeEvent = EventBase<"windowResize"> & {
  width: number;
  height: number;
};
export type MouseEvent = EventBase<"mouseDown" | "mouseUp" | "mouseMove"> & {
  mods: Modifiers;
  x: number;
  y: number;
  button: number;
};
export type KeyEvent = EventBase<"keyDown" | "keyUp"> & {
  mods: Modifiers;
  keyCode: number;
  specialKey: SpecialKey;
  key: string;
  isRepeat: boolean;
};
export type Event =
  | WindowCloseEvent
  | WindowFrameReadyEvent
  | WindowResizeEvent
  | MouseEvent
  | KeyEvent;

function decodeModifiers(modBits: number): Modifiers {
  return {
    ctrlKey: (modBits & MOD_CTRL) !== 0,
    shiftKey: (modBits & MOD_SHIFT) !== 0,
    altKey: (modBits & MOD_ALT) !== 0,
    metaKey: (modBits & MOD_META) !== 0,
  };
}

function decodeCodePoint(codePoint: number): string {
  if (codePoint === 0) {
    return "";
  }
  try {
    return String.fromCodePoint(codePoint);
  } catch {
    return "";
  }
}

function keyFromSpecialKey(specialKey: SpecialKey, keyCodePoint: number): string {
  switch (specialKey) {
    case SpecialKey.Text:
      {
        const key = decodeCodePoint(keyCodePoint);
        return key.length > 0 ? key : "Unidentified";
      }
    case SpecialKey.Dead:
      return "Dead";
    case SpecialKey.Unidentified:
      return "Unidentified";
    case SpecialKey.Enter:
      return "Enter";
    case SpecialKey.Tab:
      return "Tab";
    case SpecialKey.Backspace:
      return "Backspace";
    case SpecialKey.Escape:
      return "Escape";
    case SpecialKey.CapsLock:
      return "CapsLock";
    case SpecialKey.Shift:
      return "Shift";
    case SpecialKey.Control:
      return "Control";
    case SpecialKey.Alt:
      return "Alt";
    case SpecialKey.Meta:
      return "Meta";
    case SpecialKey.ArrowLeft:
      return "ArrowLeft";
    case SpecialKey.ArrowRight:
      return "ArrowRight";
    case SpecialKey.ArrowUp:
      return "ArrowUp";
    case SpecialKey.ArrowDown:
      return "ArrowDown";
    case SpecialKey.Home:
      return "Home";
    case SpecialKey.End:
      return "End";
    case SpecialKey.PageUp:
      return "PageUp";
    case SpecialKey.PageDown:
      return "PageDown";
    case SpecialKey.Delete:
      return "Delete";
    case SpecialKey.F1:
      return "F1";
    case SpecialKey.F2:
      return "F2";
    case SpecialKey.F3:
      return "F3";
    case SpecialKey.F4:
      return "F4";
    case SpecialKey.F5:
      return "F5";
    case SpecialKey.F6:
      return "F6";
    case SpecialKey.F7:
      return "F7";
    case SpecialKey.F8:
      return "F8";
    case SpecialKey.F9:
      return "F9";
    case SpecialKey.F10:
      return "F10";
    case SpecialKey.F11:
      return "F11";
    case SpecialKey.F12:
      return "F12";
    default:
      return "Unidentified";
  }
}

export function pollEvent(win: Deno.PointerValue): Event | null {
  const hasEvent = lib.symbols.window_poll_event(win, eventBuffer);
  if (!hasEvent) {
    return null;
  }
  const { offsets } = WINDOW_EVENT_LAYOUT;
  const type = Number(eventView.getBigUint64(offsets.type, true));

  switch (type) {
    case EVENT_TYPE_WINDOW_CLOSE:
      return { type: "windowClose" };
    case EVENT_TYPE_WINDOW_RESIZE:
      return {
        type: "windowResize",
        width: eventView.getInt32(offsets.payload + RESIZE_LAYOUT.offsets.width, true),
        height: eventView.getInt32(offsets.payload + RESIZE_LAYOUT.offsets.height, true),
      };
    case EVENT_TYPE_WINDOW_FRAME_READY:
      return { type: "windowFrameReady" };
    case EVENT_TYPE_MOUSE_DOWN:
      return {
        type: "mouseDown",
        mods: decodeModifiers(
          eventView.getUint32(offsets.payload + MOUSE_LAYOUT.offsets.modBits, true),
        ),
        x: eventView.getFloat64(offsets.payload + MOUSE_LAYOUT.offsets.x, true),
        y: eventView.getFloat64(offsets.payload + MOUSE_LAYOUT.offsets.y, true),
        button: eventView.getInt32(offsets.payload + MOUSE_LAYOUT.offsets.button, true),
      };
    case EVENT_TYPE_MOUSE_UP:
      return {
        type: "mouseUp",
        mods: decodeModifiers(
          eventView.getUint32(offsets.payload + MOUSE_LAYOUT.offsets.modBits, true),
        ),
        x: eventView.getFloat64(offsets.payload + MOUSE_LAYOUT.offsets.x, true),
        y: eventView.getFloat64(offsets.payload + MOUSE_LAYOUT.offsets.y, true),
        button: eventView.getInt32(offsets.payload + MOUSE_LAYOUT.offsets.button, true),
      };
    case EVENT_TYPE_MOUSE_MOVE:
      return {
        type: "mouseMove",
        mods: decodeModifiers(
          eventView.getUint32(offsets.payload + MOUSE_LAYOUT.offsets.modBits, true),
        ),
        x: eventView.getFloat64(offsets.payload + MOUSE_LAYOUT.offsets.x, true),
        y: eventView.getFloat64(offsets.payload + MOUSE_LAYOUT.offsets.y, true),
        button: eventView.getInt32(offsets.payload + MOUSE_LAYOUT.offsets.button, true),
      };
    case EVENT_TYPE_KEY_DOWN: {
      const specialKey = eventView.getInt32(
        offsets.payload + KEY_LAYOUT.offsets.specialKey,
        true,
      ) as SpecialKey;
      const keyCodePoint = eventView.getUint32(
        offsets.payload + KEY_LAYOUT.offsets.key,
        true,
      );
      return {
        type: "keyDown",
        mods: decodeModifiers(
          eventView.getUint32(offsets.payload + KEY_LAYOUT.offsets.modBits, true),
        ),
        keyCode: eventView.getUint16(offsets.payload + KEY_LAYOUT.offsets.keyCode, true),
        specialKey,
        key: keyFromSpecialKey(specialKey, keyCodePoint),
        isRepeat: eventView.getUint8(offsets.payload + KEY_LAYOUT.offsets.isRepeat) !== 0,
      };
    }
    case EVENT_TYPE_KEY_UP: {
      const specialKey = eventView.getInt32(
        offsets.payload + KEY_LAYOUT.offsets.specialKey,
        true,
      ) as SpecialKey;
      const keyCodePoint = eventView.getUint32(
        offsets.payload + KEY_LAYOUT.offsets.key,
        true,
      );
      return {
        type: "keyUp",
        mods: decodeModifiers(
          eventView.getUint32(offsets.payload + KEY_LAYOUT.offsets.modBits, true),
        ),
        keyCode: eventView.getUint16(offsets.payload + KEY_LAYOUT.offsets.keyCode, true),
        specialKey,
        key: keyFromSpecialKey(specialKey, keyCodePoint),
        isRepeat: eventView.getUint8(offsets.payload + KEY_LAYOUT.offsets.isRepeat) !== 0,
      };
    }
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function asFfiBuffer(bytes: Uint8Array): Uint8Array<ArrayBuffer> {
  if (bytes.buffer instanceof ArrayBuffer) {
    return new Uint8Array(
      bytes.buffer,
      bytes.byteOffset,
      bytes.byteLength,
    ) as Uint8Array<ArrayBuffer>;
  }
  const out = new Uint8Array(new ArrayBuffer(bytes.byteLength));
  out.set(bytes);
  return out;
}

/** Encode a JS string as UTF-8 bytes in a plain ArrayBuffer for FFI buffer params. */
function encodeUtf8(s: string): Uint8Array<ArrayBuffer> {
  const encoded = utf8Encoder.encode(s);
  return asFfiBuffer(encoded);
}

/** Decode UTF-8 bytes. */
export function decodeUtf8(bytes: Uint8Array): string {
  return utf8Decoder.decode(bytes);
}

/** Read a window title using the length-based UTF-8 getter. */
export function getWindowTitle(win: Deno.PointerValue): string {
  const initial = new Uint8Array(256);
  const totalLen = Number(lib.symbols.window_get_title(win, initial, 256n));
  if (totalLen <= initial.length) {
    return decodeUtf8(initial.subarray(0, totalLen));
  }
  const exact = new Uint8Array(totalLen);
  lib.symbols.window_get_title(win, exact, BigInt(exact.length));
  return decodeUtf8(exact);
}

/** String-friendly wrapper around window_create. */
export function createWindow(
  width: number,
  height: number,
  title: string,
): Deno.PointerValue {
  const titleBytes = encodeUtf8(title);
  return lib.symbols.window_create(
    width,
    height,
    titleBytes,
    BigInt(titleBytes.length),
  );
}

/** String-friendly wrapper around window_set_title. */
export function setWindowTitle(win: Deno.PointerValue, title: string): void {
  const titleBytes = encodeUtf8(title);
  lib.symbols.window_set_title(win, titleBytes, BigInt(titleBytes.length));
}

/** Build an sk_string_t from a JS string. Caller must delete it with sk_string_delete. */
export function skStringNew(s: string): Deno.PointerValue {
  const bytes = encodeUtf8(s);
  return lib.symbols.sk_string_new(bytes, BigInt(bytes.length));
}

/** Add a JS string to paragraph builder text. */
export function paragraphBuilderAddText(
  builder: Deno.PointerValue,
  text: string,
): void {
  paragraphBuilderAddUtf8(builder, encodeUtf8(text));
}

/** Add UTF-8 bytes to paragraph builder text without string conversion. */
export function paragraphBuilderAddUtf8(
  builder: Deno.PointerValue,
  utf8: Uint8Array,
): void {
  const bytes = asFfiBuffer(utf8);
  lib.symbols.sk_paragraph_builder_add_text(
    builder,
    bytes,
    BigInt(bytes.length),
  );
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
