#!/usr/bin/env python3
"""
Formulir purchase order yang punya DAFTAR BARIS harus punya tombol tambah
di BAWAH daftarnya, bukan hanya di kepala kartunya.

Sebabnya sederhana dan hanya terasa oleh yang memakainya sehari-hari: tombol
di kepala kartu tidak terjangkau lagi setelah beberapa baris terisi. Yang
menyadari ada satu barang yang kurang harus menggulir ke atas, menekan, lalu
menggulir kembali ke bawah untuk mengisinya — sekali per barang, sepanjang
hari.

Tidak ada galat, tidak ada yang rusak. Formulir yang kehilangan tombol ini
hanya menjadi lebih melelahkan daripada formulir sebelahnya, dan itu tidak
pernah dilaporkan sebagai kerusakan.

    python3 scripts/pemeriksa/tambahbawahcek.py
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

AKAR = Path(__file__).resolve().parents[2]
FORMULIR = AKAR / "src/app/pages/purchase-order/purchase-order-create"

#: Penanda bahwa formulirnya memang punya daftar baris yang dapat bertambah.
PUNYA_DAFTAR = re.compile(r"@for\s*\(\s*\w+\s+of\s+\w+\.controls", re.S)

#: Tombol tambah di bawah daftar.
TOMBOL_BAWAH = "pou-add--bawah"

#: Formulir yang memang TIDAK punya daftar yang dapat ditambah dari layar,
#: beserta sebabnya. Isinya kosong berarti tidak ada yang dikecualikan.
DIKECUALIKAN: dict[str, str] = {}


def main() -> int:
    if not FORMULIR.exists():
        print(f"folder formulir tidak ditemukan: {FORMULIR}")
        return 2

    diperiksa = 0
    temuan: list[str] = []

    for berkas in sorted(FORMULIR.rglob("*.component.html")):
        nama = berkas.parent.name
        if nama in DIKECUALIKAN:
            continue
        isi = berkas.read_text()

        # Daftar poin perjanjian tidak dihitung: isinya satu baris teks, dan
        # tombolnya memang selalu terlihat karena daftarnya pendek.
        if not PUNYA_DAFTAR.search(isi):
            continue

        diperiksa += 1
        if TOMBOL_BAWAH not in isi:
            temuan.append(
                f"{berkas.relative_to(AKAR)}: punya daftar baris tetapi tidak "
                f"punya tombol tambah di bawahnya"
            )

    print(f"tambahbawahcek: {diperiksa} formulir berdaftar diperiksa")

    # Hijau tanpa memeriksa apa pun adalah kegagalan, bukan kelulusan.
    if diperiksa < 5:
        print(
            "\nGAGAL MEMBACA: terlalu sedikit formulir yang dikenali. "
            "Bentuk daftarnya kemungkinan berubah — perbaiki pemeriksanya, "
            "jangan percayai hijaunya."
        )
        return 2

    if not temuan:
        print("bersih.")
        return 0

    print(f"\n{len(temuan)} temuan:\n")
    for t in temuan:
        print(f"  - {t}")
    return 1


if __name__ == "__main__":
    sys.exit(main())
