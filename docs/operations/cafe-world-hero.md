# Café entrance film

## Current status

The product owner approved the Japan → Marrakech → Paris film, its multilingual invitation treatment, and installation in the Café entrance. The clean web asset is installed in this review branch at `public/videos/cafe-world-journey.mp4`. `lib/cafe/heroMedia.ts` now selects `/videos/cafe-world-journey.mp4`; the former `videoSrc: null` and “replacement awaiting approval” status are superseded.

This records the approved media and application integration. It does not assert that this branch is merged, deployed to production, or accepted on physical iOS/Android devices. Café community and live-call release gates remain separate.

## Approved creative direction

The silent journey visits cafés in this order: **Japan → Marrakech, Morocco → Paris, France**. It enters and crosses the first two settings, then approaches a Paris café table. A naturally seated adult woman welcomes the visitor; two coffees are on the table, and the Eiffel Tower is visible beside her through the window. The ending settles at the table before a brief deliberate dissolve returns to the Japanese entrance.

Preserve the approved footage and its restrained welcome. The woman, table, chairs, cups and landmark must remain stable; do not reintroduce the rejected furniture rotation or a missing Eiffel Tower. The loop reset is an edit, not a claim that the camera physically flies from the Paris chair back to Japan. The fictional café settings contain no product captions or city labels baked into the film. Invitations are application text layered separately.

## Approved source and installed export

