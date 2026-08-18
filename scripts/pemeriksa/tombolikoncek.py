"""
Tombol ikon yang dikecilkan tanpa memusatkan ulang isinya.

Material menghitung letak ikon dari ukuran bawaannya: ikon 24px di dalam
tombol 40px. Mengecilkan tombolnya lewat `width`/`height` saja tidak
menyetel ulang perhitungan itu — ikonnya tetap diletakkan seolah tombolnya
masih 40px, dan turun ke bawah.

Tidak ada galat, dan pada tangkapan layar kecil pun sulit terlihat. Yang
memakainya melihat ikon yang "meleset dari tombolnya" dan menyimpulkan
layarnya rusak.

Perbaikannya `display: inline-flex` beserta pemusatan, dan `line-height: 0`.

Sudah terjadi pada empat tombol: salin nomor pembayaran, menu agenda,
hapus tanggal cut-off, dan tombol mini pemasok.
"""

import re
import sys
from glob import glob

FE = 'src/app'


def periksa(akar: str = FE) -> list[str]:
    # Kelas yang benar-benar dipakai pada `mat-icon-button`.
    #
    # Kelas pada elemen lain tidak dihitung: `.mat-icon` berukuran kecil
    # adalah hal biasa dan tidak bermasalah — yang bermasalah hanya TOMBOL
    # yang dikecilkan.
    tombol: set[str] = set()
    for p in sorted(glob(f'{akar}/**/*.component.html', recursive=True)):
        s = open(p, errors='ignore').read()
        for m in re.finditer(r'<button\b[^>]*mat-icon-button[^>]*>', s):
            for k in re.findall(r'class="([^"]*)"', m.group(0)):
                tombol.update(k.split())

    masalah = []
    for p in sorted(glob(f'{akar}/**/*.component.scss', recursive=True)):
        s = open(p, errors='ignore').read()
        for m in re.finditer(r'\.([\w-]+)\s*\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}', s):
            kelas, isi = m.group(1), m.group(2)
            if kelas not in tombol:
                continue
            mw = re.search(r'\bwidth:\s*(\d+)px', isi)
            # 40px ukuran bawaan Material; yang lebih besar tidak menggeser.
            if not mw or int(mw.group(1)) >= 40:
                continue
            if 'inline-flex' in isi or 'place-items' in isi:
                continue

            baris = s[:m.start()].count('\n') + 1
            nama = p.replace(akar + '/', '')
            masalah.append(
                f'{nama}:{baris}: `.{kelas}` tombol ikon {mw.group(1)}px '
                f'tanpa pemusatan ulang — ikonnya akan turun ke bawah'
            )

    return masalah


if __name__ == '__main__':
    h = periksa()
    print(f'tombol ikon meleset: {len(h)}')
    print()
    for x in h[:20]:
        print(f'  {x}')
    sys.exit(1 if h else 0)
