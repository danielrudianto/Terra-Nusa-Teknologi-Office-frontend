#!/usr/bin/env python3
"""
Tombol simpan berada DI LUAR kartu terakhir, dan pembayaran datang PALING
AKHIR.

Dua kekeliruan bentuk yang tidak menimbulkan galat apa pun, dan keduanya
ditemukan pada formulir Reimbursement:

  1. Tombol simpan berada di DALAM kartu terakhir. Ia lalu terbaca seolah
     menyimpan isi kartu itu saja — pada Reimbursement, kartu Item —
     padahal yang dikirim seluruh formulir.

  2. Bagian pembayaran berada di TENGAH, sebelum satu barang pun diisi. Yang
     mengisinya diminta menentukan ke mana uang dikirim atas jumlah yang
     belum ada, lalu menggulir kembali ke atas setelah barangnya lengkap.

    python3 scripts/pemeriksa/urutanformcek.py
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

AKAR = Path(__file__).resolve().parents[2]

#: Formulir yang diperiksa: berkas, awalan kelasnya, dan urutan seksi yang
#: diharapkan (dicocokkan sebagai urutan kemunculan, bukan daftar lengkap).
FORMULIR = [
    (
        "src/app/pages/reimbursement/reimbursement-create/reimbursement-create.component.html",
        "rc",
        ["sectionDetail", "sectionItems", "sectionBankPayment"],
    ),
    (
        "src/app/pages/purchase/purchase-create/purchase-create.component.html",
        "pc",
        ["stepMeta", "stepValue", "stepPayment"],
    ),
]


def _kedalaman_div(isi: str) -> list[tuple[int, int, str]]:
    """(posisi, kedalaman SESUDAH tag, teks tag) untuk tiap tag div."""
    hasil = []
    dalam = 0
    for m in re.finditer(r"<div\b[^>]*>|</div>", isi):
        teks = m.group(0)
        if teks.startswith("</"):
            dalam -= 1
        else:
            dalam += 1
        hasil.append((m.start(), dalam, teks))
    return hasil


def _dalam_kartu(isi: str, awalan: str) -> bool:
    """
    Blok tombol berada di dalam sebuah kartu.

    Dihitung dari KEDALAMAN div yang sebenarnya, bukan dari selisih jumlah
    tag. Percobaan pertama memakai selisih, dan ia menuduh KEDUA formulir —
    termasuk yang sudah benar — sebab pembungkus halaman dan `<form>` sendiri
    sudah membuat selisihnya lebih dari satu.
    """
    tag = _kedalaman_div(isi)
    aksi = re.search(rf'<div class="{awalan}-actions"', isi)
    if not aksi:
        return False

    kedalaman_aksi = next(
        (d for pos, d, _ in tag if pos == aksi.start()), None
    )
    if kedalaman_aksi is None:
        return False

    # Kartu yang masih TERBUKA tepat sebelum blok tombolnya.
    terbuka = 0
    for pos, d, teks in tag:
        if pos >= aksi.start():
            break
        if f'{awalan}-card' in teks:
            terbuka = d
        elif teks.startswith("</") and terbuka and d < terbuka:
            terbuka = 0
    return terbuka > 0 and kedalaman_aksi > terbuka


def main() -> int:
    temuan: list[str] = []
    diperiksa = 0

    for rel, awalan, urutan in FORMULIR:
        f = AKAR / rel
        if not f.exists():
            temuan.append(f"{rel}: berkas tidak ditemukan")
            continue
        isi = f.read_text()
        diperiksa += 1

        muncul = [k for k in re.findall(r"\.(\w+)\b", isi) if k in urutan]
        pertama: list[str] = []
        for k in muncul:
            if k not in pertama:
                pertama.append(k)
        if pertama != urutan:
            temuan.append(
                f"{rel}: urutan seksinya {pertama}, seharusnya {urutan}"
            )

        if _dalam_kartu(isi, awalan):
            temuan.append(
                f"{rel}: blok tombol `.{awalan}-actions` berada DI DALAM kartu; "
                f"ia terbaca seolah menyimpan kartu itu saja"
            )

    print(f"urutanformcek: {diperiksa} formulir diperiksa")
    if diperiksa < 2:
        print("\nGAGAL MEMBACA: formulirnya tidak ketemu; perbaiki pemeriksanya.")
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
