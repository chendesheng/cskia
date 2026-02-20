/*
 * window_api.swift — C API exports (@_cdecl) for the window module.
 *
 * Exposes:
 *   window_create / window_show / window_pump / window_destroy
 *   window_poll_event / window_begin_frame / window_end_frame / window_get_scale
 *   window_set_title / window_set_width / window_set_height
 *   window_set_close_button_visible / window_set_miniaturize_button_visible / window_set_zoom_button_visible
 *   window_set_resizable
 *   window_get_title / window_get_width / window_get_height
 *   window_get_close_button_visible / window_get_miniaturize_button_visible / window_get_zoom_button_visible
 *   window_get_resizable
 */

import Cocoa
import Carbon.HIToolbox

// MARK: - Lifecycle

private var appDidFinishLaunching = false
private let MOD_CTRL: UInt32  = 1 << 0
private let MOD_SHIFT: UInt32 = 1 << 1
private let MOD_ALT: UInt32   = 1 << 2
private let MOD_META: UInt32  = 1 << 3
private let KEY_KIND_NONE: Int32 = 0
private let KEY_KIND_TEXT: Int32 = 1
private let KEY_KIND_DEAD: Int32 = 2
private let KEY_KIND_UNIDENTIFIED: Int32 = 3
private let KEY_KIND_ENTER: Int32 = 10
private let KEY_KIND_TAB: Int32 = 11
private let KEY_KIND_BACKSPACE: Int32 = 12
private let KEY_KIND_ESCAPE: Int32 = 13
private let KEY_KIND_CAPS_LOCK: Int32 = 14
private let KEY_KIND_SHIFT: Int32 = 15
private let KEY_KIND_CONTROL: Int32 = 16
private let KEY_KIND_ALT: Int32 = 17
private let KEY_KIND_META: Int32 = 18
private let KEY_KIND_ARROW_LEFT: Int32 = 19
private let KEY_KIND_ARROW_RIGHT: Int32 = 20
private let KEY_KIND_ARROW_UP: Int32 = 21
private let KEY_KIND_ARROW_DOWN: Int32 = 22
private let KEY_KIND_HOME: Int32 = 23
private let KEY_KIND_END: Int32 = 24
private let KEY_KIND_PAGE_UP: Int32 = 25
private let KEY_KIND_PAGE_DOWN: Int32 = 26
private let KEY_KIND_DELETE: Int32 = 27
private let KEY_KIND_F1: Int32 = 28
private let KEY_KIND_F2: Int32 = 29
private let KEY_KIND_F3: Int32 = 30
private let KEY_KIND_F4: Int32 = 31
private let KEY_KIND_F5: Int32 = 32
private let KEY_KIND_F6: Int32 = 33
private let KEY_KIND_F7: Int32 = 34
private let KEY_KIND_F8: Int32 = 35
private let KEY_KIND_F9: Int32 = 36
private let KEY_KIND_F10: Int32 = 37
private let KEY_KIND_F11: Int32 = 38
private let KEY_KIND_F12: Int32 = 39
private let KEY_VALUE_MAX_BYTES = 64

private struct EventPayload {
    let type: Int32
    let modBits: UInt32
    let x: Double
    let y: Double
    let button: Int32
    let keyCode: UInt16
    let isRepeat: UInt8
    let width: Int32
    let height: Int32
    let specialKey: Int32
    let key: String
}

private func modifierBits(from flags: NSEvent.ModifierFlags) -> UInt32 {
    var bits: UInt32 = 0
    if flags.contains(.control) { bits |= MOD_CTRL }
    if flags.contains(.shift) { bits |= MOD_SHIFT }
    if flags.contains(.option) { bits |= MOD_ALT }
    if flags.contains(.command) { bits |= MOD_META }
    return bits
}

