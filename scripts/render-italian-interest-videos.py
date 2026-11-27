#!/usr/bin/env python3
"""Render six original Italian U1 teaching diagrams with approved local narration.

This script never contacts a media provider. It reads already-produced WAV files,
their word timings in an explicit manifest, and the authored lesson export.
Run it only after the narration voice has been chosen. Until then, preparing this
source file does not render or publish any media.

Usage:
  python scripts/render-italian-interest-videos.py \\
    --source-dir /tmp/pratiqo-interest-media/violetta \\
    --manifest /tmp/pratiqo-interest-media/violetta-results.json \\
    --lessons /tmp/pratiqo-interest-media/lessons.json

Pillow and ffmpeg/ffprobe are the only dependencies. All illustrations are drawn
here; there are no external photographs, image downloads, or archive claims.
"""

from __future__ import annotations

import argparse
import json
import math
import re
import subprocess
import unicodedata
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
WIDTH, HEIGHT, SCALE, FPS = 960, 540, 2, 12
BACKGROUND = "#f6f3e9"
INK = "#163e36"
MUTED = "#5e756b"
WHITE = "#ffffff"
PALE = "#e7ece0"
FONT_DIR = Path("/usr/share/fonts/truetype/noto")
SELECTED_VOICE_ID = "gfKKsLN1k0oYYN9n2dXX"
THEMES = {
    "music": {"label": "MUSICA", "title": "Le mani dietro la musica", "accent": "#bd6638", "soft": "#f5ddc7"},
    "art": {"label": "ARTE", "title": "Arco: una forma, una funzione", "accent": "#7561a8", "soft": "#e5dff3"},
    "history": {"label": "STORIA", "title": "Il Colosseo: luogo e funzione", "accent": "#a37727", "soft": "#f1e3bc"},
    "sport": {"label": "SPORT", "title": "Roma 1960: sport e monumenti", "accent": "#327ca2", "soft": "#d9ebf4"},
    "food": {"label": "CUCINA", "title": "La pizza è anche un mestiere", "accent": "#b8533d", "soft": "#f5ded2"},
    "nature": {"label": "NATURA", "title": "Lo stambecco e il suo parco", "accent": "#39816a", "soft": "#dcebe2"},
}


def point(x: float, y: float) -> tuple[int, int]:
    return round(x * SCALE), round(y * SCALE)


def box(values: tuple[float, float, float, float]) -> tuple[int, int, int, int]:
    return tuple(round(v * SCALE) for v in values)


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    filename = "NotoSans-Bold.ttf" if bold else "NotoSans-Regular.ttf"
    return ImageFont.truetype(str(FONT_DIR / filename), size * SCALE)


