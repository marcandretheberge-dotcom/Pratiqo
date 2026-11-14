# Café review bundle

Build the approved entrance and community review using the repository's actual
`CafeHeroMedia`, `CafeCommunityApp` and `createCommunityDemoTransport` through the
existing `CafeCommunityDemo`. No production UI is recreated in this directory.

```bash
node scripts/cafe-preview/build.mjs
```

For an explicitly requested Vercel **preview** build, add `--vercel`:

```bash
node scripts/cafe-preview/build.mjs --vercel
```

This also creates a fresh `.vercel/output/static/` and Build Output API version 3
`config.json`, containing only this static review and the same response policies.
It replaces the generated `.vercel/output/` directory, so do not run it concurrently
with a different build targeting that directory. The repository's root
`vercel.json`, production configuration, functions and feature gates are not
edited. For a Git preview deployment, use this build command with the deployment's
framework set to `null`. The source SHA comes from the validated public
`VERCEL_GIT_COMMIT_SHA` value when Git metadata is unavailable in the builder.

The static result is written to `artifacts/cafe-preview/`. This generated directory
belongs in the local git exclude; source changes remain in this script directory.
The builder uses the installed esbuild dependency, the real CSS modules, Tailwind's
installed preflight, the local Inter font, the poster and the checksum-verified
approved MP4. It copies only those selected assets. No environment file or secrets
are read, copied or bundled.

## Routes

- `/` and `/cafe`: start with the onboarding entrance and approved film.
- `/cafe/preview/communaute`: starts with the existing synthetic lobby, compatible
  with `scripts/cafe-community-browser.ts`.
- `/review`: a preview-only reviewer with 320px, 375px and 1280px iframe widths,
  showing the exact `/cafe` or lobby page. This changes the actual inner viewport
  without changing the product's components. The direct Café entry has no iframe.
- `?lang=fr`, `?lang=en`, `?lang=es`: optional initial interface locale. The chooser
  retains the existing `pratiqo-locale` local preference.
- Pratiqo and YoPratiqo links open their actual production HTTPS destinations.

The visible demonstration banner is preserved in every state. Profiles, people,
presence, rooms, text messages, block and report interactions are local fixtures;
reloading discards them. Calls remain disabled. No account is created and no real
community API, authentication service or Daily connection is initialized.

`vercel.json` supplies static clean routes, `noindex`, denied camera/microphone/
screen capture permissions, and a CSP that permits the local script, CSS, font,
poster and video while denying API connections and form submissions. Frames and
frame ancestors are restricted to the same preview origin for the review page;
no external frame or media provider is allowed.
There is also an HTML CSP and robots metadata. HTTP-only policies require a server
that actually applies the generated headers; a plain file server is not evidence
that those response policies work on the eventual preview host.

`preview-build.json` records the source commit, source hashes and output hashes.
The manifest identifies this as a static review. Browser playback of the real
MP4, synthetic interactions and native app/device acceptance are separate checks.
This bundle does not run Next middleware, server rendering, the production auth
flow or the database. Its publication is never production activation.
