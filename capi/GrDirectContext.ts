import { createGrContext, skLib } from "./binding.ts";

const sk = skLib.symbols;

export class GrDirectContext {
  #ptr: Deno.PointerValue;

  private constructor(ptr: Deno.PointerValue) {
    this.#ptr = ptr;
  }

  static MakeMetal(
    device: Deno.PointerValue,
    queue: Deno.PointerValue,
  ): GrDirectContext {
    const ptr = createGrContext(device, queue);
    return new GrDirectContext(ptr);
  }

  get _ptr(): Deno.PointerValue {
    return this.#ptr;
  }

  flush(syncCpu = false): void {
    sk.gr_direct_context_flush_and_submit(this.#ptr, syncCpu);
  }

  releaseResourcesAndAbandonContext(): void {
    sk.gr_direct_context_release_resources_and_abandon_context(this.#ptr);
  }

  delete(): void {
    sk.gr_direct_context_delete(this.#ptr);
  }
}