class Canvas:
    def __init__(self, theme: str):
        self.theme = theme
        self.config = THEMES[theme]
        self.accent = self.config["accent"]
        self.soft = self.config["soft"]
        self.image = Image.new("RGB", (WIDTH * SCALE, HEIGHT * SCALE), BACKGROUND)
        self.draw = ImageDraw.Draw(self.image)

    def line(self, coords, color=INK, width=3):
        self.draw.line([point(x, y) for x, y in coords], fill=color, width=round(width * SCALE), joint="curve")

    def ellipse(self, coords, fill, outline=None, width=2):
        self.draw.ellipse(box(coords), fill=fill, outline=outline, width=round(width * SCALE))

    def rect(self, coords, fill, radius=0, outline=None, width=2):
        if radius:
            self.draw.rounded_rectangle(box(coords), radius=round(radius * SCALE), fill=fill, outline=outline, width=round(width * SCALE))
        else:
            self.draw.rectangle(box(coords), fill=fill, outline=outline, width=round(width * SCALE))

    def polygon(self, coords, fill, outline=None):
        self.draw.polygon([point(x, y) for x, y in coords], fill=fill, outline=outline)

    def text(self, xy, value, size=26, bold=False, color=INK, anchor="lt"):
        self.draw.text(point(*xy), value, font=font(size, bold), fill=color, anchor=anchor)

    def label(self, xy, value, active=False, width=220):
        x, y = xy
        self.rect((x - width / 2, y, x + width / 2, y + 44), self.accent if active else WHITE, radius=14)
        size = 30
        while self.draw.textlength(value, font=font(size, True)) > (width - 20) * SCALE:
            size -= 1
        self.text((x, y + 6), value, size=size, bold=True, color=WHITE if active else INK, anchor="mt")

    def header(self):
        self.rect((28, 22, 168, 55), self.soft, radius=10)
        self.text((98, 27), self.config["label"], size=18, bold=True, color=self.accent, anchor="mt")
        self.text((930, 29), "ITALIANO · UNITÀ 1", size=17, color=MUTED, anchor="rt")
        self.text((30, 70), self.config["title"], size=34, bold=True)
        self.line([(30, 416), (930, 416)], "#d8e0d6", 1)
        # Leave the lower part clear for the browser's Italian closed captions.
        self.text((30, 510), "Illustrazione didattica originale", size=15, color=MUTED)

    def arrow(self, start, end, active=False):
        x1, y1 = start
        x2, y2 = end
        color = self.accent if active else "#aab9ad"
        self.line([(x1, y1), (x2, y2)], color, 5)
        angle = math.atan2(y2 - y1, x2 - x1)
        length = 13
        self.polygon([(x2, y2), (x2 - length * math.cos(angle - .5), y2 - length * math.sin(angle - .5)), (x2 - length * math.cos(angle + .5), y2 - length * math.sin(angle + .5))], color)

    def finish(self):
        return self.image.resize((WIDTH, HEIGHT), Image.Resampling.LANCZOS)


def person(c: Canvas, x: int, y: int, scale=1, color=INK, arms="work"):
    s = scale
    c.ellipse((x - 15*s, y - 70*s, x + 15*s, y - 40*s), color)
    c.line([(x, y-35*s), (x, y+15*s)], color, 10*s)
    c.line([(x, y+15*s), (x-20*s, y+53*s)], color, 8*s)
    c.line([(x, y+15*s), (x+20*s, y+53*s)], color, 8*s)
    if arms == "raised":
        c.line([(x-43*s, y-70*s), (x, y-22*s), (x+43*s, y-70*s)], color, 8*s)
    elif arms == "music":
        c.line([(x, y-20*s), (x+37*s, y-37*s)], color, 8*s)
        c.line([(x, y-20*s), (x-27*s, y+2*s), (x+27*s, y-12*s)], color, 8*s)
    else:
        c.line([(x, y-20*s), (x-27*s, y+8*s), (x+20*s, y+8*s)], color, 8*s)
        c.line([(x, y-20*s), (x+34*s, y+8*s)], color, 8*s)


def violin(c: Canvas, x: int, y: int, scale=1, color=None):
    color = color or c.accent
    s = scale
    c.ellipse((x-27*s, y-20*s, x+27*s, y+40*s), color)
    c.ellipse((x-34*s, y+17*s, x+34*s, y+87*s), color)
    c.ellipse((x-40*s, y+15*s, x-16*s, y+42*s), BACKGROUND)
    c.ellipse((x+16*s, y+15*s, x+40*s, y+42*s), BACKGROUND)
    c.rect((x-7*s, y-65*s, x+7*s, y+50*s), INK, radius=4*s)
    c.ellipse((x-10*s, y-81*s, x+10*s, y-60*s), INK)
    c.line([(x, y-62*s), (x, y+70*s)], "#f9e7c5", 2*s)
    c.line([(x-14*s, y+49*s), (x+14*s, y+49*s)], "#f9e7c5", 3*s)


