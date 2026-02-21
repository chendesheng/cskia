import { skLib } from "./binding.ts";

const sk = skLib.symbols;

export interface TextBox {
  rect: Float32Array;
  direction: number;
}

export interface PositionWithAffinity {
  position: number;
  affinity: number;
}

export class Paragraph {
  #ptr: Deno.PointerValue;

  /** @internal Use ParagraphBuilder.build() to create instances. */
  constructor(ptr: Deno.PointerValue) {
    this.#ptr = ptr;
  }

  get _ptr(): Deno.PointerValue {
    return this.#ptr;
  }

  layout(width: number): void {
    sk.sk_paragraph_layout(this.#ptr, width);
  }

  getHeight(): number {
    return sk.sk_paragraph_get_height(this.#ptr) as number;
  }

  /**
   * Get bounding rectangles for a text range.
   * Each box: { rect: Float32Array[left,top,right,bottom], direction: number }
   */
  getRectsForRange(
    start: number,
    end: number,
    rectHeightStyle: number,
    rectWidthStyle: number,
  ): TextBox[] {
    const countBuf = new Int32Array(1);
    const countBytes = new Uint8Array(
      countBuf.buffer,
    ) as Uint8Array<ArrayBuffer>;

    const dataPtr = sk.sk_paragraph_get_rects_for_range2(
      this.#ptr,
      start,
      end,
      rectHeightStyle,
      rectWidthStyle,
      countBytes,
    );

    const count = countBuf[0];
    if (count === 0 || !dataPtr) return [];

    // sk_text_box_t = { sk_rect_t rect (16 bytes), int32 direction (4 bytes) } = 20 bytes
    const BOX_SIZE = 20;
    const view = new Deno.UnsafePointerView(dataPtr);
    const results: TextBox[] = [];
    for (let i = 0; i < count; i++) {
      const offset = i * BOX_SIZE;
      const rect = new Float32Array(4);
      rect[0] = view.getFloat32(offset);
      rect[1] = view.getFloat32(offset + 4);
      rect[2] = view.getFloat32(offset + 8);
      rect[3] = view.getFloat32(offset + 12);
      const direction = view.getInt32(offset + 16);
      results.push({ rect, direction });
    }

    sk.sk_text_box_data_free(dataPtr);
    return results;
  }

  getGlyphPositionAtCoordinate(
    dx: number,
    dy: number,
  ): PositionWithAffinity {
    const affinityBuf = new Int32Array(1);
    const affinityBytes = new Uint8Array(
      affinityBuf.buffer,
    ) as Uint8Array<ArrayBuffer>;

    const position = sk.sk_paragraph_get_glyph_position_at_coordinate2(
      this.#ptr,
      dx,
      dy,
      affinityBytes,
    ) as number;

    return { position, affinity: affinityBuf[0] };
  }

  delete(): void {
    // Paragraph lifecycle is managed by the builder in the C API;
    // no separate delete symbol is currently exposed.
  }
}
