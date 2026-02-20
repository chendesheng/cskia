#!/usr/bin/env bash
# build_lib.sh — compile window.swift + sk_capi.cpp into build/libskiawindow.dylib
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

SKIA_BUILD="$SCRIPT_DIR/skia/skia/skia/build"
# sk_capi.cpp uses #include "include/foo.h", so the parent of include/ is needed
SKIA_ROOT="$SCRIPT_DIR/skia/skia"
SKIA_INCLUDE="$SKIA_ROOT/include"

mkdir -p build

echo "Compiling sk_capi.cpp..."
clang++ -c capi/sk_capi.cpp \
  -std=c++17 \
  -I "$SKIA_ROOT" \
  -I "$SKIA_INCLUDE" \
  -DSKIA_C_DLL \
  -fvisibility=hidden \
  -o build/sk_capi.o

echo "Compiling window/window.swift → build/libskiawindow.dylib..."
swiftc window/window.swift \
  -Xcc "-fmodule-map-file=$SCRIPT_DIR/window/module.modulemap" \
  -module-name SkiaWindow \
  -emit-library \
  -framework Cocoa \
  -framework Metal \
  -framework QuartzCore \
  build/sk_capi.o \
  "$SKIA_BUILD/libskparagraph.a" \
  "$SKIA_BUILD/libskshaper.a" \
  "$SKIA_BUILD/libskia.a" \
  "$SKIA_BUILD/libskunicode_icu.a" \
  "$SKIA_BUILD/libskunicode_core.a" \
  "$SKIA_BUILD/libharfbuzz.a" \
  "$SKIA_BUILD/libicu.a" \
  "$SKIA_BUILD/libicu_bidi.a" \
  "$SKIA_BUILD/libskcms.a" \
  "$SKIA_BUILD/libpng.a" \
  -Xlinker -lc++ \
  -Xlinker -undefined \
  -Xlinker dynamic_lookup \
  -Xlinker -install_name \
  -Xlinker "@rpath/libskiawindow.dylib" \
  -o build/libskiawindow.dylib

echo "Done: build/libskiawindow.dylib"