def draw_music(c: Canvas, stage: int):
    centers = [170, 480, 790]
    for i, x in enumerate(centers):
        active = (stage <= 1 and i == (0 if stage == 0 else 1)) or (stage >= 2 and i >= 1)
        c.ellipse((x-100, 139, x+100, 335), c.soft if active else WHITE)
    # Visible grain distinguishes the material from a generic box.
    c.rect((112, 202, 226, 283), "#d6a878", radius=9)
    for offset in [0, 20, 42]:
        c.line([(123, 215+offset), (151, 207+offset), (185, 220+offset), (215, 211+offset)], "#9d6d49", 3)
    c.ellipse((158, 232, 184, 247), None, "#9d6d49", 2)
    if stage < 2:
        person(c, 464, 238, .82, arms="work")
        c.rect((423, 259, 547, 274), "#a77750", radius=4)
        c.line([(433, 274), (433, 310)], INK, 5)
        c.line([(537, 274), (537, 310)], INK, 5)
        violin(c, 512, 247, .33)
    else:
        person(c, 462, 240, .85, arms="work")
        violin(c, 520, 245, .4)
    violin(c, 790, 223, .8)
    if stage >= 2:
        c.line([(852, 207), (863, 217), (863, 239), (852, 249)], c.accent, 4)
        c.line([(866, 195), (881, 212), (881, 244), (866, 262)], c.accent, 4)
    c.arrow((284, 235), (359, 235), stage <= 1)
    c.arrow((594, 235), (669, 235), stage >= 1)
    c.label((170, 353), "il legno", stage == 0)
    c.label((480, 353), "il liutaio", stage in [1, 3])
    c.label((790, 353), "il violino", stage == 2)
    if stage == 3:
        c.label((480, 118), "costruisce", True, 190)
        c.label((790, 118), "il musicista suona", True, 255)


def curve(c: Canvas, pts, color, width):
    # Cubic Bezier approximation keeps the teaching diagrams self-contained.
    p0, p1, p2, p3 = pts
    samples = []
    for n in range(61):
        u = n / 60
        v = 1-u
        samples.append((v**3*p0[0] + 3*v*v*u*p1[0] + 3*v*u*u*p2[0] + u**3*p3[0], v**3*p0[1] + 3*v*v*u*p1[1] + 3*v*u*u*p2[1] + u**3*p3[1]))
    c.line(samples, color, width)


def draw_art(c: Canvas, stage: int):
    c.rect((65, 130, 895, 346), WHITE, radius=22)
    c.line([(90, 148), (870, 148)], "#d0d9d0", 2)
    c.line([(90, 339), (870, 339)], "#9bb0a1", 3)
    if stage >= 1:
        c.polygon([(430, 205), (310, 295), (570, 295)], "#fae6b8")
    c.rect((260, 287, 615, 302), "#b88c62", radius=5)
    c.line([(285, 304), (285, 337)], INK, 7)
    c.line([(589, 304), (589, 337)], INK, 7)
    c.rect((751, 279, 803, 338), "#e6e7e0", radius=3, outline="#798d85")
    c.line([(760, 284), (792, 323)], "#c2c8bf", 1)
    curve(c, [(777, 287), (809, 113), (498, 96), (430, 188)], INK, 6)
    c.ellipse((393, 177, 469, 208), c.accent)
    c.rect((391, 194, 471, 208), c.accent, radius=4)
    if stage >= 2:
        c.label((777, 211), "Arco", True, 145)
        c.arrow((750, 256), (767, 278), True)
    c.label((230, 354), "il tavolo", stage == 1, 235)
    c.label((492, 354), "la luce", stage in [1, 3], 220)
    c.label((755, 354), "la lampada", stage in [0, 2], 235)
    if stage == 3:
        c.text((135, 169), "senza fissaggi", 24, True, c.accent)
        c.text((135, 200), "al soffitto", 24, True, c.accent)


