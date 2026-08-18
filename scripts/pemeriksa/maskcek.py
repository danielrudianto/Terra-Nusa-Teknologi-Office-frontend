"""
Isian bermask yang bertipe `number`.

`ngx-mask` menulis teks berformat ke dalam kotaknya — "Rp. 1 000 000". Isian
bertipe `number` MENOLAK teks semacam itu: peramban hanya menerima angka
polos, sehingga masknya tidak pernah tampak.

Tidak ada galat, tidak ada peringatan. Atributnya terpasang lengkap dan
terbaca benar di kode; yang mengisinya hanya melihat angka polos dan mengira
mask itu memang belum dipasang.

Sudah terjadi pada lima isian nominal — nilai kontrak, nilai aset, dan
pinjaman.
"""

import re
import sys
from glob import glob

FE = 'src/app'


def periksa(akar: str = FE) -> list[str]:
    masalah = []

    for p in sorted(glob(f'{akar}/**/*.component.html', recursive=True)):
        s = open(p, errors='ignore').read()

        # ---------------------------------------------------------------
        # Komponen memakai `mask` tetapi tidak mengimpor direktifnya.
        #
        # Tanpa `NgxMaskDirective` di `imports` DAN `provideNgxMask()` di
        # `providers`, atribut `mask` hanya teks yang diabaikan Angular:
        # tidak ada galat, tidak ada peringatan, dan isiannya menampilkan
        # angka polos seolah masknya memang belum dipasang.
        #
        # Sudah terjadi pada delapan komponen sekaligus — termasuk nilai
        # kontrak, yang paling sering dibaca.
        # ---------------------------------------------------------------
        if 'mask=' in s:
            ts = p.replace('.html', '.ts')
            try:
                t = open(ts, errors='ignore').read()
            except FileNotFoundError:
                t = ''
            nama = p.replace(akar + '/', '')
            if 'NgxMaskDirective' not in t:
                masalah.append(
                    f'{nama}: memakai `mask` tetapi komponennya tidak '
                    f'mengimpor `NgxMaskDirective`'
                )
            elif 'provideNgxMask()' not in t:
                masalah.append(
                    f'{nama}: mengimpor `NgxMaskDirective` tetapi tidak '
                    f'menyediakan `provideNgxMask()`'
                )

        for m in re.finditer(r'<input\b[^>]*>', s):
            tag = m.group(0)
            if 'mask=' not in tag or 'type="number"' not in tag:
                continue
            ctrl = re.search(r'formControlName="(\w+)"', tag)
            baris = s[:m.start()].count('\n') + 1
            nama = p.replace(akar + '/', '')
            masalah.append(
                f'{nama}:{baris}: `{ctrl.group(1) if ctrl else "?"}` '
                f'memakai mask tetapi bertipe number — masknya tidak tampak'
            )

    return masalah


if __name__ == '__main__':
    h = periksa()
    print(f'mask pada isian number: {len(h)}')
    print()
    for x in h[:20]:
        print(f'  {x}')
    sys.exit(1 if h else 0)