private func writeEvent(_ outEvent: UnsafeMutableRawPointer, payload: EventPayload) {
    outEvent.storeBytes(of: payload.type, toByteOffset: 0, as: Int32.self)
    outEvent.storeBytes(of: payload.modBits, toByteOffset: 4, as: UInt32.self)
    outEvent.storeBytes(of: payload.x, toByteOffset: 8, as: Double.self)
    outEvent.storeBytes(of: payload.y, toByteOffset: 16, as: Double.self)
    outEvent.storeBytes(of: payload.button, toByteOffset: 24, as: Int32.self)
    outEvent.storeBytes(of: payload.keyCode, toByteOffset: 28, as: UInt16.self)
    outEvent.storeBytes(of: payload.isRepeat, toByteOffset: 30, as: UInt8.self)
    outEvent.storeBytes(of: UInt8(0), toByteOffset: 31, as: UInt8.self)
    outEvent.storeBytes(of: payload.width, toByteOffset: 32, as: Int32.self)
    outEvent.storeBytes(of: payload.height, toByteOffset: 36, as: Int32.self)
    outEvent.storeBytes(of: payload.specialKey, toByteOffset: 40, as: Int32.self)
    for i in 0..<KEY_VALUE_MAX_BYTES {
        outEvent.storeBytes(of: UInt8(0), toByteOffset: 44 + i, as: UInt8.self)
    }
    let keyBytes = Array(payload.key.utf8.prefix(KEY_VALUE_MAX_BYTES - 1))
    for (i, b) in keyBytes.enumerated() {
        outEvent.storeBytes(of: b, toByteOffset: 44 + i, as: UInt8.self)
    }
}

private func isDeadKeyString(_ value: String) -> Bool {
    guard !value.isEmpty else { return false }
    return value.unicodeScalars.allSatisfy { scalar in
        let category = scalar.properties.generalCategory
        return category == .nonspacingMark || category == .spacingMark || category == .enclosingMark
    }
}

private func specialKeyKind(for keyCode: UInt16) -> Int32? {
    switch Int(keyCode) {
    case kVK_Return, kVK_ANSI_KeypadEnter:
        return KEY_KIND_ENTER
    case kVK_Tab:
        return KEY_KIND_TAB
    case kVK_Delete:
        return KEY_KIND_BACKSPACE
    case kVK_Escape:
        return KEY_KIND_ESCAPE
    case kVK_CapsLock:
        return KEY_KIND_CAPS_LOCK
    case kVK_Shift, kVK_RightShift:
        return KEY_KIND_SHIFT
    case kVK_Control, kVK_RightControl:
        return KEY_KIND_CONTROL
    case kVK_Option, kVK_RightOption:
        return KEY_KIND_ALT
    case kVK_Command, kVK_RightCommand:
        return KEY_KIND_META
    case kVK_LeftArrow:
        return KEY_KIND_ARROW_LEFT
    case kVK_RightArrow:
        return KEY_KIND_ARROW_RIGHT
    case kVK_UpArrow:
        return KEY_KIND_ARROW_UP
    case kVK_DownArrow:
        return KEY_KIND_ARROW_DOWN
    case kVK_Home:
        return KEY_KIND_HOME
    case kVK_End:
        return KEY_KIND_END
    case kVK_PageUp:
        return KEY_KIND_PAGE_UP
    case kVK_PageDown:
        return KEY_KIND_PAGE_DOWN
    case kVK_ForwardDelete:
        return KEY_KIND_DELETE
    case kVK_F1:
        return KEY_KIND_F1
    case kVK_F2:
        return KEY_KIND_F2
    case kVK_F3:
        return KEY_KIND_F3
    case kVK_F4:
        return KEY_KIND_F4
    case kVK_F5:
        return KEY_KIND_F5
    case kVK_F6:
        return KEY_KIND_F6
    case kVK_F7:
        return KEY_KIND_F7
    case kVK_F8:
        return KEY_KIND_F8
    case kVK_F9:
        return KEY_KIND_F9
    case kVK_F10:
        return KEY_KIND_F10
    case kVK_F11:
        return KEY_KIND_F11
    case kVK_F12:
        return KEY_KIND_F12
    default:
        return nil
    }
}