def colosseum(c: Canvas, stage: int):
    x1, y1, x2, y2 = 225, 165, 740, 330
    c.ellipse((x1, 257, x2, 362), "#ded0b5")
    c.rect((x1, 213, x2, 310), "#d4ba8e")
    c.ellipse((x1, y1, x2, 273), "#e4d3b2", outline="#b99b6a", width=3)
    c.ellipse((292, 190, 673, 251), "#b99566")
    c.ellipse((326, 203, 638, 238), "#d5bc91")
    for row in [249, 294]:
        for i in range(10):
            x = 247 + i*47
            c.rect((x, row, x+24, row+26), "#816b4f", radius=11)
            c.rect((x, row+14, x+24, row+27), "#816b4f")
    c.line([(227, 284), (738, 284)], "#b39669", 4)
    if stage == 1:
        person(c, 447, 215, .25, color=INK, arms="raised")
        person(c, 519, 215, .25, color=INK, arms="raised")
        c.ellipse((442, 214, 453, 227), c.accent)
        c.ellipse((511, 214, 523, 227), c.accent)
    if stage >= 2:
        person(c, 179, 306, .49, color=c.accent)
        person(c, 789, 308, .46, color=c.accent)
    c.label((220, 364), "Roma", stage == 0, 150)
    c.label((477, 364), "l’anfiteatro", stage in [0, 1], 260)
    c.label((756, 364), "il monumento", stage >= 2, 260)
    if stage == 1:
        c.label((480, 119), "spettacoli nell’antichità", True, 340)
    elif stage >= 2:
        c.label((480, 119), "oggi: un monumento", True, 340)


def draw_sport(c: Canvas, stage: int):
    c.rect((82, 153, 880, 343), "#e9e0cb", radius=20)
    c.line([(105, 330), (855, 330)], "#a6997d", 4)
    for x, h in [(147, 143), (290, 185), (433, 154), (576, 174), (719, 140)]:
        c.rect((x, 330-h, x+110, 330), "#c4aa80", radius=10)
        c.rect((x+24, 345-h, x+86, 330), BACKGROUND, radius=30)
        c.rect((x+24, 307, x+86, 330), BACKGROUND)
    c.rect((302, 312, 638, 326), c.accent, radius=5)
    person(c, 468, 255, .90, color=INK, arms="raised")
    if stage >= 1:
        c.line([(412, 315), (523, 315)], WHITE, 3)
    c.label((223, 357), "Roma · 1960", stage == 0, 235)
    c.label((510, 357), "la ginnastica", stage == 1, 265)
    c.label((790, 357), "la gara", stage >= 2, 190)
    c.label((488, 117), "Terme di Caracalla", stage >= 1, 330)


def draw_food(c: Canvas, stage: int):
    for index, x in enumerate([170, 480, 790]):
        c.ellipse((x-105, 143, x+105, 339), c.soft if index == min(stage, 2) else WHITE)
    c.ellipse((103, 250, 237, 291), "#d1ad7c")
    c.ellipse((116, 223, 224, 281), "#f0d4a2", outline="#c29a67")
    for x, y in [(102, 289), (228, 294), (111, 214), (231, 235)]:
        c.ellipse((x-3, y-3, x+3, y+3), "#cfb991")
    c.rect((404, 271, 555, 284), "#a77d52", radius=5)
    c.ellipse((442, 239, 519, 272), "#f0d4a2", outline="#b99468")
    c.polygon([(415, 171), (443, 166), (478, 226), (459, 250), (440, 233)], INK)
    c.polygon([(542, 172), (515, 166), (485, 225), (503, 248), (522, 231)], c.accent)
    for x in [451, 458, 465]:
        c.line([(x, 227), (x+6, 245)], "#e9d9c0", 2)
    person(c, 748, 246, .62, color=INK, arms="work")
    person(c, 829, 246, .62, color=c.accent, arms="work")
    c.line([(774, 213), (798, 213)], c.accent, 3)
    c.arrow((284, 241), (361, 241), stage >= 1)
    c.arrow((597, 241), (671, 241), stage >= 2)
    c.label((170, 357), "l’impasto", stage == 0)
    c.label((480, 357), "i gesti", stage in [1, 2])
    c.label((790, 357), "la tradizione", stage == 3, 255)
    if stage == 3:
        c.label((480, 118), "da una persona all’altra", True, 350)