The Creative Claw project is **Pratiqo — One café, three worlds**, ID `feb9712b-c117-4f5a-ada2-b944bda700bf`. The approved assembled film is asset `1b475b8e-2089-460b-8844-ebcff480d5c4`: [approved source MP4](https://cdn.creativeclaw.co/u/3ce57a61/videos/b4b37457-c05a-4110-9140-63db5144b2b0.mp4). Its inspected source contains **721 video frames**, is **1280×720**, lasts **30.041625 seconds**, and has an AAC audio stream. The source and separate captioned review export are retained outside this installed asset.

| Installed asset property | Verified value |
| --- | --- |
| Repository path | `public/videos/cafe-world-journey.mp4` |
| Public URL path | `/videos/cafe-world-journey.mp4` |
| Dimensions | 1280×720, 16:9 |
| Video | H.264, `yuv420p`, 24 fps |
| Frames | 706 |
| Duration | 29.416667 seconds |
| Byte size | 7,188,009 bytes, approximately 7.19 MB |
| SHA-256 | `c057899c53239fd0baf806bf605877b1ec82ecef3dac73840976f96e214be9b6` |
| Audio | No audio stream |
| Embedded captions | None |
| Fast start | Verified: MP4 `moov` precedes `mdat` |
| Encoding | `libx264`, slow preset, CRF 25 |

The approved untouched source has SHA-256 `97175f826ce11ae10c32359ae9a95f80429edfd0bc2b43a75384c59b11be222a`. The captioned review export has SHA-256 `01bc2b3d3f49d721d8532d8dbb0c842894d99c1f4d226895e9525579499e67df`. Neither is the clean, responsive web asset above.

The application serves the committed local asset. The provider URL is source provenance, not a runtime dependency or a permanent player URL. If the binary is replaced, recheck its metadata, checksum and actual playback rather than assuming that the same filename means the same approved film.

### Loop mapping

The export uses the same **15-frame / 0.625-second** wrap dissolve as the approved text preview, at normal playback speed:

- Normalize the source to 24 fps and begin playback at source frame **15**.
- Blend source frames **0–14** over the final 15 frames of the body, which correspond to source frames **706–720**.
- Start that dissolve at output time **28.791666667 seconds**. The output ends at **29.416666667 seconds**, then restarts at source frame 15.
- Before the wrap dissolve, a source cue maps to output time by subtracting **0.625 seconds**.

The current source enters its Japan-to-Marrakech dissolve around **9.1–9.7 seconds** and its Marrakech-to-Paris dissolve around **21.6–22.2 seconds**. These are observed source boundaries, not the earlier proposed 19-second replacement cut. Do not reapply the historical cut plan to this approved assembly.

## Invitations and localization

The film remains clean so typography can respond to the actual player width and interface language. `cafeHeroInvitations` defines exact cues on the **installed export's clock**:

| Scene | Visible main invitation | Language and direction | Start | End |
| --- | --- | --- | --- | --- |
| Japan | 一緒にコーヒーでもどうですか？ | Japanese, `ja`, left to right | 1.375 s | 5.875 s |
| Marrakech | أجي نشربو قهوة | Moroccan Darija, `ary`, right to left | 11.375 s | 15.875 s |
| Paris | On prend un café ensemble ? | French, `fr`, left to right | 21.875 s | 25.075 s |
| Final table | Ta place t’attend. | French, `fr`, left to right | 25.575 s | 28.625 s |

Each interval includes a **0.4-second fade in and fade out**. Opacity follows the media clock, including pause, seeking, resume and loop restart. It does not run on a separate wall-clock timer. Decoded-frame callbacks update the small set of text styles; animation frames are the fallback, and time/seek events synchronize paused seeking.

A smaller helper line uses the current interface locale when it differs from the main invitation's language:

| Interface | Coffee invitation helper | Final invitation helper |
| --- | --- | --- |
| French | On prend un café ensemble ? | Ta place t’attend. |
| English | Shall we have a coffee together? | Your seat is waiting. |
| Spanish | ¿Tomamos un café juntos? | Tu sitio te espera. |

French users therefore see helpers beneath Japanese and Darija, without a duplicate helper under the French scenes. English and Spanish users also receive their own helper for the Paris and final-table lines. Arabic text has its own right-to-left direction; its characters must not be manually reversed. Font stacks include Japanese and Arabic system fallbacks.

The wide layout places the invitation over the film. At narrow player widths, it moves into a **reserved strip directly below the 16:9 picture**, keeping text, faces and the Play/Pause control separate. Preserve the film's landscape composition; do not crop it into a portrait frame. Validate the actual nested entry layout at a 320px viewport, where the film can be substantially narrower than 320px, and check both helper lines and wrapped Japanese text.

The visual invitation layer is decorative and hidden from assistive technology to avoid repeated announcements. A stable localized description provides its meaning. Play/Pause remains an actual translated button with an accessible label, visible focus and a 44px minimum target.

## Playback, performance and fallback

The existing photo, `/images/yo/mandarin/cafe.webp`, remains the poster and background fallback. The layout reserves the media area before video loads. The player accepts the installed local video path; an unconfigured or unreviewed source keeps the photo instead of mounting a player for an arbitrary URL.

The video is muted, inline and looping, with `preload="none"`. Server markup omits its `src`. On the client, reduced-motion preferences, data saving, and reported `2g` or `slow-2g` connections suppress automatic source attachment and playback. An explicit Play action can opt into loading. Returning to manual Pause under those restrictions releases the source; do not promise that a later reload retains the former position.

Visibility and intersection changes pause ambient playback. A deliberate user pause must survive background/foreground and offscreen/onscreen transitions. Source cleanup releases the media on unmount, and stale play promises or late `playing` events must not restart a player that is no longer allowed to play.

An autoplay refusal keeps the photo and a usable explicit Play control. A codec or load failure returns to the photo and a translated accessible status, without a broken player control. The film stays on entrance/profile-entry surfaces; it does not run inside an active text room or Daily conversation and never requests a camera or microphone.

The 7.19 MB export preserves the approved 720p image and loop timing. Fast-start metadata permits progressive playback; `preload="none"` is not a promise of zero transfer once playback is requested. Do not add duplicate video downloads or an external provider fetch for the background.

## Native wrapper lifecycle contract

The web player consumes the wrapper's app lifecycle through these two browser-facing names:

| Contract | Required behavior |
| --- | --- |
| `window.__PRATIQO_APP_STATE__` | Current state: `active`, `inactive` or `background` |
| `pratiqo:app-state` window event | Notify the page after updating the state property |

The host must inject the current state when a document is initialized and keep it current through native lifecycle changes. Set the property **before** dispatching the event: the player reads the property, not an event-detail payload. Without an injected native state, ordinary document visibility still applies.

Both `inactive` and `background` are treated as hidden. Returning to `active` only permits playback when the document is also visible, the film is onscreen, user intent permits it and the motion/data policy is satisfied. An explicit or queued Play activation must not override a background/offscreen pause. Preserve a manual pause when the app returns to the foreground.

This is the lifecycle interface for ambient media. Its existence does not establish that a native build was installed, background behavior was tested on a real device, or a store release was approved. Record those results separately for iOS and Android.

The existing Expo wrapper implements this interface and a native Café tab in [draft PR #417](https://github.com/marcandretheberge-dotcom/Pratiqo/pull/417), commit `9636e0d180d774b9c2f82accf2bf69855cbc35a0`. Its TypeScript, wrapper contract and nine policy/lifecycle tests passed during this integration. The previously produced iPhone binary predates these changes; no new signed build or physical-device acceptance is implied.

## Validation and unchanged release gates

The binary has been probed for dimensions, frame count, pixel format, audio absence, duration, size, checksum and fast-start placement. Encoded-frame inspection confirms the retained Paris face, coffees and Eiffel Tower are readable; the captioned preview was separately inspected for script rendering and the wrap dissolve. Frame inspection and mocked React media tests do not prove real browser playback, mobile typography or physical-device lifecycle behavior.

Before declaring a hosted release accepted, record the exact deployed commit and inspect the real entry page in desktop and mobile browsers, including the narrow nested entry in FR/EN/ES. Verify start, pause, seek, resume, loop, loading refusal, load failure, reduced motion, data saving, hidden-document behavior and offscreen return. In the wrapper, test initial background state and background/foreground transitions while both playing and manually paused. Confirm the tower and both coffees remain visible, controls stay reachable and the caption strip does not clip. Verify actual normal-speed playback rather than relying only on screenshots.

Installing this entrance asset does **not** enable `CAFE_V1_ENABLED`, `CAFE_COMMUNITY_ENABLED` or `CAFE_ROOM_PROVIDER_ENABLED`, apply database migrations, change Daily credentials, activate a cleanup scheduler, or establish live-call readiness. Keep `CAFE_COMMUNITY_PREVIEW_ENABLED` off in production. The community deployment sequence, real-account acceptance, moderation/retention review, provider/device checks and teardown obligations remain governed by [Café community release and verification](cafe-community-rollout.md) and [Daily live validation](cafe-daily-live-validation.md).

Merge and deployment review, production feature activation and native-store release remain distinct steps. Do not describe an installed branch asset as a deployed or fully accepted production feature without the corresponding evidence.

## Historical generations

These records explain the earlier repair and remain separate from the approved installed asset:

- Snapshot `e50674ba-a32a-46cd-a382-5568120d5a9d`, **Original four café entrances — 4 storyboards and 2 clips**, preserves the original Montréal, Paris, Kyoto and Marrakech plan. Snapshot `2f057538-97b1-4347-b910-23038d672d40`, **Three-country journey before the seated Paris ending**, preserves the preceding rear-door ending.
- The [first seated-ending render](https://cdn.creativeclaw.co/u/3ce57a61/videos/501e0204-b8e0-4089-99a8-97240ff2b237.mp4), job `c8c7254f-c23e-4b93-93bf-8118cff051c3`, was 30.08 seconds at 1280×720/24 fps with audio. Snapshot `1622f7c5-2fb9-49d4-8fd6-71a5433236a8` preserves its review. Unnatural woman/table rotation around 24–26 seconds and the absent Eiffel Tower made it unsuitable for installation.
- The repair prepared [a corrected Paris endpoint](https://cdn.creativeclaw.co/u/3ce57a61/images/654623c0-9d9f-497e-b2b7-9ce9ae08635c.png), asset `0d74139d-650b-4cfb-bf7e-64708b77c56f`, and [a 19-second boundary reference](https://cdn.creativeclaw.co/u/3ce57a61/images/7487568e-c0be-4fb7-afc2-7da2057f4b22.jpg). The [19-second preserved prefix](https://cdn.creativeclaw.co/u/3ce57a61/videos/c9f03c54-db13-4760-8cdb-26329636d01e.mp4), asset `f7cebbc5-52e4-4aa3-aecd-fc950646c909`, was 456 frames at 1280×720/24 fps without audio.
- Historical shots `preserved-japan-marrakech` and `paris-eiffel-arrival` used an 11-second Seedance 2.5 Paris repair plan. Review request `d47c90c0-5a85-4ad5-82c6-0e4f03d7e9f3`, take `29e564f2-bbbc-4215-89d2-51d6b06cad1b`, and batch `e58cff03-f962-498b-a778-b8749c2ed2e0` belong to that earlier preparation. Their previously documented pending status is superseded by the approved assembled source identified above; they are not the current installation gate.