private func keyboardEventData(_ event: NSEvent) -> (specialKey: Int32, key: String) {
    if let special = specialKeyKind(for: event.keyCode) {
        return (special, "")
    }
    if let chars = event.characters, !chars.isEmpty {
        if isDeadKeyString(chars) {
            return (KEY_KIND_DEAD, "")
        }
        return (KEY_KIND_TEXT, chars)
    }
    return (KEY_KIND_UNIDENTIFIED, "")
}

private func decodeUtf8(_ bytes: UnsafePointer<UInt8>?, _ length: Int) -> String? {
    guard let bytes, length >= 0 else { return nil }
    let buffer = UnsafeBufferPointer(start: bytes, count: length)
    return String(decoding: buffer, as: UTF8.self)
}

private func mousePayload(type: Int32, event: NSEvent, state: WindowState) -> EventPayload {
    let p = state.skiaView.convert(event.locationInWindow, from: nil)
    let flippedY = state.skiaView.bounds.height - p.y
    return EventPayload(
        type: type,
        modBits: modifierBits(from: event.modifierFlags),
        x: p.x,
        y: flippedY,
        button: Int32(event.buttonNumber),
        keyCode: 0,
        isRepeat: 0,
        width: 0,
        height: 0,
        specialKey: KEY_KIND_NONE,
        key: ""
    )
}

private func keyboardPayload(type: Int32, event: NSEvent) -> EventPayload {
    let eventKey = keyboardEventData(event)
    return EventPayload(
        type: type,
        modBits: modifierBits(from: event.modifierFlags),
        x: 0,
        y: 0,
        button: 0,
        keyCode: event.keyCode,
        isRepeat: event.isARepeat ? 1 : 0,
        width: 0,
        height: 0,
        specialKey: eventKey.specialKey,
        key: eventKey.key
    )
}

