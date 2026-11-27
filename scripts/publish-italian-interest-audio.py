"""Package already generated, approved-voice audio. Never calls a speech provider.

Usage: python scripts/publish-italian-interest-audio.py /path/to/violetta/batches.json
Word timings must match every original spoken segment before any clip is published.
"""
import concurrent.futures
import hashlib
import json
from pathlib import Path
import subprocess
import sys
import unicodedata
import urllib.request

VOICE = "gfKKsLN1k0oYYN9n2dXX"
MODEL = "speech/elevenlabs-v4"
REPO = Path(__file__).resolve().parents[1]


def normalized(text):
    return "".join(c for c in unicodedata.normalize("NFC", text).lower() if c.isalnum())


def run(args):
    subprocess.run(args, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)


def package(batch, directory):
    source = directory / ("source-" + batch["interest"] + "-" + batch["jobId"] + ".mp3")
    if not source.exists():
        with urllib.request.urlopen(batch["url"], timeout=45) as response:
            source.write_bytes(response.read())
    source_hash = hashlib.sha256(source.read_bytes()).hexdigest()
    words = batch["wordTimings"]
    joined, offsets = "", []
    for word in words:
        part = normalized(word["text"])
        offsets.append((len(joined), len(joined) + len(part)))
        joined += part
    cursor, delivered = 0, []
    output = REPO / "public/audio/yo/italian-interests/v1"
    output.mkdir(parents=True, exist_ok=True)
    for segment in batch["segments"]:
        expected = normalized(segment["spokenText"])
        start = joined.find(expected, cursor)
        if start < 0:
            raise ValueError("Word timings do not contain exact segment " + segment["id"])
        finish = start + len(expected)
        indexes = [i for i, (left, right) in enumerate(offsets) if left < finish and right > start]
        if not indexes:
            raise ValueError("No timed words for " + segment["id"])
        first, last = indexes[0], indexes[-1]
        clip_start = max(0, words[first]["startSeconds"] - 0.10)
        clip_end = words[last]["endSeconds"] + 0.15
        if last + 1 < len(words):
            clip_end = min(clip_end, words[last + 1]["startSeconds"] - 0.025)
        if clip_end <= clip_start:
            raise ValueError("Invalid segment timing")
        wav = directory / (segment["id"] + ".wav")
        mp3 = directory / (segment["id"] + ".mp3")
        run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(source), "-ss", str(clip_start),
             "-t", str(clip_end - clip_start), "-ar", "44100", "-ac", "1", "-c:a", "pcm_s16le", str(wav)])
        run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(wav), "-c:a", "libmp3lame", "-q:a", "3", str(mp3)])
        data = mp3.read_bytes()
        digest = hashlib.sha256(data).hexdigest()
        duration = float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", str(mp3)]))
        if len(data) < 1000 or not 0.4 <= duration <= 90:
            raise ValueError("Invalid delivered audio for " + segment["id"])
        (output / (digest + ".mp3")).write_bytes(data)
        delivered.append({
            **segment, "voiceId": VOICE, "model": MODEL, "sourceUrl": batch["url"], "jobId": batch["jobId"],
            "sourceBatchSha256": source_hash, "sha256": digest, "seconds": duration,
            "storagePath": "/audio/yo/italian-interests/v1/" + digest + ".mp3",
            "nativeAccentReviewed": False,
            "wordTimings": [{**word, "startSeconds": max(0, word["startSeconds"] - clip_start), "endSeconds": word["endSeconds"] - clip_start} for word in words[first:last + 1]],
        })
        cursor = finish
    return delivered


def main():
    manifest = Path(sys.argv[1]).resolve()
    batches = json.loads(manifest.read_text())
    if len(batches) != 6 or any(b.get("model") != MODEL or b.get("voiceId") not in (None, VOICE) for b in batches):
        raise ValueError("Expected exactly six approved Violetta batches")
    directory = manifest.parent
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
        recordings = [item for group in pool.map(lambda b: package(b, directory), batches) for item in group]
    if len(recordings) != 36 or len({item["id"] for item in recordings}) != 36:
        raise ValueError("Incomplete immutable audio edition")
    (directory.parent / "violetta-results.json").write_text(json.dumps({"voiceId": VOICE, "segments": recordings}, ensure_ascii=False, indent=2) + "\n")
    published = {"version": 1, "voiceId": VOICE, "voiceName": "Violetta", "model": MODEL,
                 "recordings": [{key: value for key, value in item.items() if key != "wordTimings"} for item in recordings]}
    (REPO / "lib/yo/audio/italianInterestPublished.json").write_text(json.dumps(published, ensure_ascii=False, indent=2) + "\n")
    index = {item["text"]: item["sha256"] for item in recordings}
    (REPO / "lib/yo/audio/italianInterestIndex.json").write_text(json.dumps(index, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps({"recordings": len(recordings), "seconds": round(sum(item["seconds"] for item in recordings), 2), "voice": "Violetta"}))


if __name__ == "__main__":
    main()
