#!/usr/bin/env python3
"""
Teks yang terlihat pengguna TIDAK boleh ditulis langsung di template.

KELUHANNYA: "kenapa purchase type nya walaupun pakai Indonesia, banyak yang
masih inggris ya".

SEBABNYA, dan kenapa ini kelas kegagalan tersendiri

Pilihan-pilihannya memang diterjemahkan — `{{ "expense.assetPurchase" |
translate }}`. Yang TIDAK adalah JUDUL GRUPNYA:

    <mat-optgroup label="Office Expenses">

Atribut `label` tidak pernah melewati pipe `translate`, jadi ia berbahasa
Inggris untuk semua orang, di ketiga bahasa, selamanya. Tidak ada galat, tidak
ada kunci yang hilang, dan `terjemahcek.py` pun hijau — pemeriksa itu
membandingkan berkas terjemahan satu sama lain, dan teks yang tidak pernah
masuk ke berkas terjemahan tentu saja tidak pernah dilaporkannya hilang.

Ditemukan 17 buah di 7 berkas. Empat di antaranya kebalikannya — "Tidak kawin"
dan "Kawin" ditulis dalam bahasa Indonesia, sehingga yang memakai antarmuka
Inggris atau Mandarin melihat teks Indonesia di tengah formulirnya.

KENAPA PEMERIKSA

Karena yang perlu dijaga adalah `<mat-optgroup>` BERIKUTNYA. Menulis
`label="..."` adalah hal paling wajar yang dilakukan orang — itu yang tertulis
di contoh dokumentasi Material — dan tidak ada apa pun dalam alur kerja biasa
yang akan menegur.

CARA PAKAI

    python3 scripts/pemeriksa/tekskerascek.py
"""

import pathlib
import re
import sys

AKAR = pathlib.Path(__file__).resolve().parents[2]
SUMBER = AKAR / "src" / "app"

# Atribut yang isinya TERBACA pengguna. `placeholder` dan `matTooltip` ikut:
# keduanya sama-sama terlihat, dan sama-sama mudah lupa diterjemahkan.
ATRIBUT = ("label", "placeholder", "matTooltip", "aria-label")

POLA = re.compile(
    r"<(mat-optgroup|mat-option|mat-tab)\b([^>]*)>",
    re.S,
)
ATTR_STATIS = re.compile(
    r'(?<![\[\w])(' + "|".join(ATRIBUT) + r')\s*=\s*"([^"]*)"'
)

# Nilai yang bukan teks untuk dibaca: kosong, angka, kode, satu aksara.
TIDAK_PERLU = re.compile(r"^\s*$|^[\d\s.,:/%-]+$|^[A-Z0-9_]{1,4}$")


def _buang_komentar(teks: str) -> str:
    return re.sub(r"<!--.*?-->", "", teks, flags=re.S)


def periksa() -> list[str]:
    masalah: list[str] = []

    for berkas in sorted(SUMBER.rglob("*.html")):
        isi = _buang_komentar(berkas.read_text(encoding="utf-8"))
        rel = berkas.relative_to(SUMBER)

        for m in POLA.finditer(isi):
            tag, atribut = m.group(1), m.group(2)
            baris = isi[: m.start()].count("\n") + 1

            for a in ATTR_STATIS.finditer(atribut):
                nama, nilai = a.group(1), a.group(2)
                if TIDAK_PERLU.match(nilai):
                    continue
                masalah.append(
                    f"{rel}:{baris}: <{tag} {nama}=\"{nilai}\"> ditulis "
                    f"langsung — tidak pernah melewati `translate`, jadi ia "
                    f"tetap sama di ketiga bahasa. Ganti dengan "
                    f"`[{nama}]=\"'kunci.terjemahan' | translate\"`."
                )

    return masalah


if __name__ == "__main__":
    h = periksa()
    print(f"teks keras di template: {len(h)}")
    print()
    for x in h:
        print(f"  {x}")
    sys.exit(1 if h else 0)
