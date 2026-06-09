# Companion Bridge Asset Plan

## Purpose

This document defines the launch-safe asset plan for the YoPratiqo companion as it becomes part of the consent-based bridge between YoPratiqo learning and Pratiqo teacher lessons.

## Official Style Reference

The companion from the current YoPratiqo advertisement is the official style reference for tone, proportions, warmth, and brand fit.

Important production rule: do not crop the production companion asset from a poster, ad, or flattened mockup. The production app needs clean source exports created from the companion artwork itself.

## Required Asset States

Create transparent PNG exports for these states first:

- idle
- map
- confused
- celebrating
- teacher-ready
- level-up
- inactive
- badge-unlocked

## File Naming

Use stable, React Native-compatible names:

- `companion-forest-idle.png`
- `companion-forest-map.png`
- `companion-forest-confused.png`
- `companion-forest-celebrating.png`
- `companion-forest-teacher-ready.png`
- `companion-forest-level-up.png`
- `companion-forest-inactive.png`
- `companion-forest-badge-unlocked.png`

When multiple companion families exist, replace `forest` with the canonical family id from the companion domain model.

## Export Requirements

- PNG with transparent background for launch.
- Square source canvas, preferably `1024x1024`.
- Downstream app can derive `512x512`, `256x256`, and `128x128`.
- No text baked into companion images.
- No UI badges, labels, or progress numbers baked into the bitmap.
- No private student information embedded in assets or filenames.

## Accessibility

Every rendered companion image needs alt text from UI code, not baked into the image.

Recommended alt-text pattern:

- FR: `Compagnon YoPratiqo, état : prêt pour le professeur`
- EN: `YoPratiqo companion, state: teacher-ready`
- ES: `Compañero YoPratiqo, estado: listo para el profesor`

Decorative repeats may use empty alt text only when the same information is already available nearby in text.

## Animation Path

Launch path:

- transparent PNGs
- CSS/React transitions only where appropriate
- no runtime dependency on heavy animation libraries

Future path:

- Rive or Lottie for subtle state transitions
- keep PNG fallback for low-power mobile devices and React Native compatibility
- animation files must use the same state ids as the PNG naming convention

## React Native Compatibility

Assets must work in a future standalone React Native YoPratiqo app:

- portable filenames
- no web-only CSS assumptions
- transparent background
- predictable square canvas
- no text embedded in images
- state ids aligned with the shared companion domain model

## Bridge Usage

The `teacher-ready` state should be reserved for moments where the learner chooses to connect YoPratiqo progress to a real teacher. It must not imply automatic sharing. The UI copy around the asset must make consent explicit.
