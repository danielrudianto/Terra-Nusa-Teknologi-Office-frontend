#!/usr/bin/env python3
"""
Setiap layar yang menilai "volume melebihi pagu" HARUS membaca `tanpaPagu`.

KENAPA PEMERIKSA INI ADA

Pagu CoP dijaga di server, dan servernya menandai baris kontrak harga satuan
(SPK tenaga kerja) dengan `tanpaPagu` — baris yang tidak punya plafon dan
karena itu tidak dapat dilampaui.

Layar yang menghitung sendiri tanpa membaca penanda itu akan menolak volume
yang justru DITERIMA server. Gejalanya sudah dilaporkan dua kali dari
lapangan: layar pencatatan volume sudah benar, tetapi layar "buat CoP &
nilai" memakai salinan fungsinya yang belum ikut diperbaiki — sehingga SPK D
tetap merah dan tetap tidak dapat disimpan, walau pagunya sudah dibuka.
Tidak ada galat, tidak ada uji yang merah; hanya satu layar yang bertahan
dengan aturan lama.

YANG DIPERIKSA: setiap `melebihi(...)` (dan `lewatPagu`, nama lamanya) di
`src/app` harus menyebut `tanpaPagu` di dalam badannya.

Keluar dengan kode 1 bila ada yang menyimpang.
"""

from __future__ import annotations

import os
import re
import sys
from pathlib import Path

AKAR = Path(__file__).resolve().parents[2]
SUMBER = AKAR / "src" / "app"

NAMA = ("melebihi", "lewatPagu")


def periksa() -> list[str]:
    masalah: list[str] = []
    for akar, _, berkas in os.walk(SUMBER):
        for b in berkas:
            if not b.endswith(".ts") or b.endswith(".spec.ts"):
                continue
            p = Path(akar) / b
            kode = p.read_text(encoding="utf-8")
            for nama in NAMA:
                for m in re.finditer(
                    r"\n  (?:public |private |protected )?%s\s*\([^)]*\)\s*:\s*boolean\s*\{"
                    % re.escape(nama),
                    kode,
                ):
                    i = m.end()
                    j = kode.find("\n  }", i)
                    badan = kode[i : j if j != -1 else len(kode)]
                    if "tanpaPagu" in badan:
                        continue
                    masalah.append(
                        f"{p.relative_to(SUMBER).as_posix()}: `{nama}()` menilai "
                        f"pelampauan pagu tanpa membaca `tanpaPagu` — baris "
                        f"kontrak harga satuan akan ditandai merah dan tidak "
                        f"dapat disimpan, padahal server menerimanya"
                    )
    return masalah


if __name__ == "__main__":
    h = periksa()
    print(f"penilai pagu yang membaca `tanpaPagu`: {len(h)} menyimpang")
    print()
    for x in h:
        print(f"  {x}")
    sys.exit(1 if h else 0)
