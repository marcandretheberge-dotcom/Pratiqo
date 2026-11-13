# Café entrance film

## Current creative direction

The product owner requested an apparently continuous, silent FPV/drone journey through cafés in this exact order: **Japan → Marrakech, Morocco → Paris, France**. The creative target is approximately **30 seconds**, in **16:9 at 720p**. The camera enters each café, crosses its interior and leaves through the opposite rear doorway, revealing the next city. The final Paris doorway conceals the loop back to the Japanese entrance.

The selected model for this revision is **Seedance 2.5**. Use the existing location references in the order **Kyoto → Marrakech → Paris**, with Kyoto establishing the Japanese setting. Request no narration, music or other audio. The 30-second duration and seamless continuity are targets to assess against the actual export; they have not yet been verified.

### Intended route and timing

| Time | Camera path and setting |
| --- | --- |
| 0–3 seconds | Begin beneath the shaded entrance of a traditional Japanese café. Glide forward through an open timber doorway, with a restrained glimpse of the exterior. |
| 3–9 seconds | Cross the Japanese interior: warm wood, ceramic cups, soft daylight and a few seated adults. Keep the opposite rear doorway visible as the destination. |
| 9–11 seconds | Pass through that rear doorway. Its deep threshold shadow briefly fills the frame; emerge into a small Marrakech lane or courtyard at the same height, speed and forward direction. |
| 11–14 seconds | Cross a short outdoor space toward the Moroccan café entrance. Ochre plaster, green tile and courtyard light establish the new setting. |
| 14–20 seconds | Enter and cross the Moroccan café. Continue toward the opposite rear passage and conceal the geographic change within its shaded threshold. |
| 20–23 seconds | Emerge onto a quiet Parisian terrace and approach the next café. A stone façade, wicker chairs and open glazed doors establish Paris. |
| 23–29 seconds | Enter and cross the Paris café, passing a zinc counter and small tables. Continue toward its shaded rear doorway. |
| 29–30 seconds → start | Move into the final doorway's darkness. Match its framing, exposure and forward movement to the opening Japanese threshold so the restart can be concealed. |

### Motion, transitions and composition

Maintain a level horizon, an approximately eye-level camera height, a wide but natural perspective and a steady, welcoming forward pace. Small steering adjustments can follow the doors. Each rear exit should be visible before the camera reaches it, with believable room depth and an unobstructed route through the interior.

Conceal geographic transitions inside real doorway shadows or occlusion. Any assembly between clips must preserve the appearance of one continuous move. Keep visible architecture stable; avoid morphing rooms, passing through walls, abrupt turns, rolls or speed ramps. Design the opening and closing threshold frames together, with a short moving transition rather than a prolonged black hold. Review the loop boundary at normal playback speed before accepting it.

Keep the route and doorways near the centre of the image so mobile cropping preserves the journey. Use warm cream, terracotta and muted olive accents, natural light and realistic materials. Background adults may make subtle gestures without obstructing the path. These are fictional café settings. Keep drone hardware, lettering, brand logos, captions and city labels out of the image.

## Project history and pending status

The Creative Claw project is **Pratiqo — One café, three worlds**, ID `feb9712b-c117-4f5a-ada2-b944bda700bf`. Its original four-café plan is preserved in full snapshot `e50674ba-a32a-46cd-a382-5568120d5a9d`, labelled **Original four café entrances — 4 storyboards and 2 clips**. That version contains four location storyboards—Montréal, Paris, Kyoto and Marrakech—and two generated clips, Montréal and Kyoto. The ordered Kyoto, Marrakech and Paris storyboards provide references for the new direction; the earlier clips do not establish the requested continuous route or its loop.

The revised single-shot plan, prompt and ordered image references are saved. No new render has been submitted. Generation proceeds through the film card under the workspace's Review setting. There is no approved, exported final film for this revised route, and its motion, transitions and loop quality remain unverified.

The website manifest remains **`cafeHeroMedia.videoSrc: null`** in `lib/cafe/heroMedia.ts`. The existing photograph stays visible until a reviewed web asset is available and installed.

## Integration and acceptance

Before installation, inspect the complete exported journey for the exact Japan → Marrakech → Paris order, entry and traversal of each café, opposite rear exits, natural movement, stable architecture and concealed geographic changes. Check that the final Paris threshold joins the opening Japanese threshold without a visible jump, frozen frame or distracting brightness change. Review both the full landscape composition and the centre crop used on mobile. Revise or reject the export if these criteria are not met.

Export an approved film as a silent H.264 MP4 with no audio track, a browser-compatible pixel format and fast-start metadata. Target a compact 1280×720 file; record its actual duration, dimensions, byte size and SHA-256 alongside the reviewed source. Put the reviewed web asset at `public/videos/cafe-world-journey.mp4` and only then set the media manifest's local source. Do not use a temporary signed provider URL as a permanent site asset.

The entrance player must keep the existing photograph as its poster/fallback, reserve its aspect ratio, expose a translated play/pause control and remain outside active text/video conversations. Reduced-motion and data-saving preferences should prevent automatic loading/playback; an explicit Play action may opt into loading. Pause offscreen or when the document is hidden, preserve a deliberate user pause, and fall back cleanly when the file cannot load or autoplay is rejected.

Verify the real exported asset on desktop and mobile before claiming the world-café video is installed. Production activation is a separate release step.
