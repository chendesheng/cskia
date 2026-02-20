// swift-tools-version: 5.9
import PackageDescription
import Foundation

// Absolute path to the package root — used for paths to pre-built Skia libraries
// that live outside SPM's normal source-tree search.
let pkg      = URL(fileURLWithPath: #file).deletingLastPathComponent().path
let skiaBuild = "\(pkg)/skia/skia/skia/build"

let package = Package(
    name: "cskia",
    platforms: [.macOS(.v14)],
    products: [
        .library(name: "SkiaWindow", type: .dynamic, targets: ["SkiaWindow"]),
    ],
    targets: [
        // MARK: CSkia — C wrapper compiled from sk_capi.cpp
        .target(
            name: "CSkia",
            path: "capi",
            sources: ["sk_capi.cpp"],
            publicHeadersPath: ".",
            cxxSettings: [
                // sk_capi.cpp uses #include "include/foo.h" (relative to Skia root)
                // and #include "include/foo/bar.h", so both paths are needed.
                .headerSearchPath("../skia/skia"),
                .headerSearchPath("../skia/skia/include"),
                .define("SKIA_C_DLL"),
                .unsafeFlags(["-fvisibility=hidden"]),
            ]
        ),

        // MARK: SkiaWindow — Swift dynamic library
        .target(
            name: "SkiaWindow",
            dependencies: ["CSkia"],
            path: "window",
            linkerSettings: [
                .linkedFramework("Cocoa"),
                .linkedFramework("Metal"),
                .linkedFramework("QuartzCore"),
                .unsafeFlags([
                    "-L\(skiaBuild)",
                    "-lskparagraph", "-lskshaper", "-lskia",
                    "-lskunicode_icu", "-lskunicode_core",
                    "-lharfbuzz", "-licu", "-licu_bidi", "-lskcms", "-lpng",
                    "-lc++",
                    "-Xlinker", "-undefined",
                    "-Xlinker", "dynamic_lookup",
                ]),
            ]
        ),
    ],
    cxxLanguageStandard: .cxx17
)
