# Trailer Capture

Start the development server:

```bash
npm install
npm run dev -- --host 127.0.0.1 --port 5173
```

Open the debug drawer and press `TRAILER`:

```text
http://127.0.0.1:5173/?debug=1
```

Or enter Trailer Capture directly:

```text
http://127.0.0.1:5173/?trailer=1
```

`?mode=trailer` is an equivalent URL entry point.

Start a specific scene (1–18) in the ready state:

```text
http://127.0.0.1:5173/?trailer=1&scene=7
```

Play all 18 scenes as one uninterrupted capture sequence:

```text
http://127.0.0.1:5173/?trailer=1&play=all
```

For the intended capture layout, set the browser viewport to `2560×1440`.

Controls:

- `Space` or `Enter`: play the current scene.
- `R`: reset and repeat the current scene.
- `N`: stop the current playback and play the next scene.
- `P`: stop the current playback and run PLAY ALL from scene 1.
- `Esc`: stop playback on the current state.
- Right drag or left/right arrow: interrupt automation and orbit.
- Left drag or `Shift` + arrow: interrupt automation and pan.
- Mouse wheel or up/down arrow: interrupt automation and zoom.

PLAY ALL does not reset between scenes, so an external screen recorder receives one continuous,
deterministic performance. Every scene has a three-second pre-roll, a three-second post-roll, and
two automated framings that combine pan, zoom, and orbit. Scene playback hides the ready-state
shortcut overlay, the cursor, and all debug panels.