def ibex(c: Canvas, x: int, y: int, scale=1, color=INK):
    s = scale
    coords = [(x-72*s,y-19*s),(x-44*s,y-43*s),(x+15*s,y-39*s),(x+42*s,y-81*s),(x+63*s,y-83*s),(x+74*s,y-65*s),(x+57*s,y-50*s),(x+36*s,y-3*s),(x+28*s,y+42*s),(x+13*s,y+42*s),(x+12*s,y+4*s),(x-30*s,y+3*s),(x-46*s,y+44*s),(x-62*s,y+44*s),(x-53*s,y-5*s)]
    c.polygon(coords, color)
    c.line([(x-69*s,y-23*s),(x-87*s,y-39*s)], color, 7*s)
    curve(c, [(x+56*s,y-80*s),(x+100*s,y-145*s),(x+8*s,y-158*s),(x+10*s,y-91*s)], color, 9*s)
    c.ellipse((x+61*s,y-76*s,x+65*s,y-72*s), WHITE)


def draw_nature(c: Canvas, stage: int):
    c.rect((70, 132, 890, 346), "#e9f0e9", radius=20)
    c.polygon([(92,337),(270,145),(433,337)], "#b7ccbf")
    c.polygon([(285,337),(506,146),(718,337)], "#a0bbae")
    c.polygon([(543,337),(741,182),(873,337)], "#c3d4c9")
    c.polygon([(226,192),(270,145),(312,194),(280,185),(263,198),(251,182)], WHITE)
    c.polygon([(460,185),(506,146),(550,186),(518,180),(504,197),(487,180)], WHITE)
    c.polygon([(369,337),(419,298),(537,286),(597,337)], "#839f90")
    if stage == 2:
        c.ellipse((390,155,631,365), None, c.accent, 5)
    ibex(c, 502, 286, .92)
    c.label((215, 357), "le Alpi", stage == 1, 200)
    c.label((480, 357), "lo stambecco", stage in [0, 3], 260)
    c.label((765, 357), "la protezione", stage == 2, 270)
    if stage == 3:
        c.label((479, 117), "Parco Nazionale Gran Paradiso", True, 505)


DRAWERS = {"music": draw_music, "art": draw_art, "history": colosseum, "sport": draw_sport, "food": draw_food, "nature": draw_nature}


def normalise(text: str) -> str:
    return re.sub(r"[^\w]+", "", unicodedata.normalize("NFC", text).lower())


def start_of_phrase(words: list[dict], phrase: str, fallback: float) -> float:
    wanted = [normalise(word) for word in phrase.split()]
    actual = [normalise(word["text"]) for word in words]
    for index in range(len(actual) - len(wanted) + 1):
        if actual[index:index+len(wanted)] == wanted:
            return max(0.0, float(words[index]["startSeconds"]))
    return fallback


def scene_times(theme: str, words: list[dict], duration: float) -> list[float]:
    phrases = {
        "music": ["Il legno", "Il musicista", "Sono due"],
        "art": ["La sua forma", "Un oggetto", "Il design"],
        "history": ["Nell’antica Roma", "Oggi", "Il nome"],
        "sport": ["La ginnastica", "Lo stadio", "La data"],
        "food": ["A Napoli", "Le persone", "Questa tradizione"],
        "nature": ["È un animale", "La storia", "Stambecco è il nome"],
    }
    result = [0.0]
    for index, phrase in enumerate(phrases[theme], start=1):
        result.append(start_of_phrase(words, phrase, duration * index / 4))
    if result != sorted(result):
        raise ValueError(f"Non-monotonic semantic timing for {theme}: {result}")
    return result


