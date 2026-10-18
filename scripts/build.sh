#!/usr/bin/env bash
set -eu

ROOT="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
DIST="$ROOT/dist"

build_browser() {
    browser="$1"

    printf 'Building %s extension...\n' "$browser"

    output="$DIST/$browser"

    rm -rf "$output"
    mkdir -p "$output"

    cp "$ROOT/$browser/manifest.json" "$output/manifest.json"
    cp "$ROOT/$browser/background.js" "$output/background.js"

    if [ -f "$ROOT/$browser/background.html" ]; then
        cp "$ROOT/$browser/background.html" "$output/background.html"
    fi

    cp -R "$ROOT/shared" "$output/shared"
    cp -R "$ROOT/ui" "$output/ui"

    if [ -d "$ROOT/icons" ]; then
        cp -R "$ROOT/icons" "$output/icons"
    fi

    if [ -f "$ROOT/4341-frieren-6-1023081867.ico" ]; then
        cp "$ROOT/4341-frieren-6-1023081867.ico" "$output/4341-frieren-6-1023081867.ico"
    fi

    printf 'Built: %s\n' "$output"
}

build_browser chrome
build_browser firefox

printf '\nBuild complete.\n'
printf 'Chrome:  %s/chrome\n' "$DIST"
printf 'Firefox: %s/firefox\n' "$DIST"