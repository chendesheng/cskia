/*
 * skia_metal_view.swift — Metal-backed NSView with Skia rendering.
 */

import Cocoa
import Metal
import QuartzCore
import CSkia

// MARK: - SkiaMetalView

final class SkiaMetalView: NSView {
    let metalDevice:   MTLDevice
    let commandQueue:  MTLCommandQueue
    let metalLayer:    CAMetalLayer
    let grContext:     OpaquePointer    // gr_direct_context_t *

    var renderCallback: RenderFn?

    // Back-reference to WindowState for firing event callbacks.
    // Set immediately after WindowState is created; safe to use unowned.
    unowned var state: WindowState!

    private var link: CADisplayLink?

    override init(frame: NSRect) {
        guard let dev = MTLCreateSystemDefaultDevice() else {
            fatalError("Metal is not supported on this device")
        }
        guard let queue = dev.makeCommandQueue() else {
            fatalError("Failed to create Metal command queue")
        }

        let layer = CAMetalLayer()
        layer.device        = dev
        layer.pixelFormat   = .bgra8Unorm
        layer.framebufferOnly = false
        layer.isOpaque      = true

        var backendCtx = gr_mtl_backendcontext_t()
        backendCtx.fDevice = UnsafeRawPointer(Unmanaged.passUnretained(dev as AnyObject).toOpaque())
        backendCtx.fQueue  = UnsafeRawPointer(Unmanaged.passUnretained(queue as AnyObject).toOpaque())
        guard let grCtx = gr_direct_context_make_metal(&backendCtx) else {
            fatalError("Failed to create Skia/Metal GrDirectContext")
        }

        metalDevice  = dev
        commandQueue = queue
        metalLayer   = layer
        grContext    = grCtx

        super.init(frame: frame)

        wantsLayer  = true
        self.layer  = metalLayer
    }

    required init?(coder: NSCoder) { nil }

    deinit {
        link?.invalidate()
        gr_direct_context_release_resources_and_abandon_context(grContext)
        gr_direct_context_delete(grContext)
    }

    // MARK: Display link

    func startDisplayLink() {
        // NSView.displayLink(target:selector:) — macOS 14+
        // Automatically pauses when the view is hidden/off-screen and
        // adjusts to the correct refresh rate when the window changes display.
        let dl = self.displayLink(target: self, selector: #selector(displayLinkTick))
        dl.add(to: .main, forMode: .common)
        link = dl
    }

    @objc private func displayLinkTick() {
        render()
    }

    func stopDisplayLink() {
        link?.invalidate()
        link = nil
    }

    // MARK: First responder (required for key events)

    override var acceptsFirstResponder: Bool { true }

    // MARK: Tracking area (required for mouseMoved events)

    override func updateTrackingAreas() {
        super.updateTrackingAreas()
        trackingAreas.forEach { removeTrackingArea($0) }
        addTrackingArea(NSTrackingArea(
            rect: bounds,
            options: [.mouseMoved, .activeInKeyWindow, .inVisibleRect],
            owner: self,
            userInfo: nil
        ))
    }

    // MARK: Drawable size

    private func updateDrawableSize() {
        let scale = window?.backingScaleFactor ?? 1.0
        let sz    = bounds.size
        metalLayer.contentsScale = scale
        metalLayer.drawableSize  = CGSize(width: sz.width * scale, height: sz.height * scale)
    }

    override func setFrameSize(_ newSize: NSSize) {
        super.setFrameSize(newSize)
        updateDrawableSize()
        if window != nil { state?.onResize?() }
    }

    override func viewDidMoveToWindow() {
        super.viewDidMoveToWindow()
        if window != nil { updateDrawableSize() }
    }

    // MARK: Mouse events

    override func mouseDown(with event: NSEvent)  { state?.onMouseDown?() }
    override func mouseUp(with event: NSEvent)    { state?.onMouseUp?() }
    override func mouseMoved(with event: NSEvent) { state?.onMouseMove?() }

    // MARK: Key events

    override func keyDown(with event: NSEvent) { state?.onKeyDown?() }
    override func keyUp(with event: NSEvent)   { state?.onKeyUp?() }

    // MARK: Rendering

    func render() {
        let drawableSize = metalLayer.drawableSize
        let w = Int32(drawableSize.width)
        let h = Int32(drawableSize.height)
        guard w > 0, h > 0 else { return }

        guard let drawable = metalLayer.nextDrawable() else { return }

        var texInfo = gr_mtl_textureinfo_t()
        texInfo.fTexture = UnsafeRawPointer(Unmanaged.passUnretained(drawable.texture as AnyObject).toOpaque())

        guard let target = gr_backendrendertarget_new_metal(w, h, &texInfo) else { return }

        guard let surface = sk_surface_new_backend_render_target(
            grContext, target,
            GR_SURFACE_ORIGIN_TOP_LEFT,
            SK_COLOR_TYPE_BGRA_8888,
            nil, nil
        ) else {
            gr_backendrendertarget_delete(target)
            NSLog("Failed to create Skia surface")
            return
        }

        if let cb = renderCallback {
            let scale = window?.backingScaleFactor ?? 1.0
            cb(sk_surface_get_canvas(surface), w, h, scale)
        }

        gr_direct_context_flush_and_submit(grContext, false)

        if let cmd = commandQueue.makeCommandBuffer() {
            cmd.present(drawable)
            cmd.commit()
        }

        sk_surface_unref(surface)
        gr_backendrendertarget_delete(target)
    }
}
