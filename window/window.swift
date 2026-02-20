/*
 * window.swift — Core types and delegates for NSWindow + Metal + Skia.
 *
 * See window_api.swift for the C API (@_cdecl exports).
 * See skia_metal_view.swift for the SkiaMetalView class.
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

final class WindowState {
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

// MARK: - WindowDelegate

final class WindowDelegate: NSObject, NSApplicationDelegate, NSWindowDelegate {
    weak var state: WindowState?

    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool { true }

    func windowWillClose(_ notification: Notification) {
        state?.skiaView.stopDisplayLink()
        state?.onClose?()
        NSApp.terminate(nil)
    }
}

// MARK: - Helpers

func stateFrom(_ ptr: UnsafeMutableRawPointer) -> WindowState {
    Unmanaged<WindowState>.fromOpaque(ptr).takeUnretainedValue()
}