def timecode(seconds: float) -> str:
    ms = max(0, round(seconds * 1000))
    hours, ms = divmod(ms, 3600000)
    minutes, ms = divmod(ms, 60000)
    whole_seconds, ms = divmod(ms, 1000)
    return f"{hours:02d}:{minutes:02d}:{whole_seconds:02d}.{ms:03d}"


def caption_lines(words: list[str], max_chars=35) -> str:
    lines, current = [], ""
    for word in words:
        next_line = f"{current} {word}".strip()
        if len(next_line) > max_chars and current:
            lines.append(current)
            current = word
        else:
            current = next_line
    if current:
        lines.append(current)
    return "\n".join(lines)


def write_captions(path: Path, words: list[dict], duration: float):
    groups, current = [], []
    for word in words:
        proposal = current + [word]
        if current and (len(" ".join(item["text"] for item in proposal)) > 63 or len(proposal) > 10 or len(caption_lines([item["text"] for item in proposal]).splitlines()) > 2):
            groups.append(current)
            current = []
        current.append(word)
        if re.search(r"[.!?;:]$", word["text"]):
            groups.append(current)
            current = []
    if current:
        groups.append(current)
    lines = ["WEBVTT", "", "NOTE Original Italian teaching narration. Factual sources are linked in the lesson.", ""]
    for index, group in enumerate(groups):
        start = max(0.0, float(group[0]["startSeconds"]) - .04)
        next_start = float(groups[index+1][0]["startSeconds"]) - .05 if index+1 < len(groups) else duration
        end = min(next_start, float(group[-1]["endSeconds"]) + .22, duration)
        if end <= start:
            raise ValueError(f"Invalid caption duration in {path.name}")
        lines.extend([str(index+1), f"{timecode(start)} --> {timecode(end)}", caption_lines([word["text"] for word in group]), ""])
    path.write_text("\n".join(lines), encoding="utf-8")


def probe_duration(wav: Path) -> float:
    result = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", str(wav)], capture_output=True, text=True, check=True)
    return float(result.stdout.strip())


