#!/usr/bin/env python3
"""
Layar pembayaran harus MENGISI `totalAmount`.

Keempat layar pembayaran memakai pola yang sama: `totalAmount` menyimpan
SISA tagihan, dan `sudahLunas` membacanya untuk memutuskan apakah tombol
simpan hidup.

    get sudahLunas(): boolean {
      return (Number(this.totalAmount) || 0) <= 5;
    }

Nilai awalnya nol. Selama tidak pernah diisi, `0 <= 5` selalu benar —
layarnya dibuka dengan banner "Dokumen ini sudah lunas" dan tombol yang
mati, termasuk untuk dokumen yang belum pernah dibayar sepeser pun.

TIDAK ADA GALAT YANG MUNCUL. Nilainya sah, tipenya benar, `tsc` lulus,
build lulus. Yang keliru hanya bahwa ia tidak pernah berpindah dari nol —
dan itu persis yang terjadi pada layar pembayaran reimbursement sampai
seseorang melaporkannya dari lapangan.

Pemeriksa ini menuntut dua hal pada tiap layar yang memakai `sudahLunas`:

  1. ada penugasan `this.totalAmount = ...` di suatu tempat;
  2. pembayaran yang sudah masuk ikut dikurangkan — sisa yang dihitung
     tanpa `data.payments` menawarkan nilai penuh sekali lagi pada dokumen
     yang sudah dibayar sebagian.

Keluar dengan kode 1 bila ada yang menyimpang.
"""

from __future__ import annotations

import glob
import os
import re
import sys

AKAR = os.path.join(os.path.dirname(__file__), "..", "..")


def periksa(path: str) -> list[str]:
    s = open(path, encoding="utf-8").read()
    if "sudahLunas" not in s:
        return []

    galat: list[str] = []

    # Baris deklarasi tidak dihitung sebagai pengisian.
    penugasan = re.findall(r"this\.totalAmount\s*=", s)
    if not penugasan:
        galat.append(
            "`totalAmount` tidak pernah diisi; `sudahLunas` akan selalu "
            "benar dan tombol simpannya mati untuk semua dokumen"
        )

    # Sisa harus memperhitungkan pembayaran yang sudah masuk.
    #
    # Yang diperiksa BUKAN sekadar munculnya kata "payments" di berkas —
    # kata itu ada di mana-mana (nama berkas, nama kelas, komentar) dan
    # pemeriksaan sekasar itu meloloskan kode yang tidak pernah membaca
    # daftarnya. Yang dituntut: daftar pembayaran benar-benar DIJUMLAHKAN,
    # yaitu ada `.reduce(` yang berpangkal pada `payments`.
    dijumlahkan = re.search(
        r"\bpayments\b[^;]{0,400}?\.reduce\s*\(", s, re.S
    )
    if not dijumlahkan:
        galat.append(
            "daftar pembayaran tidak pernah dijumlahkan; sisa tagihannya "
            "menawarkan nilai penuh sekali lagi pada dokumen yang sudah "
            "dibayar sebagian"
        )
    elif not re.search(r"\bisDelete\b", dijumlahkan.group(0)):
        # `is_delete` TIDAK diterima: jalan keluarnya mengembalikan kolom
        # bergaya camelCase, dan nama bergaya lain menghasilkan `undefined`
        # yang membuang seluruh baris tanpa satu pun galat.
        galat.append(
            "pembayaran yang dibatalkan tidak disaring dengan `isDelete`; "
            "nama kolom yang keliru membuang SELURUH pembayaran dan "
            "sisanya menjadi utang penuh"
        )

    return galat


def main() -> int:
    pola = os.path.join(AKAR, "src", "app", "components", "payment-create", "**", "*.component.ts")
    total = 0
    menyimpang = 0
    for path in sorted(glob.glob(pola, recursive=True)):
        galat = periksa(path)
        if not galat and "sudahLunas" not in open(path, encoding="utf-8").read():
            continue
        total += 1
        if galat:
            menyimpang += 1
            print(f"\n{os.path.basename(os.path.dirname(path))}")
            for g in galat:
                print(f"  - {g}")

    print(f"\n{total} layar pembayaran diperiksa, {menyimpang} menyimpang.")
    return 1 if menyimpang else 0


if __name__ == "__main__":
    sys.exit(main())
