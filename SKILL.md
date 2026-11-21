---
name: vjw-shader
description: Use when the user asks to write, push, fix or export a shader for VeeJay Wizard (VJW), to live-code its G shader editor over Remote AI, or to make music-reactive Shadertoy-style GLSL visuals on the VeeJay Wizard site.
---

# VeeJay Wizard shaders

You write Shadertoy-style GLSL into the **G** shader editor open in the user's browser on the VeeJay Wizard site (a
music visualizer). The editor compiles and plays your code under the music, and answers with the errors by line and a
PNG still of the stage. The user watches and tells you what to change.

## Setup

1. The user opens the site (its address is `VJW_URL`) → **Start** → **G** → pastes the token
   into **Remote AI** → **Connect** (the dot turns green). That tab stays in view.
2. **Rooms:** each browser gets its own room on its first Connect and keeps it; the user only reads the code off the
   G row (beside Connect) and gives it to you. The room routes your calls to that user's editor, so several people
   live-code at once with one token. One editor a room: a newer tab in the same room takes over.
3. The shell needs `VJW_URL` (the site address, such as `https://<host>/vjw001`) and `VJW_AI_TOKEN` (the token), both
   from the site owner. If one is missing, ask the user to set it (this skill's README.md). Never write the token into a
   file, a shader or a reply.

## Commands

The script is `scripts/vjw.mjs` in this skill's base directory (usually `~/.claude/skills/vjw-shader/`). Node ≥ 18.

| Command | Result |
|---|---|
| `node ~/.claude/skills/vjw-shader/scripts/vjw.mjs state` | JSON: the code in the editor, its errors, `author` (AI or user) |
| `node ~/.claude/skills/vjw-shader/scripts/vjw.mjs push my.glsl [name]` | `Playing` + `still: my.png` (open it), or `line N: msg` lines and exit 1. `name` titles an unsaved draft; `--no-still` skips the PNG |
| `node ~/.claude/skills/vjw-shader/scripts/vjw.mjs export "Neon tunnel"` | `Neon tunnel.glsl` downloads in the user's browser |
| `node ~/.claude/skills/vjw-shader/scripts/vjw.mjs guide` | the full guide (also the page `$VJW_URL/ai/shader-guide.md`) |

Every command but `guide` takes `--room <code>`: the user's room code (else `VJW_ROOM`, else the room `main`).

## Work loop

1. **The room first.** If `VJW_ROOM` is not set (`printenv VJW_ROOM` prints nothing) and the user has not given you a
   room code yet, ask them, in one line: «Открой сайт → Start → G → Remote AI: какой там код комнаты (рядом с
   Connect)?». Then pass that code in every call: `--room <code>` (or `export VJW_ROOM=<code>` in your shell).
2. Run `state`. Keep the user's edits unless they ask otherwise.
3. Write the whole shader to a `.glsl` file and `push` it.
4. Errors: fix them by line (the lines of your file) and push again. The last good shader keeps playing.
5. `Playing`: open the still. Check that it is not black, not flat white, not one colour. Tell the user in one or two
   lines what you made or changed.
6. Iterate on the user's words. When they like it, `export "<Name>"` and tell them: "It is in your downloads; press
   **Save as…** in the editor to keep it as a scene."

## The contract

A single pass in GLSL ES 3.00 (WebGL2). Write only `mainImage`; the app adds `#version`, the uniforms and `main()`.

- `void mainImage(out vec4 fragColor, in vec2 fragCoord)`: `fragCoord` in pixels, (0,0) bottom left; alpha is forced to 1.
- `vec3 iResolution` (px) · `float iTime` (s) · `iTimeDelta` · `int iFrame` · `iFrameRate` · `vec4 iDate` ·
  `iSampleRate`. `iMouse` is always 0. No Buffer A–D, no cubemaps, no keyboard texture.
- **`iTime` runs on the music:** 0.6× between kicks, a leap to 2× on each kick (back in 0.3 s). Animate with `iTime`
  and the picture surges on the beat by itself.
- **`iChannel0` is the sound**, 512 × 2, `.r` only, linear filtering:
  - row 0 (`y = 0.25`): the spectrum, 512 bins from 0 Hz to Nyquist, 0..1 for −100…−30 dB, unsmoothed (it jitters).
    `x` for bass ≈ 0.002–0.008, mids 0.02–0.08, highs 0.15–0.5. One bin: `texelFetch(iChannel0, ivec2(bin, 0), 0).r`.
  - row 1 (`y = 0.75`): the waveform, 512 samples, 0.5 = silence.
- `iChannel1`–`iChannel3`: one 256 × 256 RGBA noise texture, repeating, mipmapped.
- **Sliders:** `uniform float speed; // = 0.5` adds a slider from 0 to 2 × the default. Also `int`, `bool`
  (`// = true`), `vec2` (a point), `vec3` / `vec4` (a colour, `// = vec3(1.0, 0.5, 0.2)`). The user can bind a slider to
  a music source (levels, drums, beat, `tonal`, `pitch`, `voice`): declare the slider and ask them to bind it, naming
  the source.
- A flash limiter caps the frame-mean brightness change at 0.06 per frame: a strobe turns into a dull grey pulse.

## Forbidden

- **Light driven by the sound.** Never map the spectrum or the waveform to brightness, exposure, the background colour
  or a full-frame colour. Let the sound move shapes: size, position, rotation, distortion, density.
- **Strobes, full-frame flashes, fast black/white alternation**, whatever drives them (time, kicks, `iFrame`).
- **Over budget.** Stay under ~5 ms a frame at 1080p on a laptop GPU: at most ~100 raymarch steps, 8 fractal
  iterations a step, 4 nested loops. Prefer analytic shapes and `smoothstep` to loops.
- **Anything but GLSL:** no `#include`, no textures from files, no network. No secrets or personal data in comments.

## Example

```glsl
// Orbit rings: rings orbit the centre; the bass widens them, the light stays. Credit: own work.
uniform float rings; // = 6.0
uniform vec3 tint;   // = vec3(0.2, 0.7, 1.0)

float bass() { return texture(iChannel0, vec2(0.004, 0.25)).r; } // ≈ 50–100 Hz, 0..1

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 p = (2.0 * fragCoord - iResolution.xy) / iResolution.y; // -1..1 on the short side
    float r = length(p), a = atan(p.y, p.x);
    float w = 0.02 + 0.03 * bass();                               // the sound moves the shape (ring width) ...
    float d = abs(fract(r * rings - 0.3 * iTime) - 0.5) / rings;
    float ring = smoothstep(w, 0.0, d) * smoothstep(1.4, 0.2, r);
    vec3 col = tint * ring * (0.6 + 0.4 * cos(a * 3.0 + iTime));  // ... the brightness does not follow it
    fragColor = vec4(col, 1.0);
}
```

Open every shader with a comment line that names what it is and its credit (`Credit: own work`, or the author and
licence of what you adapted).

## Errors

| Message | Do |
|---|---|
| `set VJW_URL` | ask the user to set the site address from the site owner (README.md), then run the command again |
| `set VJW_AI_TOKEN` | ask the user to set the token (README.md), then run the command again |
| `the server refused the token (401)` | the token is wrong: ask the user for the right one |
| `no G editor open in room …` | a wrong room code, or G is closed: ask the user for the code beside Connect (site → Start → G → Remote AI → Connect), then run again with `--room <code>` |
| `a bad room code` | a room code is 1 to 16 letters a–z or digits: ask the user for the code beside Connect |
| `did not answer in 20 s` | the editor's tab is hidden or asleep: ask the user to bring it into view |
| `cannot reach …`, `not the relay` | `VJW_URL` is wrong or the site is down: ask the user |
