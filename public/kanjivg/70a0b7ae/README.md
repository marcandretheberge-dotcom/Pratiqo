# KanjiVG source subset for YoPratiqo

These 40 original SVG files are from [KanjiVG](https://kanjivg.tagaini.net/), copyright Ulrich Apel, and are distributed under [Creative Commons Attribution–ShareAlike 3.0](https://creativecommons.org/licenses/by-sa/3.0/). The full upstream license is preserved in [COPYING.txt](./COPYING.txt).

Pinned upstream revision: `70a0b7ae0c18ceb5cb358274b029cce0234a43bc` in [KanjiVG/kanjivg](https://github.com/KanjiVG/kanjivg/tree/70a0b7ae0c18ceb5cb358274b029cce0234a43bc). Retrieved 2026-10-30.

## Derivation

- Original SVG source files are retained with their copyright headers.
- `strokes.json` extracts only each stroke's `d` attribute, unchanged and in numerical source order, from the 109 × 109 viewBox. The extracted geometry remains CC BY-SA 3.0.
- Extraction uses text matching and validates every path against SVG path-command characters. No XML parser, external DTD, entity resolution, script, or network evaluation is used.
- The studio renders these trusted path strings as React SVG paths. It does not inject SVG markup. Colors, numbered steps, ghost overlays and optional animation are presentation adaptations; geometry and stroke order are unchanged.
- Per-character canonical URLs and Git blob hashes are in `strokes.json`.
- Learning meanings, contextual words and memory prompts are authored for this course. Memory prompts are explicitly learning aids, not historical etymologies.
- Learner drawing stays in local component memory. The studio does not grade handwriting or infer mastery.

Characters: 人 名 日 本 語 一 二 三 四 五 上 下 中 右 左 食 飲 米 茶 円 月 火 水 木 金 家 友 学 生 先 出 入 口 電 車 読 書 行 来 見.
