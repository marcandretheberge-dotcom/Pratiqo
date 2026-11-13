# Café entrance film

## Current creative direction

The product owner requested an apparently continuous, silent FPV/drone journey through cafés in this exact order: **Japan → Marrakech, Morocco → Paris, France**. The creative target is approximately **30 seconds**, in **16:9 at 720p**. The camera enters and crosses the Japanese and Moroccan cafés, leaving through each opposite rear doorway to reveal the next city. In Paris, the journey ends at a table: a beautiful adult woman welcomes the viewer, one empty chair awaits, and exactly two coffees are already placed, one for each person. The camera approaches the empty place and lowers into a seated guest's point of view. A brief soft transition then returns to the Japanese entrance for the next loop.

The selected model for this revision is **Seedance 2.5**. Use the existing location references in the order **Kyoto → Marrakech → Paris**, with Kyoto establishing the Japanese setting. Request no narration, music or other audio. The 30-second duration and apparent continuity of the forward journey are targets to assess against the actual export; they have not yet been verified. The seated ending uses an intentional loop reset, without implying a physically continuous movement from the chair back into flight in Japan.

### Intended route and timing

| Time | Camera path and setting |
| --- | --- |
| 0–3 seconds | Begin beneath the shaded entrance of a traditional Japanese café. Glide forward through an open timber doorway, with a restrained glimpse of the exterior. |
| 3–9 seconds | Cross the Japanese interior: warm wood, ceramic cups, soft daylight and a few seated adults. Keep the opposite rear doorway visible as the destination. |
| 9–11 seconds | Pass through that rear doorway. Its deep threshold shadow briefly fills the frame; emerge into a small Marrakech lane or courtyard at the same height, speed and forward direction. |
| 11–14 seconds | Cross a short outdoor space toward the Moroccan café entrance. Ochre plaster, green tile and courtyard light establish the new setting. |
| 14–20 seconds | Enter and cross the Moroccan café. Continue toward the opposite rear passage and conceal the geographic change within its shaded threshold. |
| 20–23 seconds | Emerge onto a quiet Parisian terrace and approach the next café. A stone façade, wicker chairs and open glazed doors establish Paris. |
| 23–24 seconds | Enter the Paris café, with a zinc counter and small tables establishing the interior. Reveal the woman and the table prepared for two along the forward path. |
| 24–28.5 seconds | Gently slow while approaching the one empty chair opposite the woman, then lower smoothly toward seated eye level. Show exactly two coffees on the table, one at her place and one at the guest's place. |
| 28.5–30 seconds | Settle into a calm guest's point of view. The woman offers a small, natural smile and brief friendly eye contact; subtle steam and movement keep the ending alive. Generate a clean seated endpoint. |
| Loop boundary, during export | Add a brief soft dissolve, approximately 0.6 seconds, back to the opening Japanese entrance. Treat this as the deliberate restart of the journey; the camera does not leave through a Paris rear door. Verify the actual exported duration after overlap. |

### Motion, transitions and composition

Maintain a level horizon, an approximately eye-level camera height, a wide but natural perspective and a steady, welcoming forward pace through Japan and Marrakech. Small steering adjustments can follow the doors. Each of those rear exits should be visible before the camera reaches it, with believable room depth and an unobstructed route through the interior. Reserve the final five to six seconds for the Paris table approach, gentle deceleration, seated settling and soft loop reset.

Conceal the Japan-to-Marrakech and Marrakech-to-Paris transitions inside real doorway shadows or occlusion. Any assembly along that forward route must preserve the appearance of one continuous move. Keep visible architecture stable; avoid morphing rooms, passing through walls, abrupt turns, rolls or sudden speed changes. At the Paris table, lower to seated eye level without passing through the chair or tabletop. Review the deliberate seated-to-Japan dissolve at normal playback speed for a calm restart, with no abrupt exposure flash or prolonged black hold.

Give the adult woman a warm, natural appearance and understated styling. Her welcome is modest and friendly: a small smile and relaxed posture. The featured table has her occupied chair, one empty guest chair and exactly two cups of coffee, one for each place. Keep the cups stable during the approach and settling; do not introduce an extra cup or a serving action that changes the count. Frame her face and both coffees within the central composition so the seated welcome remains clear on mobile.

Keep the route and doorways near the centre of the image so mobile cropping preserves the journey. Use warm cream, terracotta and muted olive accents, natural light and realistic materials. Background adults may make subtle gestures without obstructing the path. These are fictional café settings. Keep drone hardware, lettering, brand logos, captions and city labels out of the image.

## Project history and pending status

The Creative Claw project is **Pratiqo — One café, three worlds**, ID `feb9712b-c117-4f5a-ada2-b944bda700bf`. Its original four-café plan is preserved in full snapshot `e50674ba-a32a-46cd-a382-5568120d5a9d`, labelled **Original four café entrances — 4 storyboards and 2 clips**. That version contains four location storyboards—Montréal, Paris, Kyoto and Marrakech—and two generated clips, Montréal and Kyoto. The ordered Kyoto, Marrakech and Paris storyboards provide references for the new direction; the earlier clips do not establish the requested continuous route or its loop.

The updated single-shot plan and prompt are saved with the seated Paris endpoint and the existing ordered image references. The preceding rear-door ending is preserved in full snapshot `2f057538-97b1-4347-b910-23038d672d40`, labelled **Three-country journey before the seated Paris ending**. No new render has been requested for this endpoint change. Generation proceeds through the film card under the workspace's Review setting. There is no approved, exported final film for this revised route, and its motion, transitions, seated ending and loop quality remain unverified.

The website manifest remains **`cafeHeroMedia.videoSrc: null`** in `lib/cafe/heroMedia.ts`. The existing photograph stays visible until a reviewed web asset is available and installed.

## Integration and acceptance

Before installation, inspect the complete exported journey for the exact Japan → Marrakech → Paris order, entry and traversal of the Japanese and Moroccan cafés, their opposite rear exits, natural movement, stable architecture and concealed geographic changes. In Paris, verify the café entry, a clearly adult woman, one empty guest chair, exactly two coffees with one per place, and a gentle approach that settles at seated eye level without clipping through furniture. Check that her welcome stays natural and that both cups remain consistent. The ending must stay at the table and use a brief, calm return to Japan; assess the intentional dissolve for frozen frames, distracting brightness changes or an abrupt restart. Review both the full landscape composition and the centre crop used on mobile. Revise or reject the export if these criteria are not met.

Export an approved film as a silent H.264 MP4 with no audio track, a browser-compatible pixel format and fast-start metadata. Target a compact 1280×720 file; record its actual duration, dimensions, byte size and SHA-256 alongside the reviewed source. Put the reviewed web asset at `public/videos/cafe-world-journey.mp4` and only then set the media manifest's local source. Do not use a temporary signed provider URL as a permanent site asset.

The entrance player must keep the existing photograph as its poster/fallback, reserve its aspect ratio, expose a translated play/pause control and remain outside active text/video conversations. Reduced-motion and data-saving preferences should prevent automatic loading/playback; an explicit Play action may opt into loading. Pause offscreen or when the document is hidden, preserve a deliberate user pause, and fall back cleanly when the file cannot load or autoplay is rejected.

Verify the real exported asset on desktop and mobile before claiming the world-café video is installed. Production activation is a separate release step.
