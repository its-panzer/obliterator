# Obliterator

A local desktop listening room: YouTube music and no-talking ASMR, optional pink noise, and slow organic visuals.

Live at [obliterator.net](https://obliterator.net), hosted on Vercel. Made by [@panzer](https://twitter.com/panzer).

## Run

Requires Node 22.13 or newer. No API keys or environment variables are needed.

```sh
git clone https://github.com/its-panzer/obliterator.git
cd obliterator
npm ci
npm run dev -- --host 127.0.0.1 --port 4179
```

Open http://localhost:4179. Press **obliterate me** to reveal the visualization and request playback from both prepared, fully visible players. If a source is still loading or the browser blocks its start, press Play inside that video. Music and ASMR start enabled each session; pink noise starts off. Each layer has its own switch. Disabling a layer pauses and removes its player; re-enabling prepares a source for manual Play without resetting the other layers. All three levels are independent; volumes, visual choice and Still preference are saved on this device. Use **Particles / Contours / None** to choose the visual; **Still** freezes either effect independently of audio. Reduced-motion preferences keep the image still.

Keep the window visible. Hidden tabs and fully/partially offscreen players pause; returning does not automatically resume them. On narrow screens, scroll a player fully into view before starting it. Fullscreen includes the players. When music ends, it selects and starts another catalog video while its player is visible. If the browser blocks playback, press Play to continue. ASMR and pink-noise replacements still wait for native Play.

Each layer uses a fresh random selection and remembers its three most recent sources on this device across refreshes. Selection avoids the previous video and prefers a different creator when available, then prefers videos outside recent history. Pink noise chooses randomly on first use and alternates between the two catalog recordings thereafter; both recordings are from Relaxing White Noise. If browser storage is blocked, recent history lasts only for the current page session.

## Checks

```sh
npm test
npm run typecheck
npm run build
```

Tests cover the queue and controller lifecycle with a fake YouTube adapter. Actual YouTube playback depends on browser permissions, source availability, ads, and buffering. A complete cross-browser and two-hour soak test remains outstanding.

## Production

`npm run build:production` creates a static Next.js export in `.next-production`. Serve that directory with a static HTTPS host, or import this repository into Vercel, which uses the included `vercel.json`. The local preview uses Vinext; production uses Next.js. Do not add environment secrets to the repository.

## Architecture

- `lib/catalog.ts`: 11 source videos, creator metadata, chapter entry points and authored visual moods. Five music genres overlap naturally. No media is downloaded or hosted.
- `lib/controller.ts`: one independent YouTube controller per enabled layer. The explicit launch click can call `playVideo()` on ready, visible players. No delayed retry is retained. Initial preparation, explicit Next, and layer re-enabling only cue. Music endings use `loadVideoById` to continue automatically while visible; the other layers still cue their replacements. There is no page-load autoplay. Native Play remains the fallback if continuation is blocked.
- `components/visualizer.tsx`: chooses the lazy-loaded attractor renderer or original contours. None unmounts graphics and releases resources.
- `lib/attractor-renderer.ts`: Three.js r186 WebGPU/TSL particle simulation, with WebGL2 transform-feedback support. 65,536 desktop / 24,576 narrow-screen particles, fixed simulation steps, softened gravity, three-second parameter and twenty-second palette smoothing. Rendering stops in Still, while music is paused, and when the document is hidden.
- `components/contour-visualizer.tsx`: original WebGL2 contours, also the particle failure fallback. Its own static fallback handles unavailable/lost WebGL.
- Only music metadata and playback state reach either visual. No raw audio or beat analysis is claimed. See `docs/VISUALIZATION-RESEARCH.md` and `THIRD-PARTY-NOTICES.md`.
- `lib/preferences.ts`: bounded, versioned browser preferences with a memory-only fallback when storage is unavailable.
- `lib/webmcp.ts`: optional `get_mix_state` and `pause_mix` browser tools. Native manual playback stays manual. Browsers without WebMCP keep all visible functionality.

There is no application account, database, analytics service, audio extraction, or waveform analyzer. The Sites starter supplies the local React/TypeScript preview and build tooling; local authentication simulation is disabled. Production uses a static Next.js export served by Vercel.

## Evidence boundaries

YouTube titles/chapters and embeddability metadata were checked September 17, 2026 UTC. They are not acoustic measurements. Initial music and ASMR levels are both 50%; the listener reported this mix as balanced. This is preference feedback, not a source-by-source loudness calibration. Pink noise starts at 20% or the listener's previously saved level.

Creator claims about sleep, focus, and ASMR are preserved in original source titles for attribution. They are not Obliterator claims. See `docs/RESEARCH.md` and `docs/CATALOG-REVIEW.md`.

## License

Application code is available under the [MIT License](LICENSE). Third-party components retain their own licenses; see [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md) and the adjacent licenses in `build/` and `vendor/`. Embedded YouTube videos remain the property of their respective rights holders and are not distributed or licensed by this repository.
