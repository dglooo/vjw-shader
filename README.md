# vjw-shader: Claude Code writes shaders into VeeJay Wizard's G editor
1. Copy this folder into `~/.claude/skills/` (you then have `~/.claude/skills/vjw-shader/SKILL.md`). It needs Node ≥ 18.
2. Add the site address and the token from the site owner to `~/.claude/settings.json`: `"env": { "VJW_URL": "<SITE_URL>", "VJW_AI_TOKEN": "<token>" }`, with `<SITE_URL>` such as `https://<host>/vjw001` (or `export` both before you start `claude`).
3. Open the site → Start → G → Remote AI → paste the token → Connect (the dot turns green). В G рядом с Connect — код комнаты; дай его ИИ как `VJW_ROOM` (`"VJW_ROOM": "<code>"` in the same `env`), or just tell Claude the code when it asks. Each browser gets its own room on its first Connect and keeps it, so friends live-code at once with one token, each in their own editor.
4. Ask Claude Code: «напиши шейдер для VeeJay Wizard: неоновые кольца под бас». More: the page `<SITE_URL>/ai/chatgpt.md`
5. Codex, Gemini or any agent with a shell: the same `VJW_URL` / `VJW_AI_TOKEN` / `VJW_ROOM`, then `node scripts/vjw.mjs guide | state | push <file.glsl> [name] | export <name>` (`--room <code>` on any); give it `SKILL.md` to read first.
