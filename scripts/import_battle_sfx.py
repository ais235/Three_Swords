#!/usr/bin/env python3
"""One-off: copy curated battle SFX from assets/audio/_extracted into battle/sfx/*."""
from __future__ import annotations

import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EXT = ROOT / "assets/audio/_extracted"
OUT_BASE = ROOT / "assets/audio/battle/sfx"

# (category, stem_without_ext, path relative to EXT)
MAPPING: list[tuple[str, str, Path]] = [
    ("common", "hit", Path("RPG_Essentials_Free/10_Battle_SFX/15_Impact_flesh_02.wav")),
    ("common", "death", Path("RPG_Essentials_Free/10_Battle_SFX/69_Enemy_death_01.wav")),
    ("common", "critical_hit", Path("magic_spells_ambroggiomusic/Slash.mp3")),
    ("common", "victory", Path("magic_spells_ambroggiomusic/support_spell_success_.mp3")),
    ("common", "defeat", Path("magic_spells_ambroggiomusic/support_spell_fail.mp3")),
    ("heroes", "garet_melee", Path("RPG_Essentials_Free/10_Battle_SFX/22_Slash_04.wav")),
    ("movement", "step_grass", Path("RPG_Essentials_Free/12_Player_Movement_SFX/03_Step_grass_03.wav")),
    ("movement", "step_rock", Path("RPG_Essentials_Free/12_Player_Movement_SFX/08_Step_rock_02.wav")),
    ("movement", "step_wood", Path("RPG_Essentials_Free/12_Player_Movement_SFX/12_Step_wood_03.wav")),
    ("movement", "step_water", Path("RPG_Essentials_Free/12_Player_Movement_SFX/14_Step_water_02.wav")),
    ("heroes", "alira_bow", Path("RPG_Essentials_Free/8_Atk_Magic_SFX/25_Wind_01.wav")),
    ("heroes", "alira_bow_draw", Path("RPG_Essentials_Free/8_Atk_Magic_SFX/45_Charge_05.wav")),
    ("heroes", "seris_magic", Path("rpg_sound_pack/rpg_sound_pack/battle/magic1.wav")),
    ("heroes", "garet_shield_bash", Path("magic_spells_ambroggiomusic/metal_hit_1.mp3")),
    ("heroes", "garet_fire_call", Path("RPG_Essentials_Free/8_Atk_Magic_SFX/04_Fire_explosion_04_medium.wav")),
    ("heroes", "garet_berserk", Path("43284__randbsoundbites__rpg-sounds/795440__randbsoundbites__grunting.wav")),
    ("heroes", "alira_double_shot", Path("magic_spells_ambroggiomusic/pulse_multi_attack.mp3")),
    ("heroes", "alira_slow_arrow", Path("RPG_Essentials_Free/8_Atk_Magic_SFX/22_Water_02.wav")),
    ("heroes", "alira_arrow_rain", Path("RPG_Essentials_Free/8_Atk_Magic_SFX/18_Thunder_02.wav")),
    ("heroes", "seris_fireball", Path("80-CC0-RPG-SFX/spell_fire_03.ogg")),
    ("heroes", "seris_freeze", Path("RPG_Essentials_Free/8_Atk_Magic_SFX/13_Ice_explosion_01.wav")),
    ("heroes", "seris_meteor", Path("RPG_Essentials_Free/8_Atk_Magic_SFX/30_Earth_02.wav")),
    ("enemies", "skeleton_attack", Path("RPG_Essentials_Free/10_Battle_SFX/03_Claw_03.wav")),
    ("enemies", "goblin_archer_attack", Path("rpg_sound_pack/rpg_sound_pack/NPC/beetle/bite-small.wav")),
    ("enemies", "boar_attack", Path("RPG_Essentials_Free/10_Battle_SFX/08_Bite_04.wav")),
    ("enemies", "zombie_attack", Path("43284__randbsoundbites__rpg-sounds/797849__randbsoundbites__injured.wav")),
    ("enemies", "zombie_explosion", Path("80-CC0-RPG-SFX/creature_die_01.ogg")),
    ("enemies", "shaman_attack", Path("80-CC0-RPG-SFX/spell_02.ogg")),
    ("enemies", "shaman_heal", Path("RPG_Essentials_Free/8_Buffs_Heals_SFX/02_Heal_02.wav")),
    ("enemies", "orc_guard_attack", Path("magic_spells_ambroggiomusic/metal_hit_2.mp3")),
    ("enemies", "suicide_attack", Path("43284__randbsoundbites__rpg-sounds/804662__randbsoundbites__opening-a-magic-potion.wav")),
    ("enemies", "suicide_explosion", Path("80-CC0-RPG-SFX/spell_fire_05.ogg")),
    ("enemies", "spider_attack", Path("rpg_sound_pack/rpg_sound_pack/NPC/beetle/bite-small2.wav")),
    ("enemies", "spider_web", Path("80-CC0-RPG-SFX/creature_slime_01.ogg")),
    ("enemies", "watcher_attack", Path("rpg_sound_pack/rpg_sound_pack/NPC/shade/shade7.wav")),
    ("enemies", "watcher_buff", Path("RPG_Essentials_Free/8_Buffs_Heals_SFX/17_Def_buff_01.wav")),
    ("enemies", "ice_elem_attack", Path("RPG_Essentials_Free/8_Atk_Magic_SFX/13_Ice_explosion_01.wav")),
    ("enemies", "ice_freeze_touch", Path("RPG_Essentials_Free/8_Atk_Magic_SFX/13_Ice_explosion_01.wav")),
    ("enemies", "dark_knight_attack", Path("RPG_Essentials_Free/10_Battle_SFX/22_Slash_04.wav")),
    ("enemies", "necro_attack", Path("magic_spells_vol_2_ambroggiomusic/scream_of_souls.mp3")),
    ("enemies", "necro_raise", Path("RPG_Essentials_Free/8_Buffs_Heals_SFX/30_Revive_03.wav")),
    ("enemies", "chaos_attack", Path("magic_spells_ambroggiomusic/confuse_1.mp3")),
    ("enemies", "assassin_attack", Path("rpg_sound_pack/rpg_sound_pack/battle/swing.wav")),
    ("enemies", "hydra_attack", Path("rpg_sound_pack/rpg_sound_pack/NPC/giant/giant2.wav")),
    ("enemies", "ghost_attack", Path("rpg_sound_pack/rpg_sound_pack/NPC/shade/shade3.wav")),
    ("enemies", "fire_titan_attack", Path("80-CC0-RPG-SFX/spell_fire_04.ogg")),
    ("enemies", "fire_titan_aoe", Path("80-CC0-RPG-SFX/spell_fire_02.ogg")),
    ("enemies", "dark_lord_attack", Path("rpg_sound_pack/rpg_sound_pack/NPC/ogre/ogre3.wav")),
    ("enemies", "dark_lord_teleport", Path("magic_spells_vol_2_ambroggiomusic/Teleport.mp3")),
    ("enemies", "dark_lord_summon", Path("magic_spells_vol_2_ambroggiomusic/whimsy_cast.mp3")),
    ("enemies", "dark_lord_aoe", Path("magic_spells_ambroggiomusic/electricity_more.mp3")),
    ("status", "apply_stun", Path("magic_spells_vol_2_ambroggiomusic/Stun.mp3")),
    ("status", "apply_freeze", Path("RPG_Essentials_Free/8_Atk_Magic_SFX/13_Ice_explosion_01.wav")),
    ("status", "apply_web", Path("RPG_Essentials_Free/8_Buffs_Heals_SFX/44_Sleep_01.wav")),
    ("status", "apply_poison", Path("magic_spells_ambroggiomusic/Poison.mp3")),
    ("status", "tick_poison", Path("RPG_Essentials_Free/8_Atk_Magic_SFX/46_Poison_01.wav")),
    ("status", "apply_burn", Path("80-CC0-RPG-SFX/spell_fire_01.ogg")),
    ("status", "tick_burn", Path("80-CC0-RPG-SFX/spell_fire_06.ogg")),
    ("status", "apply_slow", Path("magic_spells_vol_2_ambroggiomusic/Hover.mp3")),
    ("status", "apply_blind", Path("magic_spells_ambroggiomusic/confuse_2.mp3")),
    ("status", "apply_curse", Path("RPG_Essentials_Free/8_Buffs_Heals_SFX/21_Debuff_01.wav")),
    ("status", "apply_berserk", Path("magic_spells_ambroggiomusic/power_up.mp3")),
    ("ui", "select_unit", Path("RPG_Essentials_Free/10_UI_Menu_SFX/001_Hover_01.wav")),
    ("ui", "end_turn", Path("RPG_Essentials_Free/10_UI_Menu_SFX/013_Confirm_03.wav")),
    ("ui", "skill_ready", Path("RPG_Essentials_Free/10_UI_Menu_SFX/070_Equip_10.wav")),
    ("ui", "victory_screen", Path("magic_spells_ambroggiomusic/support_spell_success_.mp3")),
    ("ui", "defeat_screen", Path("RPG_Essentials_Free/10_UI_Menu_SFX/029_Decline_09.wav")),
]


def dest_name(stem: str, src: Path) -> str:
    suf = src.suffix.lower()
    if suf == ".mp3":
        return stem + ".mp3"
    if suf == ".ogg":
        return stem + ".ogg"
    return stem + ".wav"


def main() -> None:
    rows: list[str] = []
    for cat, stem, rel in MAPPING:
        src = EXT / rel
        if not src.is_file():
            rows.append(f"{cat}/{stem}.*\tMISSING_SRC\t{rel}")
            continue
        name = dest_name(stem, src)
        dest_dir = OUT_BASE / cat
        dest_dir.mkdir(parents=True, exist_ok=True)
        dest = dest_dir / name
        shutil.copy2(src, dest)
        rows.append(f"{cat}/{name}\t{rel.as_posix()}\tскопирован")
    report = OUT_BASE / "_import_report.txt"
    report.write_text("\n".join(rows) + "\n", encoding="utf-8")
    print("\n".join(rows))


if __name__ == "__main__":
    main()
