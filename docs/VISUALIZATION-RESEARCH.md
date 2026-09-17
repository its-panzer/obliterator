# Visualization directions

Research checked September 17, 2026. The user selected attractor particles. The Three.js r186 effect is now implemented, with Particles / Contours / None controls. The original contour renderer remains selectable and is the graphics-failure fallback.

## Recommendation

Use **Three.js with its WebGPU renderer and TSL** for a substantial visual upgrade: an evolving three-dimensional sculpture of broad luminous ribbons circulating around a dark center. The attractor demo demonstrates the depth and motion available; its point-cloud appearance is a reference, not the proposed finished design. Reduce the sparkling detail, retain broad folds and a quiet camera, and let the music profile slowly change shape and color.

For a quicker first result, **Paper Shaders Smoke Ring** is the strongest ready-made fit for Obliterator: a smoky portal with a dark center. **React Bits Liquid Ether** is the alternative for an enveloping field of flowing color.

| Direction | Live reference | Implementation and tradeoff |
|---|---|---|
| Dimensional sculpture | [Three.js attractor particles](https://threejs.org/examples/webgpu_tsl_compute_attractors_particles.html), [linked particles](https://threejs.org/examples/webgpu_tsl_vfx_linkedparticles.html) | Most room for a distinctive result. Requires custom art direction and more graphics work. Compute effects need explicit compatibility handling. |
| Smoke portal | [Paper Smoke Ring](https://shaders.paper.design/smoke-ring), [Gem Smoke](https://shaders.paper.design/gem-smoke) | Fastest polished integration. React components with adjustable noise, color, shape and speed; WebGL2 procedural shading rather than a navigable 3D scene. |
| Fluid color | [React Bits Liquid Ether](https://reactbits.dev/backgrounds/liquid-ether) | Real multipass fluid simulation with autonomous motion. Good folds and recirculation, but simulation cost needs tuning alongside video decoding. |

## Maintenance and integration

- [Three.js r186](https://github.com/mrdoob/three.js/releases/tag/r186) was released September 8, 2026. [React Three Fiber 9.7.0](https://github.com/pmndrs/react-three-fiber/releases/tag/v9.7.0) is compatible with the app's React 19 family; it is optional. Three's [WebGPU renderer](https://threejs.org/docs/pages/WebGPURenderer.html) supports a WebGL2 fallback, but this does not guarantee that an arbitrary compute-based effect runs identically on both backends.
- [Paper Shaders](https://github.com/paper-design/shaders) has React package version 0.0.80, released August 9, 2026. Pin the version because its maintainers allow breaking changes in 0.0.x. Its documented default minimum pixel ratio is 2; configure a fullscreen pixel budget explicitly. Setting speed to zero stops the animation loop and supports Still mode.
- [React Bits](https://github.com/DavidHDev/react-bits) is an actively maintained component collection. Adapt the selected component rather than importing a collection. The [Liquid Ether source](https://github.com/DavidHDev/react-bits/blob/main/src/content/Backgrounds/LiquidEther/LiquidEther.jsx) uses Three.js WebGL rendering, autonomous movement, and visibility pausing. Defaults include resolution 0.5, DPR capped at 2, and 32 pressure iterations; benchmark lower settings with both YouTube layers playing.
- [Shader Park](https://github.com/shader-park/shader-park-core) has an appealing procedural sculpture vocabulary, but its core's latest observed release/commit was May 2024. [OGL](https://github.com/oframe/ogl) is a lightweight WebGL foundation, but changing engines alone would not make the existing composition more compelling. Neither is the first choice for this request.

## Preserve the product behavior

Only music mood, chapter metadata and playback time should drive the effect. YouTube does not provide the audio samples needed for live spectrum analysis here. ASMR and pink noise must remain visually independent.

Keep Motion / Still / Off, reduced-motion handling, hidden-tab suspension, gradual palette transitions and the current static/contour fallback. Begin with a capped pixel budget and no fast camera travel or screen-wide brightness pulses. These are comfort design choices, not evidence of ADHD treatment or improved productivity.

## Evidence boundary

Official sources and component code were researched. The Smoke Ring, Liquid Ether and Three.js attractor demos were opened and visually inspected in the in-app Chromium browser. Each rendered successfully there. That is not a Safari check, sustained performance benchmark, or proof of resource cost alongside three YouTube decoders. Three.js 0.186.0 and its matching types are now pinned in the app. The new renderer uses a lazy import, two particle buffers, three attractors and one instanced sprite draw. Browser verification of the integrated effect is recorded in `VERIFICATION.md`.
