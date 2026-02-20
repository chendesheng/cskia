/*
 * window.swift — NSWindow + Metal + Skia surface management.
 *
 * Exposes a C API via @_cdecl:
 *   window_create / window_set_on_render / window_run / window_destroy
 *   window_set_title / window_set_width / window_set_height
 *   window_set_close_button_visible / window_set_miniaturize_button_visible / window_set_zoom_button_visible
 *   window_set_resizable
 *   window_get_title / window_get_width / window_get_height
 *   window_get_close_button_visible / window_get_miniaturize_button_visible / window_get_zoom_button_visible
 *   window_get_resizable
 *   window_set_on_resize / window_set_on_close
 *   window_set_on_mouse_down / window_set_on_mouse_up / window_set_on_mouse_move
 *   window_set_on_key_down / window_set_on_key_up
 *
 * window_create constructs the NSWindow and SkiaMetalView immediately.
 * window_run starts the NSApplication run loop (blocks until closed).
 */

import Cocoa
import Metal
import QuartzCore
import CSkia

// C-compatible render callback: (sk_canvas_t*, int width, int height, double scale) -> void
public typealias RenderFn = @convention(c) (OpaquePointer?, Int32, Int32, Double) -> Void

// C-compatible zero-argument event callback: () -> void
public typealias EventFn = @convention(c) () -> Void

// MARK: - WindowState

private final class WindowState {
    let window:   NSWindow
    let skiaView: SkiaMetalView
    let delegate: WindowDelegate

    var renderCallback: RenderFn?

    // Event callbacks
    var onResize:    EventFn?
    var onClose:     EventFn?
    var onMouseDown: EventFn?
    var onMouseUp:   EventFn?
    var onMouseMove: EventFn?
    var onKeyDown:   EventFn?
    var onKeyUp:     EventFn?

    init(window: NSWindow, skiaView: SkiaMetalView, delegate: WindowDelegate) {
        self.window   = window
        self.skiaView = skiaView
        self.delegate = delegate
    }
}

// MARK: - SkiaMetalView

private final class SkiaMetalView: NSView {
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

// MARK: - Delegates

private final class WindowDelegate: NSObject, NSApplicationDelegate, NSWindowDelegate {
    weak var state: WindowState?

    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool { true }

