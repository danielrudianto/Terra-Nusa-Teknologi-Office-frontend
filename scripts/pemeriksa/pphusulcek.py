"""
Kode PPh yang diusulkan tetapi tidak ada di daftar kodenya.

`usulan-pph.ts` menyebut kode objek pajak sebagai teks. Daftar kodenya di
`utils/pph.ts` berubah mengikuti peraturan — dan usulan yang menunjuk kode
terhapus tidak akan muncul sama sekali.

Diam-diam: pemilihnya melewati kode yang tidak ditemukan supaya tidak
menggagalkan seluruh dialognya. Yang mengisi karena itu kehilangan usulan
tanpa tahu bahwa dahulu ada.

Salah kode objek pajak tidak menghasilkan galat: dokumennya terbit, tarifnya
dihitung keliru, dan baru ketahuan saat pelaporan.
"""

import re
import sys

FE = 'src/app'
DAFTAR = f'{FE}/utils/pph.ts'
USULAN = f'{FE}/constants/usulan-pph.ts'


def periksa(akar: str = FE) -> list[str]:
    ada = set(re.findall(r"code: '([\d-]+)'", open(DAFTAR, errors='ignore').read()))
    s = open(USULAN, errors='ignore').read()

    masalah = []
    for m in re.finditer(r"code: '([\d-]+)',\s*\n\s*alasan: '([^']*)'", s):
        kode, alasan = m.group(1), m.group(2)
        if kode not in ada:
            masalah.append(
                f'usulan-pph.ts: kode `{kode}` tidak ada di daftar — '
                f'usulan "{alasan[:40]}" tidak akan muncul'
            )

    # Setiap usulan HARUS punya alasan.
    #
    # Kode tanpa alasan tidak menolong siapa pun: yang memilihnya di lapangan
    # bukan orang perpajakan, dan kode saja tidak memberi tahu kapan ia dipakai.
    tanpa_alasan = len(re.findall(r"code: '[\d-]+',", s)) - len(
        re.findall(r"code: '[\d-]+',\s*\n\s*alasan:", s))
    if tanpa_alasan > 0:
        masalah.append(
            f'usulan-pph.ts: {tanpa_alasan} usulan tanpa `alasan` — '
            f'kode saja tidak memberi tahu kapan ia dipakai'
        )

    return masalah


if __name__ == '__main__':
    h = periksa()
    print(f'usulan PPh bermasalah: {len(h)}')
    print()
    for x in h[:20]:
        print(f'  {x}')
    sys.exit(1 if h else 0)