@_cdecl("window_create")
public func windowCreate(
    _ width:  Int32,
    _ height: Int32,
    _ title: UnsafePointer<UInt8>?,
    _ titleLen: Int
) -> UnsafeMutableRawPointer {
    let titleStr = decodeUtf8(title, titleLen) ?? "Untitled"

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

@_cdecl("window_show")
public func windowShow(_ win: UnsafeMutableRawPointer?) {
    guard let win else { return }
    let s = stateFrom(win)
    s.window.makeKeyAndOrderFront(nil)
    s.window.makeFirstResponder(s.skiaView)
    if !appDidFinishLaunching {
        NSApp.finishLaunching()
        appDidFinishLaunching = true
    }
    NSApp.activate(ignoringOtherApps: true)
    s.skiaView.startFrameReadyDisplayLink()
}

@_cdecl("window_pump")
public func windowPump(_ win: UnsafeMutableRawPointer?) {
    guard win != nil else { return }
    autoreleasepool {
        NSApp.updateWindows()
        _ = RunLoop.main.run(mode: .default, before: Date())
    }
}

@_cdecl("window_poll_event")
public func windowPollEvent(_ win: UnsafeMutableRawPointer?, _ outEvent: UnsafeMutableRawPointer?) -> Bool {
    guard let win, let outEvent else { return false }
    let s = stateFrom(win)

    let pending = s.pollPendingEvent()
    if pending != EVENT_TYPE_NONE {
        let payload: EventPayload
        switch pending {
        case EVENT_TYPE_WINDOW_RESIZE:
            payload = EventPayload(
                type: EVENT_TYPE_WINDOW_RESIZE,
                modBits: 0,
                x: 0,
                y: 0,
                button: 0,
                keyCode: 0,
                isRepeat: 0,
                width: s.skiaView.drawableWidth,
                height: s.skiaView.drawableHeight,
                specialKey: KEY_KIND_NONE,
                key: ""
            )
        case EVENT_TYPE_WINDOW_CLOSE:
            payload = EventPayload(
                type: EVENT_TYPE_WINDOW_CLOSE,
                modBits: 0,
                x: 0,
                y: 0,
                button: 0,
                keyCode: 0,
                isRepeat: 0,
                width: 0,
                height: 0,
                specialKey: KEY_KIND_NONE,
                key: ""
            )
        case EVENT_TYPE_WINDOW_FRAME_READY:
            payload = EventPayload(
                type: EVENT_TYPE_WINDOW_FRAME_READY,
                modBits: 0,
                x: 0,
                y: 0,
                button: 0,
                keyCode: 0,
                isRepeat: 0,
                width: 0,
                height: 0,
                specialKey: KEY_KIND_NONE,
                key: ""
            )
        default:
            return false
        }
        writeEvent(outEvent, payload: payload)
        return true
    }

    guard let event = NSApp.nextEvent(
        matching: .any,
        until: Date.distantPast,
        inMode: .default,
        dequeue: true
    ) else {
        return false
    }

    let payload: EventPayload?
    if event.window !== s.window {
        payload = nil
    } else {
        switch event.type {
        case .leftMouseDown, .rightMouseDown, .otherMouseDown:
            payload = mousePayload(type: EVENT_TYPE_MOUSE_DOWN, event: event, state: s)
        case .leftMouseUp, .rightMouseUp, .otherMouseUp:
            payload = mousePayload(type: EVENT_TYPE_MOUSE_UP, event: event, state: s)
        case .mouseMoved, .leftMouseDragged, .rightMouseDragged, .otherMouseDragged:
            payload = mousePayload(type: EVENT_TYPE_MOUSE_MOVE, event: event, state: s)
        case .keyDown:
            payload = keyboardPayload(type: EVENT_TYPE_KEY_DOWN, event: event)
        case .keyUp:
            payload = keyboardPayload(type: EVENT_TYPE_KEY_UP, event: event)
        default:
            payload = nil
        }
    }

    NSApp.sendEvent(event)
    guard let payload else {
        return false
    }
    writeEvent(outEvent, payload: payload)
    return true
}

@_cdecl("window_begin_frame")
public func windowBeginFrame(_ win: UnsafeMutableRawPointer?) -> OpaquePointer? {
    guard let win else { return nil }
    return stateFrom(win).skiaView.beginFrame()
}

@_cdecl("window_end_frame")
public func windowEndFrame(_ win: UnsafeMutableRawPointer?) {
    guard let win else { return }
    stateFrom(win).skiaView.endFrame()
}

@_cdecl("window_get_scale")
public func windowGetScale(_ win: UnsafeMutableRawPointer?) -> Double {
    guard let win else { return 1.0 }
    return stateFrom(win).window.backingScaleFactor
}

@_cdecl("window_destroy")
public func windowDestroy(_ win: UnsafeMutableRawPointer?) {
    guard let win else { return }
    Unmanaged<WindowState>.fromOpaque(win).release()
}

// MARK: - Setters

@_cdecl("window_set_title")
public func windowSetTitle(_ win: UnsafeMutableRawPointer?, _ title: UnsafePointer<UInt8>?, _ titleLen: Int) {
    guard let win, let titleStr = decodeUtf8(title, titleLen) else { return }
    stateFrom(win).window.title = titleStr
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
public func windowGetTitle(_ win: UnsafeMutableRawPointer?, _ buf: UnsafeMutablePointer<UInt8>?, _ bufLen: Int) -> Int {
    guard let win else { return 0 }
    let bytes = Array(stateFrom(win).window.title.utf8)
    guard let buf, bufLen > 0 else { return bytes.count }

    let toCopy = min(bytes.count, bufLen)
    for i in 0..<toCopy {
        buf[i] = bytes[i]
    }
    return bytes.count
}

@_cdecl("window_get_width")
public func windowGetWidth(_ win: UnsafeMutableRawPointer?) -> Int32 {
    guard let win else { return 0 }
    return stateFrom(win).skiaView.drawableWidth
}

@_cdecl("window_get_height")
public func windowGetHeight(_ win: UnsafeMutableRawPointer?) -> Int32 {
    guard let win else { return 0 }
    return stateFrom(win).skiaView.drawableHeight
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