    func windowWillClose(_ notification: Notification) {
        state?.skiaView.stopDisplayLink()
        state?.onClose?()
        NSApp.terminate(nil)
    }
}

// MARK: - Helpers

private func stateFrom(_ ptr: UnsafeMutableRawPointer) -> WindowState {
    Unmanaged<WindowState>.fromOpaque(ptr).takeUnretainedValue()
}

// MARK: - C API exports

@_cdecl("window_create")
public func windowCreate(
    _ width:  Int32,
    _ height: Int32,
    _ title:  UnsafePointer<CChar>?
) -> UnsafeMutableRawPointer {
    let titleStr = title.map { String(cString: $0) } ?? "Untitled"

    let app = NSApplication.shared
    app.setActivationPolicy(.regular)

    let frame = NSRect(x: 0, y: 0, width: CGFloat(width), height: CGFloat(height))

    let nsWin = NSWindow(
        contentRect: frame,
        styleMask:   [.titled, .closable, .resizable, .miniaturizable],
        backing:     .buffered,
        defer:       false
    )
    nsWin.title = titleStr
    nsWin.center()

    let view = SkiaMetalView(frame: frame)
    nsWin.contentView = view

    let delegate = WindowDelegate()
    nsWin.delegate = delegate
    app.delegate   = delegate

    let state = WindowState(window: nsWin, skiaView: view, delegate: delegate)
    view.state    = state
    delegate.state = state

    return Unmanaged.passRetained(state).toOpaque()
}

@_cdecl("window_set_on_render")
public func windowSetOnRender(
    _ win:      UnsafeMutableRawPointer?,
    _ callback: RenderFn?
) {
    guard let win else { return }
    let s = stateFrom(win)
    s.renderCallback = callback
    s.skiaView.renderCallback = callback
}

@_cdecl("window_run")
public func windowRun(_ win: UnsafeMutableRawPointer?) {
    guard let win else { return }
    let s = stateFrom(win)
    s.window.makeKeyAndOrderFront(nil)
    s.window.makeFirstResponder(s.skiaView)  // needed for key events
    s.skiaView.startDisplayLink()            // drive rendering at screen refresh rate
    NSApp.activate(ignoringOtherApps: true)
    NSApp.run()
}

@_cdecl("window_destroy")
public func windowDestroy(_ win: UnsafeMutableRawPointer?) {
    guard let win else { return }
    Unmanaged<WindowState>.fromOpaque(win).release()
}

// MARK: - Setters

@_cdecl("window_set_title")
public func windowSetTitle(_ win: UnsafeMutableRawPointer?, _ title: UnsafePointer<CChar>?) {
    guard let win, let title else { return }
    stateFrom(win).window.title = String(cString: title)
}

@_cdecl("window_set_width")
public func windowSetWidth(_ win: UnsafeMutableRawPointer?, _ width: Int32) {
    guard let win else { return }
    let w = stateFrom(win).window
    var frame = w.frame
    frame.size.width = CGFloat(width)
    w.setFrame(frame, display: true)
}

@_cdecl("window_set_height")
public func windowSetHeight(_ win: UnsafeMutableRawPointer?, _ height: Int32) {
    guard let win else { return }
    let w = stateFrom(win).window
    var frame = w.frame
    frame.size.height = CGFloat(height)
    w.setFrame(frame, display: true)
}

@_cdecl("window_set_close_button_visible")
public func windowSetCloseButtonVisible(_ win: UnsafeMutableRawPointer?, _ visible: Bool) {
    guard let win else { return }
    stateFrom(win).window.standardWindowButton(.closeButton)?.isHidden = !visible
}

@_cdecl("window_set_miniaturize_button_visible")
public func windowSetMiniaturizeButtonVisible(_ win: UnsafeMutableRawPointer?, _ visible: Bool) {
    guard let win else { return }
    stateFrom(win).window.standardWindowButton(.miniaturizeButton)?.isHidden = !visible
}

@_cdecl("window_set_zoom_button_visible")
public func windowSetZoomButtonVisible(_ win: UnsafeMutableRawPointer?, _ visible: Bool) {
    guard let win else { return }
    stateFrom(win).window.standardWindowButton(.zoomButton)?.isHidden = !visible
}

@_cdecl("window_set_resizable")
public func windowSetResizable(_ win: UnsafeMutableRawPointer?, _ resizable: Bool) {
    guard let win else { return }
    let w = stateFrom(win).window
    if resizable {
        w.styleMask.insert(.resizable)
    } else {
        w.styleMask.remove(.resizable)
    }
}

// MARK: - Getters

@_cdecl("window_get_title")
public func windowGetTitle(_ win: UnsafeMutableRawPointer?, _ buf: UnsafeMutablePointer<CChar>?, _ bufLen: Int32) {
    guard let win, let buf else { return }
    _ = stateFrom(win).window.title.withCString { ptr in
        strncpy(buf, ptr, Int(bufLen))
    }
}

@_cdecl("window_get_width")
public func windowGetWidth(_ win: UnsafeMutableRawPointer?) -> Int32 {
    guard let win else { return 0 }
    return Int32(stateFrom(win).window.frame.size.width)
}

@_cdecl("window_get_height")
public func windowGetHeight(_ win: UnsafeMutableRawPointer?) -> Int32 {
    guard let win else { return 0 }
    return Int32(stateFrom(win).window.frame.size.height)
}

@_cdecl("window_get_close_button_visible")
public func windowGetCloseButtonVisible(_ win: UnsafeMutableRawPointer?) -> Bool {
    guard let win else { return false }
    return !(stateFrom(win).window.standardWindowButton(.closeButton)?.isHidden ?? true)
}

@_cdecl("window_get_miniaturize_button_visible")
public func windowGetMiniaturizeButtonVisible(_ win: UnsafeMutableRawPointer?) -> Bool {
    guard let win else { return false }
    return !(stateFrom(win).window.standardWindowButton(.miniaturizeButton)?.isHidden ?? true)
}

@_cdecl("window_get_zoom_button_visible")
public func windowGetZoomButtonVisible(_ win: UnsafeMutableRawPointer?) -> Bool {
    guard let win else { return false }
    return !(stateFrom(win).window.standardWindowButton(.zoomButton)?.isHidden ?? true)
}

@_cdecl("window_get_resizable")
public func windowGetResizable(_ win: UnsafeMutableRawPointer?) -> Bool {
    guard let win else { return false }
    return stateFrom(win).window.styleMask.contains(.resizable)
}

// MARK: - Event callback setters

@_cdecl("window_set_on_resize")
public func windowSetOnResize(_ win: UnsafeMutableRawPointer?, _ cb: EventFn?) {
    guard let win else { return }
    stateFrom(win).onResize = cb
}

@_cdecl("window_set_on_close")
public func windowSetOnClose(_ win: UnsafeMutableRawPointer?, _ cb: EventFn?) {
    guard let win else { return }
    stateFrom(win).onClose = cb
}

@_cdecl("window_set_on_mouse_down")
public func windowSetOnMouseDown(_ win: UnsafeMutableRawPointer?, _ cb: EventFn?) {
    guard let win else { return }
    stateFrom(win).onMouseDown = cb
}

@_cdecl("window_set_on_mouse_up")
public func windowSetOnMouseUp(_ win: UnsafeMutableRawPointer?, _ cb: EventFn?) {
    guard let win else { return }
    stateFrom(win).onMouseUp = cb
}

@_cdecl("window_set_on_mouse_move")
public func windowSetOnMouseMove(_ win: UnsafeMutableRawPointer?, _ cb: EventFn?) {
    guard let win else { return }
    stateFrom(win).onMouseMove = cb
}

@_cdecl("window_set_on_key_down")
public func windowSetOnKeyDown(_ win: UnsafeMutableRawPointer?, _ cb: EventFn?) {
    guard let win else { return }
    stateFrom(win).onKeyDown = cb
}

@_cdecl("window_set_on_key_up")
public func windowSetOnKeyUp(_ win: UnsafeMutableRawPointer?, _ cb: EventFn?) {
    guard let win else { return }
    stateFrom(win).onKeyUp = cb
}
