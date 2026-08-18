"""
Pengisian alamat kirim yang tidak dapat berubah saat metodenya diganti.

Bawaannya Franco. Begitu pemasok dipilih, alamat proyek sudah terisi — dan
penjagaan "jangan timpa yang sudah diisi" justru menahan pengisian ulang saat
berpindah ke Loco. Alamat pengambilan tetap menunjuk lokasi proyek, dan tidak
ada satu pun galat.

Penjagaannya harus membedakan yang diisi SISTEM dari yang diketik ORANG:
yang pertama boleh ditulis ulang, yang kedua tidak. Diperiksa dengan mencari
`alamatBolehDiisiUlang()`, bukan pemeriksaan kosong yang telanjang.
"""

import re
import sys
from glob import glob

FE = 'src/app/pages/purchase-order'


def periksa(akar: str = FE) -> list[str]:
    masalah = []

    for p in sorted(glob(f'{akar}/**/*.component.ts', recursive=True)):
        s = open(p, errors='ignore').read()
        if 'selaraskanTerminLoco' not in s:
            continue
        # Hanya yang benar-benar MENGISI alamat.
        if 'deliveryAddress' not in s:
            continue
        if 'isi.deliveryAddress' not in s and 'deliveryAddress: alamat' not in s:
            continue

        nama = p.split('/')[-2]

        if 'alamatBolehDiisiUlang' not in s:
            masalah.append(
                f'{nama}: mengisi `deliveryAddress` tanpa membedakan isian '
                f'sistem dari isian orang — alamat tidak akan berubah saat '
                f'metode pengiriman diganti'
            )
            continue

        # Penjagaan lama yang tertinggal.
        if re.search(r"if \(!String\(v\.deliveryAddress \|\| ''\)\.trim\(\)\)", s):
            masalah.append(
                f'{nama}: masih ada penjagaan kosong telanjang pada '
                f'`deliveryAddress`; pakai `alamatBolehDiisiUlang()`'
            )

        # Penanda harus DIPERBARUI, bukan hanya dibaca.
        if 'this.alamatDariSistem =' not in s:
            masalah.append(
                f'{nama}: `alamatDariSistem` tidak pernah disetel, sehingga '
                f'penjagaannya selalu menganggap alamatnya diketik orang'
            )

    return masalah


if __name__ == '__main__':
    h = periksa()
    print(f'pengisian alamat kirim bermasalah: {len(h)}')
    print()
    for x in h[:20]:
        print(f'  {x}')
    sys.exit(1 if h else 0)
