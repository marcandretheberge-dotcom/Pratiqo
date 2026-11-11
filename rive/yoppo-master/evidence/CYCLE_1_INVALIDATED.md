# Freeze cycle 1 invalidated

Freeze commit: `65eebd83c5a9d83dc93086f6d648ec52c44b9a1d`.
Candidate at capture: `5dbca0b3`.
Iteration: `local-01`; two full-canvas captures consumed, retained in the budget.

The first actual Rive 1.9.2 capture produced an opaque `#1D1D1D` background,
despite the RML master having no background paint. Alpha is 255 across the
entire 1024 x 1024 canvas. Consequently the global silhouette centroid is
exactly (511.5, 511.5) and ground is 1023: these are canvas measurements, not
character measurements. The same opaque background also contaminates color
classification in translucent overlapping parts.

All cycle-1 comparison results are INVALID, not accepted as visual or
engineering evidence. The original files and logs remain available at
`.qa-guided/yoppo-pilot/renders/local-01/` for diagnosis.

No RML geometry correction was made. No threshold, ROI, canonical transform
or source PNG was changed. Further master iterations are stopped while the
required transparent capture is investigated with a separate 64 x 64 fixture.
No background color deletion, chroma keying or alpha reconstruction is allowed
to substitute for a genuine transparent Rive render.

If a supported fix is found, a new pre-render freeze and manifest are required;
iteration numbering restarts but the total capture budget does not reset.

## Additional independent label-palette defect

Inspection of the invalid diagnostic capture also exposed an ownership-ID
collision: an anti-aliased blend of the old head and left-ear diagnostic colors
could fall within two RGB units of the old left-eye ID. A mathematical test of
the palette, independent of Yoppo's geometry, reproduces that collision.

Before another master capture, replace only the diagnostic IDs with distinct
points on a color-space sphere. Exhaustively test all 8-bit pairwise blends in
encoded sRGB and linear-light space against the unchanged decoding tolerance.
This changes neither the actual master palette nor any acceptance threshold.
The corrected palette requires a new freeze; cycle 1 remains invalid.
