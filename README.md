# vjw-shader: Claude Code writes shaders into VeeJay Wizard's G editor
1. Copy this folder into `~/.claude/skills/` (you then have `~/.claude/skills/vjw-shader/SKILL.md`). It needs Node ≥ 18.
2. Add the site owner's token to `~/.claude/settings.json`: `"env": { "VJW_URL": "<SITE_URL>", "VJW_AI_TOKEN": "<token>" }` (or `export` both before you start `claude`).
3. Open the site → Start → G → Remote AI → paste the token → Connect (the dot turns green).
4. Ask Claude Code: «напиши шейдер для VeeJay Wizard: неоновые кольца под бас». More: <SITE_URL>/ai/chatgpt.md
5. Codex, Gemini or any agent with a shell: the same `VJW_URL` / `VJW_AI_TOKEN`, then `node scripts/vjw.mjs guide | state | push <file.glsl> [name] | export <name>`; give it `SKILL.md` to read first.
