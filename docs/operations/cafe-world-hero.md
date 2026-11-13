# Café entrance film

## Approved direction and prepared cut

The product owner requested a moving entrance visual: a drone-style view entering different cafés around the world, replacing the current still photograph. The prepared first-cut plan is a silent, 20-second sequence in 16:9, with four five-second shots inspired by Montréal, Paris, Kyoto and Marrakech. These are fictional café settings, not documentary footage of named businesses.

| Shot | Camera and setting |
| --- | --- |
| Montréal | Glide from a red-brick neighbourhood facade through an open green doorway into a warm wood interior. |
| Paris | Pass wicker terrace chairs and an open doorway beneath a plain burgundy awning, ending inside a neighbourhood café. |
| Kyoto | Enter an open timber storefront and reveal a quiet café with a wood counter and ceramic cups. |
| Marrakech | Pass through an ochre arch into a café courtyard with restrained green tiles and citrus plants. |

Keep the direction forward and the horizon level. The desired movement is slow and welcoming, without drone hardware in frame, abrupt turns, rolls, rapid zooms, or movement through walls. Keep entrances in the central area for mobile cropping. Adults can make subtle background gestures. Do not bake lettering, brand logos, captions, or city labels into the image.

Use warm cream, terracotta and muted olive accents with soft late-afternoon light and realistic material textures. Each shot has a clean opening image and one continuous move. The initial model plan is Nano Banana 2 for the four opening images and Gemini Omni Flash for each five-second 720p video shot. No speech, score or sound design is required for this website background.

## Current media status

The film plan is saved in Creative Claw as **Pratiqo — Café around the world**. Video rendering requires the workspace's Review approval; no completed video or playable media URL was returned while preparing this change. Keep `cafeHeroMedia.videoSrc` in `lib/cafe/heroMedia.ts` unset until an actual exported asset exists. A working player or a saved shot plan is not a generated film.

## Integration and acceptance

After an approved export exists, inspect all four shots for natural movement, stable architecture, unobstructed entrances and clean transitions. Export a silent H.264 MP4 with a browser-compatible pixel format and fast-start metadata. Target a compact 1280×720 file; record its actual duration, dimensions, byte size and SHA-256 alongside the reviewed source. Put the reviewed web asset at `public/videos/cafe-world-journey.mp4` and only then set the media manifest's local source. Do not use a temporary signed provider URL as a permanent site asset.

The entrance player must keep the existing photograph as its poster/fallback, reserve its aspect ratio, expose a translated play/pause control and remain outside active text/video conversations. Reduced-motion and data-saving preferences should prevent automatic loading/playback; an explicit Play action may opt into loading. Pause offscreen or when the document is hidden, preserve a deliberate user pause, and fall back cleanly when the file cannot load or autoplay is rejected.

Verify the real exported asset on desktop and mobile before claiming the world-café video is installed. Production activation is a separate release step.
