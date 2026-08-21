#!/usr/bin/env python3
"""
Nilai uang pada layar purchase order tidak dibulatkan ke rupiah penuh.

MENGAPA

Harga satuan tersimpan empat desimal, sehingga sebuah baris kerap bernilai
299.999,70 — bukan angka bulat. Ditampilkan dengan `number: "1.0-0"`, angka
itu MEMBULAT menjadi "300.000": yang mengisi melihat 300.000 di seluruh
layar, mengira dokumennya bernilai 300.000, padahal yang tercetak dan yang
mengikat adalah 299.999,70.

Karena itu setiap nilai UANG pada layar purchase order — di formulir
pembuatan, penyuntingan, adendum, layar periksa/persetujuan desktop, daftar,
dan persetujuan ponsel — harus menampilkan dua desimal (`1.0-2`), atau empat
untuk harga satuan (`1.0-4`). Yang membulat ke nol desimal menyembunyikan
selisih yang justru menjadi sebab seluruh fitur jumlah-tertulis dibuat.

Pemeriksa ini menolak `number: "1.0-0"` pada berkas-berkas itu. Persentase
(PPN, PPh) tidak bernilai uang dan tidak diperiksa — ia memang bulat.

    python3 scripts/pemeriksa/tampilnominalcek.py
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

AKAR = Path(__file__).resolve().parents[2]

CAKUPAN = [
    "src/app/pages/purchase-order/purchase-order-create",
    "src/app/pages/purchase-order/purchase-order-view",
    "src/app/pages/purchase-order/purchase-order-list",
    "src/app/mobile/persetujuan-po",
]

POLA = re.compile(r'number:\s*["\']1\.0-0["\']')


def berkas() -> list[Path]:
    hasil: list[Path] = []
    for c in CAKUPAN:
        p = AKAR / c
        if p.is_dir():
            hasil.extend(sorted(p.rglob("*.html")))
        elif p.is_file():
            hasil.append(p)
    return hasil


def main() -> int:
    temuan: list[str] = []
    diperiksa = 0
    for f in berkas():
        diperiksa += 1
        for no, baris in enumerate(f.read_text().split("\n"), 1):
            if POLA.search(baris):
                temuan.append(f"{f.relative_to(AKAR)}:{no}: {baris.strip()[:90]}")

    print(f"tampilnominalcek: {diperiksa} templat purchase order diperiksa")
    if diperiksa < 15:
        print("\nGAGAL MEMBACA: terlalu sedikit templat; perbaiki pemeriksanya.")
        return 2
    if not temuan:
        print("bersih — tidak ada nilai uang yang dibulatkan ke rupiah penuh.")
        return 0

    print(f"\n{len(temuan)} nilai uang dibulatkan ke nol desimal:\n")
    for t in temuan:
        print(f"  - {t}")
    print(
        "\nPakai `number: \"1.0-2\"` untuk nominal (atau \"1.0-4\" untuk harga\n"
        "satuan). Membulatkan ke nol desimal menampilkan 300.000 untuk nilai\n"
        "yang sebenarnya 299.999,70 — persis kekeliruan yang dihindari."
    )
    return 1


if __name__ == "__main__":
    sys.exit(main())
