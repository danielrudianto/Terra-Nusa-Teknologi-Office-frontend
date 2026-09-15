"""
Cetak PO-B tanpa menamai baris mobilisasi.

SEBELUMNYA pemeriksa ini menjaga hal lain: mobilisasi menumpang pada
`remarks_4`/`remarks_5` baris alatnya dan sama sekali BUKAN baris, sehingga
tiap pemanggilan `printPurchaseOrderB` harus memekarkannya sendiri — dan yang
lupa menerbitkan dokumen tanpa mobilisasi, bernilai lebih kecil daripada yang
sudah ditandatangani vendor.

Penumpangan itu sudah dibongkar: mobilisasi kini baris sungguhan di
`purchase_order_items`, dengan `itemKind` dan `parentItemID`. Nilainya ikut
terjumlah seperti baris lain, dan tidak ada lagi yang dapat lupa memekarkan.

Yang TERSISA untuk dijaga adalah namanya. Yang tersimpan sengaja seadanya —
"Mobilisasi" — karena nama alatnya ada di baris induknya dan menyalinnya
berarti dokumen menyimpan nama yang dapat berbeda dari master bila master itu
diperbaiki. Nama lengkapnya ("Mobilisasi Crane 25T sesuai pada nomor 4")
disusun `namaiBarisMobilisasi` saat mencetak.

Yang lupa memanggilnya menerbitkan SPK dengan deretan baris bernama
"Mobilisasi" polos — nilainya benar, totalnya benar, tetapi vendor tidak dapat
mengetahui alat mana yang dimaksud, pada dokumen yang justru dipakainya untuk
merujuk baris dalam invoice.

Gejalanya tidak muncul sebagai galat apa pun.
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

            # Yang tidak menyebut `items` mewarisi dari objek lain; penamaan
            # sudah terjadi di sana.
            if 'items:' not in blok:
                continue

            # Varian LAIN yang meminjam tata letak SPK.
            #
            # `printPurchaseOrderB` dipakai juga oleh perangkat lunak (5.1.12),
            # pertanggungan (6.4.2), dan pelatihan (6.5.2) — semuanya jasa,
            # tanpa alat, tanpa mobilisasi. Menuntut penamaan di sana hanya
            # menghasilkan temuan keliru yang membuat pemeriksa ini berhenti
            # dibaca.
            #
            # Dikenali dari isi barisnya: yang menyebut `equipment_name`,
            # `itemKind`, atau `mobilisasi` memang membawa alat.
            if not re.search(r'equipment_name|itemKind|mobilisasi', blok, re.I):
                continue

            baris = s[:m.start()].count('\n') + 1
            nama = p.replace(akar + '/', '')

            if 'namaiBarisMobilisasi' not in blok:
                masalah.append(
                    f'{nama}:{baris}: `printPurchaseOrderB` tidak menamai '
                    f'baris mobilisasi — tercetak "Mobilisasi" tanpa alatnya'
                )
            elif not re.search(r'\bitemKind\b', blok):
                masalah.append(
                    f'{nama}:{baris}: menamai tetapi tidak meneruskan '
                    f'`itemKind` — tidak ada yang dikenali sebagai baris anak'
                )
            elif not re.search(r'\bparentItemID\b', blok):
                masalah.append(
                    f'{nama}:{baris}: meneruskan `itemKind` tanpa '
                    f'`parentItemID` — namanya tidak menyebut alat mana pun'
                )

    return masalah


if __name__ == '__main__':
    h = periksa()
    print(f'cetak PO-B tanpa nama mobilisasi: {len(h)}')
    print()
    for x in h[:20]:
        print(f'  {x}')
    sys.exit(1 if h else 0)
