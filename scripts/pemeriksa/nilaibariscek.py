#!/usr/bin/env python3
"""
Nilai baris dokumen dihitung di SATU tempat.

Sejak sebuah baris boleh membawa jumlah yang ditulis sendiri — pembetulan
pembulatan, paling banyak beberapa rupiah — perkalian `quantity * price` tidak
lagi selalu benar. Helper yang masih menghitungnya sendiri akan mencetak angka
yang berbeda dari helper sebelahnya, PADA DOKUMEN YANG SAMA: nilai baris di
tabel tidak cocok dengan subtotalnya, dan tidak ada satu pun galat yang
menyertainya.

Sebelum penjaga ini ada, perkalian itu tersebar di dua belas tempat pada tujuh
berkas.

    python3 scripts/pemeriksa/nilaibariscek.py
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

AKAR = Path(__file__).resolve().parents[2]

#: Perkalian volume kali harga, dalam urutan mana pun.
POLA = re.compile(
    r"(quantity[^;\n]{0,40}\*[^;\n]{0,40}price|price[^;\n]{0,40}\*[^;\n]{0,40}quantity)",
    re.I,
)

#: Berkas yang MEMANG berhak menghitungnya — sumber kebenarannya sendiri.
DIKECUALIKAN = {"src/app/helpers/nilai-baris.helper.ts"}


#: Penanda formulir yang MEMANG menerima jumlah tertulis.
#:
#: Yang dicari pemakaian `pembulatanSah()`, bukan sekadar adanya isian
#: bernama `amount`: beberapa layar lain memakai nama itu untuk nominalnya
#: sendiri, dan menandai mereka membuat pemeriksa ini melaporkan angka yang
#: tidak sesuai dengan yang sebenarnya dijaganya.
#:
#: Formulir tanpa penanda ini belum mengenal pembetulan pembulatan sama
#: sekali, dan perkalian di dalamnya masih benar. Yang PUNYA penanda ini
#: tidak boleh lagi mengalikan sendiri di mana pun — termasuk pada total
#: dokumennya.
PENANDA_FORMULIR = "pembulatanSah("


def _berkas_diperiksa():
    """Helper cetak, DAN formulir yang menerima jumlah tertulis.

    Formulirnya ikut sejak versi ini. Sebelumnya hanya helper yang dipindai,
    dan justru di formulirlah kekeliruannya bersembunyi: baris G menampilkan
    Rp 300.000 sesuai yang diketik sementara `rawTotal` di berkas yang sama
    menjumlahkan Rp 299.999,70. Helper cetaknya bersih, pemeriksanya hijau,
    dan dokumennya tetap memuat dua angka yang bertentangan.
    """
    for f in sorted((AKAR / "src/app").rglob("*.ts")):
        rel = str(f.relative_to(AKAR))
        if rel in DIKECUALIKAN or rel.endswith(".spec.ts"):
            continue
        if "/helpers/" in rel:
            yield rel, f.read_text()
            continue
        isi = f.read_text()
        if PENANDA_FORMULIR in isi:
            yield rel, isi


def main() -> int:
    temuan: list[str] = []
    diperiksa = 0
    formulir = 0

    for rel, isi in _berkas_diperiksa():
        diperiksa += 1
        if "/helpers/" not in rel:
            formulir += 1
        for baris_no, baris in enumerate(isi.split("\n"), 1):
            if baris.lstrip().startswith(("*", "//")):
                continue
            if POLA.search(baris):
                temuan.append(f"{rel}:{baris_no}: {baris.strip()[:80]}")

    print(
        f"nilaibariscek: {diperiksa} berkas diperiksa "
        f"({formulir} formulir berjumlah tertulis)"
    )
    if diperiksa < 5:
        print("\nGAGAL MEMBACA: terlalu sedikit berkas; perbaiki pemeriksanya.")
        return 2
    if formulir < 1:
        print(
            "\nGAGAL MEMBACA: tidak satu pun formulir berjumlah tertulis terbaca.\n"
            f"Penandanya `{PENANDA_FORMULIR}`; bila namanya berubah, "
            "perbaiki pemeriksanya."
        )
        return 2
    if not temuan:
        print("bersih — seluruhnya lewat `nilaiBaris()`.")
        return 0

    print(f"\n{len(temuan)} temuan:\n")
    for t in temuan:
        print(f"  - {t}")
    print(
        "\nPakai `nilaiBaris(baris)` dari `helpers/nilai-baris.helper.ts`;\n"
        "ia menghormati jumlah yang ditulis, dan jatuh ke perkalian bila kosong."
    )
    return 1


if __name__ == "__main__":
    sys.exit(main())
