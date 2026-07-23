# Release Readiness

## Portable Alpha

Run:

```sh
npm run release:portable
```

The command runs the complete verification cage, builds production assets, and creates:

```text
release/DeltaV-0.1.0-alpha.1-portable/
  app/
  DeltaV.command
  DeltaV.cmd
  DeltaV.sh
  server.mjs
  README.txt
```

The launchers require Node.js 20 or newer. They serve only the packaged files on `127.0.0.1`,
choose a free local port when 4173 is occupied, and open the default browser. No development
server, source tree, or network bind is required.

## Release Checklist

- `npm run verify` passes.
- The canonical v10 map is the initial preset and reports 18 active nodes.
- The browser console has no fresh runtime or WebGL errors after a clean load.
- The portable artifact serves its own `index.html`, assets, and vanilla content.
- Version and artifact directory agree.

## Current Boundary

The portable artifact remains available for browser-based testing.

## Native macOS App

Run:

```sh
npm run release:mac
```

This verifies the project, builds the app icon from the selected Ring Hex ship capture, and creates
an Apple Silicon desktop app at:

```text
release/DeltaV-0.1.0-alpha.6-macOS/DeltaV-darwin-arm64/DeltaV.app
```

`DeltaV.app` opens in native full screen at the main menu. The bundle is unsigned and not
notarized, so it is suitable for local development and testing; public distribution needs an Apple
Developer certificate and notarization.

## Native Windows App

Run:

```sh
npm run release:win
```

This creates a 64-bit Windows app, using the same ship icon, at:

```text
release/DeltaV-0.1.0-alpha.6-Windows/DeltaV-win32-x64/AVVIA-DELTA-V.cmd
release/DeltaV-0.1.0-alpha.6-Windows-x64.zip
```

The ZIP is the canonical tester artifact. It contains a normal launcher, a windowed SwiftShader
safe-mode launcher, startup and Chromium logging, build metadata, and SHA-256 checksums. Testers
must extract the complete folder before launching it. The executable is unsigned and may cause a
SmartScreen warning until it is code signed.
