"""
Hint keterangan pada isian ber-autocomplete.

`mat-hint` tercetak tepat di bawah kotak isian — dan itu persis tempat daftar
saran autocomplete muncul. Begitu daftarnya terbuka, hintnya tertutup: pada
saat keterangannya paling diperlukan, yaitu ketika orang sedang memilih.

Keterangan semacam itu harus berupa BANNER di bawah isiannya, bukan hint.

Yang TIDAK dihitung: penghitung dan penanda memuat — "3/5", "Memuat…" —
karena isinya pendek, berubah-ubah, dan tidak menjelaskan apa pun yang perlu
dibaca saat memilih.

Sudah disebut dua kali oleh pemilik sebelum dikerjakan menyeluruh.
"""

import re
import sys
from glob import glob

FE = 'src/app'

# Hint yang wajar tetap berupa hint: pendek dan bukan kalimat.
SEPELE = re.compile(
    # penanda memuat
    r'(loading|memuat)'
    # penghitung: dua interpolasi dipisah garis miring, spasi bebas
    r'|\}\}\s*/\s*\{\{'
    # penghitung tanpa spasi di sekitar garis miringnya
    r'|\}\}/\{\{',
    re.I | re.S,
)


def periksa(akar: str = FE) -> list[str]:
    masalah = []

    for p in sorted(glob(f'{akar}/**/*.component.html', recursive=True)):
        s = open(p, errors='ignore').read()
        for m in re.finditer(r'<mat-form-field[\s\S]*?</mat-form-field>', s):
            blok = m.group(0)
            if 'matAutocomplete' not in blok:
                continue
            h = re.search(r'<mat-hint[^>]*>([\s\S]*?)</mat-hint>', blok)
            if not h:
                continue
            isi = h.group(1)
            # Spasi dan baris baru dinormalkan lebih dulu; hint kerap
            # ditulis memanjang beberapa baris oleh pemformat kode.
            rata = ' '.join(isi.split())
            if SEPELE.search(rata):
                continue

            baris = s[:m.start()].count('\n') + 1
            nama = p.replace(akar + '/', '')
            masalah.append(
                f'{nama}:{baris}: hint pada isian autocomplete — '
                f'tertutup daftar saran; pakai banner'
            )

    return masalah


if __name__ == '__main__':
    h = periksa()
    print(f'hint tertutup autocomplete: {len(h)}')
    print()
    for x in h[:20]:
        print(f'  {x}')
    sys.exit(1 if h else 0)
