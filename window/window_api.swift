/*
 * window_api.swift — C API exports (@_cdecl) for the window module.
 *
 * Exposes:
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
 */

import Cocoa

// MARK: - Lifecycle

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
