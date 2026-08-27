#!/usr/bin/env python3
"""
Isian MASA PAJAK harus dapat dilihat orang yang mengisinya.

Isian ini digambar bersyarat: `@if (kenaPpn)`, dan `kenaPpn` membaca tarif
PPN. Selama syaratnya bergantung pada isian yang letaknya LEBIH BAWAH dari
isian ini sendiri, hasilnya adalah kolom yang tidak pernah tampak pada saat
orang melewatinya — ia baru muncul setelah tarifnya dipilih, jauh di bawah,
di tempat yang sudah terlewat.

Itulah yang terjadi pada putaran pertama: blok masa pajak berada di seksi
META sementara tarif PPN dipilih di seksi NILAI, seratus lima puluh baris
lebih bawah. Tidak ada galat, tidak ada peringatan build — kolomnya memang
digambar, hanya tidak pernah pada saat dibutuhkan.

Dua hal yang dijaga:

  1. Pada formulir PEMBUATAN, isian masa pajak berdiri SESUDAH kartu tarif
     PPN yang menjadi syaratnya.

  2. Kedua formulir — pembuatan dan penyuntingan — benar-benar memuat
     isiannya. Kolom `taxPeriod` yang ada di basis data tetapi tidak punya
     jalan masuk di layar adalah kolom yang selamanya kosong.

Keluar dengan kode 1 bila ada yang menyimpang.
"""

from __future__ import annotations

import os
import sys

AKAR = os.path.join(os.path.dirname(__file__), "..", "..")

BUAT = os.path.join(
    AKAR, "src/app/pages/purchase/purchase-create/purchase-create.component.html"
)
UBAH = os.path.join(
    AKAR,
    "src/app/pages/purchase/purchase-update-meta/purchase-update-meta.component.html",
)


def periksa_buat() -> list[str]:
    s = open(BUAT, encoding="utf-8").read()
    galat = []

    if "purchaseCreate.masaPajak" not in s:
        return ["formulir pembuatan tidak memuat isian masa pajak sama sekali"]

    masa = s.index('"purchaseCreate.masaPajak"')

    # Syaratnya `kenaPpn`, yang membaca tarif PPN. Tarif itu dipilih pada
    # kartu `ppnPercent`; isian ini harus berada SESUDAHNYA.
    if "purchaseCreate.ppnPercent" in s:
        ppn = s.index("purchaseCreate.ppnPercent")
        if masa < ppn:
            galat.append(
                "isian masa pajak berdiri SEBELUM kartu tarif PPN yang "
                "menjadi syarat tampilnya; ia tidak akan pernah terlihat "
                "pada saat orang melewatinya"
            )

    # Sekalian pastikan ia memang di dalam seksi NILAI, bukan seksi meta.
    if '<form [formGroup]="valueFormGroup"' in s:
        nilai = s.index('<form [formGroup]="valueFormGroup"')
        if masa < nilai:
            galat.append(
                "isian masa pajak berada di luar seksi nilai; tempatnya "
                "bersebelahan dengan tarif PPN"
            )

    return galat


def periksa_ubah() -> list[str]:
    s = open(UBAH, encoding="utf-8").read()
    if "purchaseMeta.masaPajak" not in s:
        return [
            "formulir penyuntingan tidak memuat isian masa pajak; kolomnya "
            "hanya dapat diisi saat pembuatan, padahal faktur pajak kerap "
            "baru diterima setelah pembeliannya dibayar"
        ]
    return []


def main() -> int:
    menyimpang = 0
    for nama, galat in (
        ("purchase-create", periksa_buat()),
        ("purchase-update-meta", periksa_ubah()),
    ):
        if galat:
            menyimpang += 1
            print(f"\n{nama}")
            for g in galat:
                print(f"  - {g}")

    print(f"\n2 formulir diperiksa, {menyimpang} menyimpang.")
    return 1 if menyimpang else 0


if __name__ == "__main__":
    sys.exit(main())
