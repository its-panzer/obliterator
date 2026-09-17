# Launch and background playback options

Reviewed September 17, 2026. The current mode uses visible YouTube players. At the user's request, the launch click now attempts both prepared players directly, with native Play buttons as fallback. Page-load autoplay and automatic replacements remain disabled.

## YouTube mode

True automatic startup of both layers conflicts with YouTube's limit of one automatically playing player per page/screen. Automatic playback also requires more than half of the player to be visible. Browser rules may independently block audible autoplay. Sources: [YouTube playback requirements](https://developers.google.com/youtube/terms/required-minimum-functionality#autoplay-and-scripted-playbacks), [Chrome autoplay](https://developer.chrome.com/blog/autoplay), [Safari autoplay](https://webkit.org/blog/7734/auto-play-policy-changes-for-macos/).

An explicit launch click calling `playVideo()` on two already prepared players is distinct from automatic page-load playback. The API permits scripted playback, but the published minimum-functionality wording does not unambiguously classify this exact simultaneous user-initiated arrangement. It should not be represented as guaranteed to work or certified compliant. Any experiment would need per-player blocked-playback handling and visible native controls. See the [IFrame API](https://developers.google.com/youtube/iframe_api_reference#onAutoplayBlocked).

The local experiment requests both starts synchronously from the actual click, after revealing the players. It does not stagger starts or retry after delayed readiness. The in-app browser started both successfully; other browsers and early clicks may still need native Play.

Invisible/background YouTube playback is expressly prohibited by Developer Policy III.I.9. III.I.7 also restricts separating or isolating the audio and video. A hidden iframe, browser setting or desktop wrapper does not remove those restrictions. See [additional prohibitions](https://developers.google.com/youtube/terms/developer-policies#additional-prohibitions).

## Direct-audio mode

A separate mode using original local files or creator-provided audio licensed for the app would support the intended listening workflow:

1. Keep the existing interface, preferences and visualizer.
2. Add file import/local storage or a licensed audio catalog, with track metadata and independent queues.
3. Replace YouTube controllers with audio playback lanes and independent gains. Resume the audio context from the launch click. Generate pink noise locally if desired.
4. Schedule seamless loops/crossfades, keep audio running while hidden, and stop drawing the visualizer while hidden. Music alone remains the visual input.
5. Add media controls and interruption recovery; test browser backgrounding, screen lock, long runs and resource use. Computer sleep and resource pressure still limit playback.

This supports one-click startup, not a guarantee of audible playback before any browser interaction. See [Web Audio activation](https://developer.chrome.com/blog/web-audio-autoplay) and [page lifecycle guidance](https://developer.chrome.com/docs/web-platform/page-lifecycle-api#faqs).

Rough engineering estimate: one to two days for a files-first desktop version and browser checks, excluding audio licensing/curation and mobile support. This is a scope estimate, not a delivery commitment. No direct-audio mode was implemented in this phase.
