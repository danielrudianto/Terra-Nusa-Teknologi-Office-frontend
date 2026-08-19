#!/usr/bin/env python3
"""
Kode objek PPh harus tampil berdasarkan KODENYA, bukan nominalnya.

Tarif nol itu sah. `21-100-35` — upah pegawai tidak tetap yang dibayarkan
bulanan — bertarif nol, dan itu kode yang paling sering dipakai pada SPK
tenaga kerja. Menyembunyikan keterangannya ketika potongannya nol berarti
menyembunyikannya justru pada dokumen yang paling banyak memakainya.

Lebih jauh: pada potongan nol, kodenya JUSTRU yang membedakan "sudah
ditentukan, tarifnya memang nol" dari "belum ditentukan". Tanpa kodenya
keduanya terbaca sama — "PPh − Rp 0" — dan yang membayar tidak punya cara
membedakannya.

Karena itu syarat tampilnya harus menguji `pphCode`, bukan `pph`,
`pphValue`, maupun `pphPercentage`.

Diperiksa pada layar yang menampilkan blok kode PPh: dialog pembayaran
pembelian dan pengeluaran, serta layar lihat pembelian.
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

AKAR = Path(__file__).resolve().parents[2]

#: Templat yang memuat blok kode PPh.
LAYAR = [
    "components/payment-create/purchase-payment-create/"
    "purchase-payment-create.component",
    "components/payment-create/expense-payment-create/"
    "expense-payment-create.component",
    "pages/purchase/purchase-view/purchase-view.component",
]

#: Kelas pembungkus blok kode PPh; salah satunya harus ada.
KELAS = ("pph-kode", "pv-pph")

#: Nilai yang TIDAK boleh menjadi syarat tampil — semuanya nominal/tarif.
NOMINAL = ("pphValue", "pphPercentage")


def _syarat_di_atas(baris: list[str], n: int) -> str:
    """Syarat `@if`/`*ngIf` terdekat di atas baris ke-n."""
    for i in range(n, max(-1, n - 12), -1):
        m = re.search(r'@if\s*\((.*?)\)\s*\{', baris[i])
        if m:
            return m.group(1)
        m = re.search(r'\*ngIf\s*=\s*"([^"]*)"', baris[i])
        if m:
            return m.group(1)
    return ''


def periksa(jalur: str) -> list[str]:
    berkas = AKAR / "src" / "app" / f"{jalur}.html"
    if not berkas.exists():
        return [f"{jalur}: berkas tidak ditemukan — daftar layar perlu diperbarui"]

    baris = berkas.read_text(encoding="utf-8", errors="ignore").split("\n")
    temuan = []
    ketemu = False

    for n, b in enumerate(baris):
        if not any(f'class="{k}"' in b for k in KELAS):
            continue
        ketemu = True
        syarat = _syarat_di_atas(baris, n)

        if not syarat:
            temuan.append(
                f"{berkas.relative_to(AKAR)}:{n + 1}: blok kode PPh tanpa syarat "
                f"tampil — kode kosong akan tercetak sebagai petak kosong"
            )
            continue

        if "pphCode" in syarat or "pphLabel" in syarat:
            continue

        salah = [x for x in NOMINAL if x in syarat] or ["nilai potongannya"]
        temuan.append(
            f"{berkas.relative_to(AKAR)}:{n + 1}: blok kode PPh tampil "
            f"bergantung {salah[0]} (`{syarat.strip()}`) — seharusnya "
            f"`pphCode`; tarif nol itu sah dan kodenya tetap perlu terbaca"
        )

    if not ketemu:
        temuan.append(
            f"{berkas.relative_to(AKAR)}: blok kode PPh tidak ditemukan lagi — "
            f"dihapus, atau kelasnya berganti nama"
        )
    return temuan


def main() -> int:
    semua = []
    for jalur in LAYAR:
        semua.extend(periksa(jalur))

    if semua:
        print("pphtampilcek: syarat tampil kode PPh bermasalah")
        for t in semua:
            print("  " + t)
        return 1

    print("pphtampilcek: kode PPh tampil mengikuti kodenya, bukan nominalnya")
    return 0


if __name__ == "__main__":
    sys.exit(main())
