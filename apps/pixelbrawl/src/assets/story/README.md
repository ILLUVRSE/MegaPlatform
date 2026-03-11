# Story Art Pack Layout

Drop full-screen comic panel art into these stable paths:

- `src/assets/story/<fighterId>/intro/`
- `src/assets/story/<fighterId>/ending/`
- `src/assets/story/<fighterId>/matchups/<opponentId>/`
- `src/assets/story/shared/`

Examples used by `storyData.js`:

- `src/assets/story/byte/intro/intro_1.webp`
- `src/assets/story/byte/matchups/glitch/prefight_1.webp`
- `src/assets/story/vex/matchups/brick/post_win_1.webp`
- `src/assets/story/shared/prefight_1.webp`

Recommended panel size: `1280x720` or `1920x1080`.
Prefer lightweight `webp` or optimized `png`.

Missing files are safe: `StoryScene` falls back to generated placeholder panels.
