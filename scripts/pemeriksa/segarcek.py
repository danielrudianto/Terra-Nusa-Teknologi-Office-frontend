#!/usr/bin/env python3
"""
Layar yang MENGUBAH data bersama harus menyegarkan cache-nya.

`ProjectLookupService` memuat seluruh proyek SEKALI per sesi — beserta
`contractDpp` dan `contractValue`-nya — dan beberapa layar membaca nilai
kontrak dari sana, bukan dari layar yang menyuntingnya. Begitu pula
`BankLookupService` untuk daftar rekening.

Layar yang mengubah data itu tetapi tidak memanggil `segarkan()` menghasilkan
gejala yang menyesatkan: penyimpanan BERHASIL, layarnya sendiri ikut berubah
karena ia memuat ulang dirinya, tetapi layar lain tetap menunjukkan angka
lama sampai halamannya dimuat ulang dari awal. Yang membacanya menyimpulkan
datanya belum tersimpan, dan menyimpannya lagi.

Sudah terjadi pada kontrak proyek: menambah SPK atau adendum tidak pernah
menyentuh angka yang dipegang layanan itu, sehingga laporan proyek tetap
memakai nilai kontrak yang lama. `segarkan()` dulu hanya dipanggil dari
daftar proyek — yaitu ketika PROYEKNYA berubah, bukan kontraknya.

Aturannya: berkas yang memanggil `post`, `put`, atau `delete` ke rute yang
diawasi WAJIB memanggil `segarkan()` di berkas yang sama.
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

AKAR = Path(__file__).resolve().parents[2]
SUMBER = AKAR / "src" / "app"

#: Awalan rute yang isinya ikut dipegang layanan cache.
#:
#: `projects/` mencakup kontraknya (`projects/{id}/contracts`,
#: `projects/contracts/{id}`) — dan justru itu yang pernah terlewat.
RUTE_DIAWASI = (
    ("projects", "ProjectLookupService"),
    ("bank-accounts", "BankLookupService"),
)

#: Berkas yang memang hanya MEMBACA; tidak perlu menyegarkan apa pun.
DIKECUALIKAN = ("project-report", "project-margin-list")


def tanpa_komentar(teks: str) -> str:
    """Buang komentar sebelum memeriksa.

    Tanpa ini, penjelasan yang MENYEBUT `segarkan()` membuat berkas dianggap
    sudah menyegarkan. Persis itu yang terjadi pada percobaan pertama: berkas
    yang justru sedang diperbaiki dinyatakan bersih oleh komentarnya sendiri.
    """
    teks = re.sub(r"/\*.*?\*/", "", teks, flags=re.S)
    return re.sub(r"//.*$", "", teks, flags=re.M)

UBAH = re.compile(
    r"""\.(post|put|delete)\(\s*[`'"]([^`'"$]*)""",
)


def periksa(berkas: Path) -> list[str]:
    if any(x in berkas.name for x in DIKECUALIKAN):
        return []

    teks = tanpa_komentar(berkas.read_text(encoding="utf-8", errors="ignore"))
    if "segarkan()" in teks:
        return []

    """
    Dialog DIKECUALIKAN.

    Dialog menutup dirinya dengan `dialogRef.close(true)`, dan yang membukanya
    — daftar proyek — yang memanggil `segarkan()` atas hasil itu. Menuntut
    dialognya menyegarkan sendiri berarti menyegarkan dua kali, dan menandai
    keadaan yang sudah benar sebagai temuan membuat pemeriksa ini diabaikan.
    """
    if "MatDialogRef" in teks:
        return []

    temuan = []
    for m in UBAH.finditer(teks):
        rute = m.group(2).lstrip("/")
        for awalan, layanan in RUTE_DIAWASI:
            if not rute.startswith(awalan):
                continue
            baris = teks[: m.start()].count("\n") + 1
            temuan.append(
                f"{berkas.relative_to(AKAR)}:{baris}: `.{m.group(1)}('{rute}...')` "
                f"mengubah data yang dipegang {layanan}, tetapi berkas ini "
                f"tidak pernah memanggil `segarkan()` — layar lain akan "
                f"memakai angka lama sampai halaman dimuat ulang"
            )
            break
    return temuan


def main() -> int:
    semua = []
    for berkas in sorted(SUMBER.rglob("*.component.ts")):
        if berkas.name.endswith(".spec.ts"):
            continue
        semua.extend(periksa(berkas))

    if semua:
        print("segarcek: perubahan data bersama tanpa penyegaran cache")
        for t in semua:
            print("  " + t)
        return 1

    print("segarcek: setiap layar yang mengubah data bersama menyegarkannya")
    return 0


if __name__ == "__main__":
    sys.exit(main())
