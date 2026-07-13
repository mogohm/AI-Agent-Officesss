# Pixel-art assets

Drop generated pixel-art here. The app shows labeled placeholders until a file
exists, then renders it automatically (no code change needed).

- **What to generate + exact paths/sizes:** `docs/ASSET_MANIFEST.md`
- **Prompts to generate them consistently:** `docs/SPRITE_PROMPTS.md`
- **Seat coordinates** (where workers sit in each room): tune in
  `apps/web/lib/assets/departmentScenes.ts`

Quick start (minimum to see real art):
1. `characters/dev-a/idle.webp` + `characters/dev-a/working.webp`
2. `office/floors/dev-room.webp`
3. `office/buildings/thumbs/thumb-blue.webp`

Then open a company → the Dev floor and its workers render from your art.
