"""
Nilai ExcelJS yang tidak lolos pemeriksa tipe.

Beberapa opsi ExcelJS diketik sebagai enum, bukan angka — `paperSize: 8`
untuk A3 tampak wajar dan memang benar di `xlsx`, tetapi ditolak ExcelJS
dengan `Type '8' is not assignable to type 'PaperSize'`.

Galatnya baru muncul saat `ng build`, dan build produksi memakan hampir satu
menit sebelum gagal. Pemeriksa ini menemukannya dalam sekejap.

Yang dijaga hanya nilai yang PERNAH salah, bukan seluruh permukaan ExcelJS:
daftar yang menebak-nebak akan berisik, dan pemeriksa yang berisik diabaikan.
"""

import re
import sys
from glob import glob

FE = 'src/app'

#: Opsi bertipe enum; angka telanjang ditolak pemeriksa tipe.
ENUM = ('paperSize',)


def periksa(akar: str = FE) -> list[str]:
    masalah = []

    for p in sorted(glob(f'{akar}/**/*.ts', recursive=True)):
        s = open(p, errors='ignore').read()
        if 'exceljs' not in s.lower():
            continue

        # Komentar dibuang: penjelasan mengapa sesuatu TIDAK dipakai kerap
        # menyebut namanya, dan menandainya membuat pemeriksa ini berisik
        # justru terhadap kode yang sudah benar.
        bersih = re.sub(r'/\*[\s\S]*?\*/', '', s)
        bersih = re.sub(r'//[^\n]*', '', bersih)

        for opsi in ENUM:
            for m in re.finditer(rf'\b{opsi}\s*:\s*(\d+)', bersih):
                baris = bersih[: m.start()].count('\n') + 1
                nama = p.replace(akar + '/', '')
                masalah.append(
                    f'{nama}:{baris}: `{opsi}: {m.group(1)}` — ExcelJS '
                    f'mengetiknya sebagai enum, bukan angka'
                )

    return masalah


if __name__ == '__main__':
    h = periksa()
    print(f'nilai ExcelJS bertipe salah: {len(h)}')
    print()
    for x in h[:20]:
        print(f'  {x}')
    sys.exit(1 if h else 0)