def render_video(theme: str, item: dict, wav: Path, output: Path) -> dict:
    words = item.get("wordTimings") or []
    if not words:
        raise ValueError(f"Word timings are required for {item['id']}")
    # The approved voice speaks the written date as a number. Keep the authored
    # "1960" in captions while retaining its actual spoken start/end timestamps.
    words = [{**word, "text": re.sub(r"\bmillenovecentosessanta\b", "1960", word["text"], flags=re.IGNORECASE)} for word in words]
    if normalise(" ".join(word["text"] for word in words)) != normalise(item["text"]):
        raise ValueError(f"Word timings do not reproduce the authored narration for {item['id']}")
    duration = probe_duration(wav)
    starts = scene_times(theme, words, duration)
    frames = []
    for stage in range(4):
        canvas = Canvas(theme)
        canvas.header()
        DRAWERS[theme](canvas, stage)
        frames.append(canvas.finish())
    stem = item["lessonId"]
    poster = output / f"{stem}.webp"
    mp4 = output / f"{stem}.mp4"
    vtt = output / f"{stem}.it.vtt"
    frames[1].save(poster, "WEBP", quality=88, method=6)
    write_captions(vtt, words, duration)
    command = ["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-f", "rawvideo", "-vcodec", "rawvideo", "-pixel_format", "rgb24", "-video_size", f"{WIDTH}x{HEIGHT}", "-framerate", str(FPS), "-i", "pipe:0", "-i", str(wav), "-map", "0:v:0", "-map", "1:a:0", "-c:v", "libx264", "-preset", "medium", "-tune", "animation", "-crf", "29", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "48k", "-ac", "1", "-movflags", "+faststart", "-shortest", "-metadata", "comment=Original educational illustration; synthetic Italian narration; primary sources in the lesson.", str(mp4)]
    process = subprocess.Popen(command, stdin=subprocess.PIPE, stderr=subprocess.PIPE)
    try:
        for frame_number in range(math.ceil(duration * FPS)):
            second = frame_number / FPS
            stage = max(i for i, start in enumerate(starts) if second >= start)
            frame = frames[stage]
            # Transitions follow spoken concepts; diagrams change as those concepts appear.
            if stage > 0 and second - starts[stage] < .28:
                frame = Image.blend(frames[stage-1], frame, max(0.0, (second - starts[stage]) / .28))
            frame = frame.copy()
            draw = ImageDraw.Draw(frame)
            draw.rounded_rectangle((30, 497, 930, 500), radius=2, fill="#d8e0d6")
            draw.rounded_rectangle((30, 497, 30 + 900 * min(1, second/duration), 500), radius=2, fill=THEMES[theme]["accent"])
            process.stdin.write(frame.tobytes())
        process.stdin.close()
        stderr = process.stderr.read().decode("utf-8", errors="replace")
        status = process.wait()
        if status:
            raise RuntimeError(f"ffmpeg failed for {theme}: {stderr}")
    except Exception:
        process.kill()
        process.wait()
        mp4.unlink(missing_ok=True)
        raise
    return {"lessonId": stem, "duration": round(duration, 3), "bytes": mp4.stat().st_size, "src": f"/video/yo/italian-interests/v1/{mp4.name}", "captions": f"/video/yo/italian-interests/v1/{vtt.name}", "poster": f"/video/yo/italian-interests/v1/{poster.name}"}


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--source-dir", type=Path, required=True)
    parser.add_argument("--manifest", type=Path, required=True)
    parser.add_argument("--lessons", type=Path, required=True)
    parser.add_argument("--output-dir", type=Path, default=ROOT / "public/video/yo/italian-interests/v1")
    args = parser.parse_args()
    manifest = json.loads(args.manifest.read_text(encoding="utf-8"))
    entries = manifest if isinstance(manifest, list) else manifest["segments"]
    manifest_voice = manifest.get("voiceId") if isinstance(manifest, dict) else None
    lessons = {lesson["id"]: lesson for lesson in json.loads(args.lessons.read_text(encoding="utf-8"))}
    by_id = {entry["id"]: entry for entry in entries}
    pending = []
    for theme in THEMES:
        lesson_id = f"it-interest-v1-u01-{theme}-l1"
        identifier = f"{lesson_id}-discovery"
        wav = args.source_dir / f"{identifier}.wav"
        if identifier not in by_id or not wav.is_file():
            raise FileNotFoundError(f"Missing approved local narration or metadata: {identifier}")
        entry = by_id[identifier]
        if entry.get("voiceId", manifest_voice) != SELECTED_VOICE_ID:
            raise ValueError(f"Narration is not identified as the selected Violetta voice: {identifier}")
        if entry["text"] != lessons[lesson_id]["reading"]["it"]:
            raise ValueError(f"Narration does not match the authored first reading: {identifier}")
        pending.append((theme, entry, wav))
    # Validate all six inputs before creating any output files.
    args.output_dir.mkdir(parents=True, exist_ok=True)
    delivered = []
    for theme, entry, wav in pending:
        result = render_video(theme, entry, wav, args.output_dir)
        delivered.append(result)
        print(json.dumps(result, ensure_ascii=False), flush=True)
    registry = ROOT / "lib/yo/italian/interests/media.ts"
    content = ["/** Original illustrated videos using the exact authored first-lesson readings. */", "export interface ItalianInterestVideo { src: string; captions: string; poster: string }", "const videos: Readonly<Record<string, ItalianInterestVideo>> = {"]
    for item in delivered:
        values = {key: item[key] for key in ["src", "captions", "poster"]}
        content.append(f"  {json.dumps(item['lessonId'])}: {json.dumps(values)},")
    content.extend(["};", "export function italianInterestVideo(lessonId: string): ItalianInterestVideo | undefined {", "  return Object.hasOwn(videos, lessonId) ? videos[lessonId] : undefined;", "}", ""])
    registry.write_text("\n".join(content), encoding="utf-8")


if __name__ == "__main__":
    main()
