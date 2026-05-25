#!/usr/bin/env python3
"""Fix BSX paths in index.html to match files on disk; restore missing mp3 from ZIPs."""
from __future__ import annotations

import re
import shutil
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / "index.html"
SFX = ROOT / "assets/audio/battle/sfx"
AUDIO = ROOT / "assets/audio"

# Paths to fix in index.html (old suffix -> new), only when new file exists
REPLACEMENTS = [
    ("common/hit.wav", "common/hit.mp3"),
    ("heroes/garet_melee.wav", "heroes/garet_melee.mp3"),
    ("heroes/alira_bow.wav", "heroes/alira_bow.mp3"),
    ("heroes/seris_magic.wav", "heroes/seris_magic.mp3"),
    ("heroes/garet_fire_call.wav", "heroes/garet_fire_call.mp3"),
    ("heroes/garet_berserk.wav", "heroes/garet_berserk.mp3"),
    ("heroes/seris_freeze.wav", "heroes/seris_freeze.mp3"),
    ("heroes/seris_meteor.wav", "heroes/seris_meteor.mp3"),
    ("ui/select_unit.wav", "ui/select_unit.mp3"),
    ("ui/end_turn.wav", "ui/end_turn.mp3"),
    ("ui/skill_ready.wav", "ui/skill_ready.mp3"),
    ("ui/defeat_screen.wav", "ui/defeat_screen.mp3"),
]


def extract_double_shot_mp3() -> bool:
    out = SFX / "heroes" / "alira_double_shot.mp3"
    if out.is_file() and out.stat().st_size > 500:
        return True
    zip_path = AUDIO / "magic_spells_ambroggiomusic.zip"
    if not zip_path.is_file():
        return False
    needle = "pulse_multi_attack.mp3"
    with zipfile.ZipFile(zip_path) as zf:
        for name in zf.namelist():
            if name.endswith(needle) or needle in name.replace("\\", "/"):
                out.parent.mkdir(parents=True, exist_ok=True)
                with zf.open(name) as src, open(out, "wb") as dst:
                    shutil.copyfileobj(src, dst)
                print(f"Extracted {out} ({out.stat().st_size} bytes)")
                return True
    print("WARN: pulse_multi_attack.mp3 not found in zip")
    return False


def patch_index_html() -> int:
    text = INDEX.read_text(encoding="utf-8")
    n = 0
    for old, new in REPLACEMENTS:
        if not (SFX / new).is_file():
            print(f"SKIP (missing on disk): {new}")
            continue
        for old_url, new_url in (
            (f"assets/audio/battle/sfx/{old}", f"assets/audio/battle/sfx/{new}"),
            (old, new),
        ):
            c = text.count(old_url)
            if c:
                text = text.replace(old_url, new_url)
                n += c
                print(f"Replaced x{c}: {old_url} -> {new_url}")
    INDEX.write_text(text, encoding="utf-8")
    return n


def verify_bsx_paths() -> list[str]:
    text = INDEX.read_text(encoding="utf-8")
    paths = re.findall(r"assets/audio/battle/sfx/[a-z0-9_./-]+\\.(?:mp3|wav|ogg|m4a)", text)
    missing = []
    for p in sorted(set(paths)):
        if ".." in p or p.endswith("/"):
            continue
        if not (ROOT / p).is_file():
            missing.append(p)
    return missing


def main() -> None:
    extract_double_shot_mp3()
    n = patch_index_html()
    print(f"\nTotal URL replacements: {n}")
    missing = verify_bsx_paths()
    if missing:
        print("\nStill missing:")
        for p in missing:
            print(" ", p)
        raise SystemExit(1)
    print("\nAll battle/sfx paths in index.html resolve to files.")


if __name__ == "__main__":
    main()
