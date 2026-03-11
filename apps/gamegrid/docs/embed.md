# GameGrid Embed Guide

GameGrid supports cross-origin iframe embedding and parent-child postMessage control.

## Recommended iframe markup
```html
<iframe
  src="https://YOUR_HOST/"
  title="GameGrid"
  allow="fullscreen; autoplay"
  style="width:100%;aspect-ratio:16/9;border:0"
></iframe>
```

## Parent -> Child commands
Use `iframe.contentWindow.postMessage(command, '*')`:
- `{ type: 'pause' }`
- `{ type: 'resume' }`
- `{ type: 'mute' }`
- `{ type: 'unmute' }`
- `{ type: 'setSafeArea', payload: { top, right, bottom, left } }`

## Child -> Parent events
GameGrid emits messages with `source: 'gamegrid'`:
- `{ source: 'gamegrid', type: 'ready', gameId? }`
- `{ source: 'gamegrid', type: 'game_start', gameId }`
- `{ source: 'gamegrid', type: 'game_end', gameId, score? }`
- `{ source: 'gamegrid', type: 'error', message, gameId? }`

## Embed test harness
- Local harness: `public/embed-test.html`
- Open in dev server: `/embed-test.html`
- Includes focus and pointer interaction checks plus pause/resume control buttons.

## Notes
- Portal dimensions are responsive and dynamically scale with safe-area insets.
- Bridge is safe when no parent exists.
