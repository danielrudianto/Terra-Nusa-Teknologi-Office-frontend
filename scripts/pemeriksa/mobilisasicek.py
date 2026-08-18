"""
Cetak PO-B tanpa memekarkan mobilisasi.

Mobilisasi dan demobilisasi menumpang pada `remarks_4` dan `remarks_5` baris
alatnya, dan dicetak sebagai baris bernomor tersendiri lewat
`perluasItemMobilisasi`. Yang menjumlah — dokumen maupun pratinjau — menghitung
`quantity * price` per baris, sehingga keduanya TIDAK ikut selama masih
menumpang.

Setiap pemanggilan `printPurchaseOrderB` karena itu harus memekarkan lebih
dulu, DAN meneruskan `remarks_4` serta `remarks_5` — tanpa keduanya fungsi
pemekaran tidak menemukan nilainya dan diam-diam tidak memekarkan apa pun.

Gejalanya: cetak ulang bernilai lebih kecil daripada dokumen yang sudah
ditandatangani vendor, dan selisihnya tampak seperti kesalahan hitung pada
lembar yang seharusnya identik.

Sudah terjadi pada cetak ulang dari daftar.
"""

import re
import sys
from glob import glob

FE = 'src/app'


def periksa(akar: str = FE) -> list[str]:
    masalah = []

    for p in sorted(glob(f'{akar}/**/*.ts', recursive=True)):
        if p.endswith('.spec.ts'):
            continue
        s = open(p, errors='ignore').read()

        for m in re.finditer(r'printPurchaseOrderB\(', s):
            # Batas argumennya: sampai kurung penutup yang seimbang.
            dalam = 0
            akhir = m.end()
            for n, ch in enumerate(s[m.end() - 1:], start=m.end() - 1):
                if ch == '(':
                    dalam += 1
                elif ch == ')':
                    dalam -= 1
                    if dalam == 0:
                        akhir = n
                        break
            blok = s[m.start():akhir]

            # Yang tidak menyebut `items` mewarisi dari objek lain; pemekaran
            # sudah terjadi di sana.
            if 'items:' not in blok:
                continue

            # Varian LAIN yang meminjam tata letak SPK.
            #
            # `printPurchaseOrderB` dipakai juga oleh perangkat lunak (5.1.12),
            # pertanggungan (6.4.2), dan pelatihan (6.5.2) — semuanya jasa,
            # tanpa alat, tanpa mobilisasi. Menuntut pemekaran di sana hanya
            # menghasilkan temuan keliru yang membuat pemeriksa ini berhenti
            # dibaca.
            #
            # Dikenali dari isi barisnya: yang menyebut `equipment_name` atau
            # `remarks_4` memang membawa alat.
            if not re.search(r'equipment_name|remarks_4|mobilisasi', blok, re.I):
                continue

            baris = s[:m.start()].count('\n') + 1
            nama = p.replace(akar + '/', '')

            if 'perluasItemMobilisasi' not in blok:
                masalah.append(
                    f'{nama}:{baris}: `printPurchaseOrderB` tidak memekarkan '
                    f'mobilisasi — nilainya hilang dari dokumen'
                )
            elif 'remarks_4' not in blok:
                masalah.append(
                    f'{nama}:{baris}: memekarkan tetapi tidak meneruskan '
                    f'`remarks_4` — tidak ada yang dipekarkan'
                )

    return masalah


if __name__ == '__main__':
    h = periksa()
    print(f'cetak PO-B tanpa mobilisasi: {len(h)}')
    print()
    for x in h[:20]:
        print(f'  {x}')
    sys.exit(1 if h else 0)
