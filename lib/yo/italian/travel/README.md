# Italian geographic journey

Preview-only navigator for the real Italian course. Not a new entitlement or
learning ledger. No application route activates it by default.

## Geography

- Coastline: Natural Earth, Admin 0 Countries, 1:50m, Italy geometry only.
- Source: https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_50m_admin_0_countries.geojson
- Retrieved 2026-11-12. Public domain:
  https://www.naturalearthdata.com/about/terms-of-use/
- City coordinates are approximate public city centres (WGS84), not street
  addresses or destinations for driving navigation.
- The same regional equirectangular transform places coastlines, city pins and
  journey paths. The path connects course units in their existing order. It is
  explicitly not a road itinerary.

## Access and rewards

projectItalianWorlds(buildCourseJourney(...)) remains authoritative.
Florence is u06; Siena is u07; Rome is u11. Culture trivia and the scooter never
unlock Rome or any other unit. A beginner starts in Bologna.

The cosmetic scooter reuses canPlayItalianTrivia(u06, progress): every activity
of the first two Florence lessons must be completed, or its existing final must
have passed independently. It neither substitutes for that final nor creates
mastery, credits, purchases or Passes.

No cosmetic-equipment inventory exists in the course engine. The prototype
therefore stores only an equipment preference and UI bookmarks, not a second
reward balance. Eligibility is recomputed from canonical evidence on each
render, so a reset cannot retain unearned equipment.

## Culture

Only two factual claims are added:

- Ponte Vecchio crosses the Arno:
  https://www.visittuscany.com/en/attractions/ponte-vecchio/
- Florence's historic centre has been on UNESCO's World Heritage List since 1982:
  https://whc.unesco.org/en/list/174/

These facts are displayed before the optional cultural question and remain
available during it. Directions and audio come verbatim from u06 lesson 3.
The full three-lesson unit and its final assessment remain unchanged.

## Artwork

MapYoppo.tsx is unchanged. Pose changes articulate its existing groups; the
scooter is a separate SVG accessory. No approved PNG, travel film or Rive pilot
file is modified.

No approved boarding/flight/riding movie exists in the repository. Boarding and
flight use a short procedural transition with the approved vector and a Lucide
plane, not an invented approved film. The approved Italian taxi clip remains in
its existing u08 context, unchanged.
