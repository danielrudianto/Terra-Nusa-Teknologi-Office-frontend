#!/usr/bin/env python3
"""
Setiap `<app-avatar [userId]>` wajib ikut menyebut `[name]`.

KENAPA INI PENTING

Avatar seseorang hanya tergambar kalau ia PUNYA avatar tersimpan dan
pengambilannya berhasil. Di luar itu — belum pernah menyetel avatar,
permintaannya belum kembali, atau servernya menolak — komponennya menggambar
INISIAL dari `[name]`.

Tanpa `[name]`, inisialnya menjadi `?`. Dan `?` sama untuk semua orang,
sehingga persoalan yang justru sedang diperbaiki kembali: dua orang berbeda
tampil identik, dan orang yang sama tampak berganti "wajah" antara satu
halaman dan halaman lain.

Sebelumnya keadaan itu digambar sebagai `DEFAULT_AVATAR` — satu wajah
tertentu, `face-01` berbaju biru — yang jauh lebih menyesatkan daripada `?`
karena terbaca sebagai wajah seseorang yang sungguhan. Itulah keluhan yang
memulai pemeriksa ini.

KENAPA PEMERIKSA, BUKAN UJI

Yang salah tidak melempar apa pun dan tidak mengubah satu nilai pun: yang
berubah hanya apa yang TERGAMBAR, dan hanya pada keadaan yang jarang terjadi
di lingkungan uji (avatar belum ada, atau permintaannya gagal). Uji komponen
yang menambal AvatarService akan hijau dengan atau tanpa `[name]`.
"""

import re
import sys
from pathlib import Path

AKAR = Path(__file__).resolve().parents[2] / "src" / "app"

# Satu tag `<app-avatar ...>` atau `<app-avatar ...></app-avatar>`, boleh
# melintasi baris.
TAG = re.compile(r"<app-avatar\b(.*?)/?>", re.S)


def _baris(isi: str, pos: int) -> int:
    return isi.count("\n", 0, pos) + 1


def periksa() -> list[str]:
    temuan: list[str] = []

    for html in sorted(AKAR.rglob("*.html")):
        isi = html.read_text(encoding="utf-8")
        if "<app-avatar" not in isi:
            continue

        rel = html.relative_to(AKAR)

        for m in TAG.finditer(isi):
            atribut = m.group(1)

            # Pratinjau di perancang avatar memberi konfigurasinya langsung;
            # ia tidak pernah jatuh ke inisial.
            if re.search(r"\[config\]", atribut):
                continue

            if not re.search(r"\[userId\]|\buserId\s*=", atribut):
                continue

            if not re.search(r"\[name\]|\bname\s*=", atribut):
                temuan.append(
                    f"{rel}:{_baris(isi, m.start())}: `<app-avatar [userId]>` "
                    f"tanpa `[name]` — saat avatarnya belum ada atau gagal "
                    f"dimuat, yang tergambar `?`, sama untuk semua orang."
                )

    return temuan


def main() -> int:
    temuan = periksa()
    if temuan:
        print("Avatar tanpa nama:\n")
        for t in temuan:
            print(f"  - {t}")
        print(
            "\nSertakan namanya, mis.:\n"
            '\n    <app-avatar [userId]="e.userID" [name]="e.userName" [size]="28" />\n'
        )
        return 1

    print("Avatar: setiap `[userId]` disertai `[name]`.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
