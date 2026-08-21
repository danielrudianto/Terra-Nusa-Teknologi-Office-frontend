#!/usr/bin/env python3
"""
Periksa ketelitian desimal pada isian NOMINAL di layar berpajak.

Sejak PPN 11%, nilai yang dihitung mundur dari total faktur — DPP = total ÷
1,11 — hampir tidak pernah menghasilkan dua desimal. Isian nominal pada layar
yang memuat PPN karena itu menampung EMPAT desimal, bukan dua.

Yang dijaga di sini keseragamannya. Satu isian yang tertinggal di dua desimal
tidak menimbulkan galat apa pun: ia hanya memotong angka yang diketik, dan
selisihnya baru muncul kemudian sebagai selisih rekonsiliasi yang harus dicari
orang. Isian nominal berdampingan dengan ketelitian berbeda lebih buruk lagi —
totalnya tidak sama dengan jumlah bagiannya, dan tidak ada yang tahu sebabnya.

Cara mengenali isian nominal: ada awalan "Rp" padanya, entah lewat atribut
`prefix` maupun elemen `matTextPrefix` di sebelahnya. Isian PERSENTASE tidak
berawalan Rp dan sengaja tetap dua desimal — tarif pajak memang ditulis dua
desimal.

Layar di luar daftar ini tidak diperiksa: slip gaji, pinjaman, dan aset tidak
memuat perhitungan PPN, dan empat desimal di sana hanya menambah keriuhan.
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

AKAR = Path(__file__).resolve().parents[2]

#: Layar yang memuat perhitungan PPN.
LAYAR = [
    "pages/purchase/purchase-create/purchase-create",
    "pages/purchase/purchase-update-status/purchase-update-status",
    "pages/purchase-draft/purchase-draft-convert/purchase-draft-convert",
    "pages/purchase-draft/purchase-draft-create/purchase-draft-create",
    "pages/purchase-order/purchase-order-create/purchase-order-create-b/"
    "purchase-order-create-b",
    "pages/sales-invoice/sales-invoice-create/sales-invoice-create",
    "pages/expense/expense-create/expense-create",
]

DESIMAL_NOMINAL = "4"

#: Kendali berisi PERSENTASE; dua desimal memang cukup untuk tarif pajak.
PERSEN = {"ppn", "pphPercentage"}

INPUT = re.compile(r"<input\b[^>]*?/?>", re.S)
KENDALI = re.compile(r'formControlName="(\w+)"')
# Dua cara membatasi desimal di aplikasi ini, dan KEDUANYA harus diperiksa:
#   decimalScale="4"      — atribut ngx-mask tersendiri
#   mask="separator.4"    — jumlah desimal ditulis di dalam pola masknya
# Sebelumnya hanya bentuk pertama yang dibaca, sehingga isian ber-`separator.2`
# lolos: harga satuan empat desimal dipotong menjadi dua tanpa peringatan —
# 42,8571 tercatat 42,85 — dan pemeriksa tetap hijau.
SKALA = re.compile(r'decimalScale="(\d+)"')
SKALA_MASK = re.compile(r'mask="separator\.(\d+)"')


def berawalan_rupiah(html: str, akhir_input: int, blok: str) -> bool:
    """Apakah isian ini bernominal rupiah.

    Dua bentuk dipakai di aplikasi ini: atribut `prefix="Rp. "` pada
    `<input>`, dan elemen `<span matTextPrefix>Rp&nbsp;</span>` sesudahnya.
    """
    if re.search(r'prefix="[^"]*Rp', blok):
        return True
    # Elemen awalan ditulis sesudah `<input>`, di dalam form-field yang sama.
    ekor = html[akhir_input : akhir_input + 200]
    return bool(re.search(r"matTextPrefix[^>]*>\s*Rp", ekor))


def periksa(jalur: str) -> list[str]:
    berkas = AKAR / "src" / "app" / f"{jalur}.component.html"
    if not berkas.exists():
        return [f"{jalur}: berkas tidak ditemukan — daftar layar perlu diperbarui"]

    html = berkas.read_text(encoding="utf-8", errors="ignore")
    temuan = []
    for m in INPUT.finditer(html):
        blok = m.group(0)
        # Skala dari `decimalScale=` bila ada, kalau tidak dari pola masknya.
        skala = SKALA.search(blok) or SKALA_MASK.search(blok)
        if not skala:
            continue

        kendali = KENDALI.search(blok)
        nama = kendali.group(1) if kendali else "?"

        if nama in PERSEN:
            # Tarif pajak: dua desimal memang yang dikehendaki.
            if skala.group(1) != "2":
                baris = html[: m.start()].count("\n") + 1
                temuan.append(
                    f"{berkas.relative_to(AKAR)}:{baris}: `{nama}` tarif pajak "
                    f"memakai {skala.group(1)} desimal, seharusnya 2"
                )
            continue

        if not berawalan_rupiah(html, m.end(), blok):
            continue

        if skala.group(1) != DESIMAL_NOMINAL:
            baris = html[: m.start()].count("\n") + 1
            temuan.append(
                f"{berkas.relative_to(AKAR)}:{baris}: `{nama}` bernominal rupiah "
                f"tetapi hanya {skala.group(1)} desimal — angka yang diketik "
                f"akan dipotong tanpa peringatan"
            )
    return temuan


def main() -> int:
    semua = []
    for jalur in LAYAR:
        semua.extend(periksa(jalur))

    if semua:
        print("desimalcek: ketelitian isian nominal tidak seragam")
        for t in semua:
            print("  " + t)
        return 1

    print("desimalcek: seluruh isian nominal pada layar berpajak memakai 4 desimal")
    return 0


if __name__ == "__main__":
    sys.exit(main())
