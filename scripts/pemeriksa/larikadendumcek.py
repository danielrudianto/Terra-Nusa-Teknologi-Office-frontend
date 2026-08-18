"""
FormArray yang tidak diisi saat memuat dokumen lama.

`isiFormulir` SENGAJA melewati setiap FormArray — bentuk barisnya berbeda-beda
antar varian, dan hanya layarnya yang tahu cara membangunnya. Konsekuensinya:
setiap FormArray harus diisi sendiri di dalam `muatAdendum`.

Yang terlewat menghasilkan adendum dengan bagian KOSONG. Tidak ada galat: yang
mengisinya menyimpulkan dokumen induknya memang tidak memuat apa pun, lalu
menerbitkan adendum yang kehilangan seluruh barisnya.

Sudah terjadi pada `testItems` di PO-F: adendum atas SPK pengujian terbit
tanpa satu pun baris pekerjaan, dan nilainya nol.
"""

import re
import sys
from glob import glob

FE = 'src/app'
VARIAN = f'{FE}/pages/purchase-order/purchase-order-create/*/*.component.ts'

# FormArray yang memang tidak perlu diwarisi.
#
# `additionalClauses` diisi terpisah lewat `larikCustom`; sisanya penolong
# tampilan yang isinya dihitung ulang saat layar dibuka.
DIKECUALIKAN = {'additionalClauses'}

# FormArray yang isinya DIHITUNG, bukan diketik.
#
# `kewajiban` dan `keterangan` pada PO-H disusun dari isian lain lewat getter
# pratinjau; memuatnya dari dokumen induk akan menggandakan poin bakunya
# setiap kali diadendum. Yang boleh disunting hanya bagian tambahannya, dan
# itu diwarisi terpisah.
DIHITUNG = {'kewajiban', 'keterangan'}


def periksa(pola: str = VARIAN) -> list[str]:
    masalah = []

    for p in sorted(glob(pola)):
        nama = p.split('/')[-2].replace('purchase-order-create-', 'PO-')
        s = open(p, errors='ignore').read()

        m = re.search(r'\n  (?:private |public )?muatAdendum\(\)[^\n{]*\{', s)
        if not m:
            continue
        j = s.find('\n      },\n      error:', m.start())
        blok = s[m.start():j] if j > 0 else s[m.start():]

        # FormArray pada formGroup
        larik = set(re.findall(r'^\s{4}(\w+): new FormArray', s, re.M))
        larik |= set(re.findall(r'^\s{4}(\w+): this\.formBuilder\.array', s, re.M))

        for k in sorted(larik - DIKECUALIKAN - DIHITUNG):
            # Diisi langsung dengan namanya, ATAU lewat getter yang
            # mengembalikannya.
            if f"'{k}'" in blok or f'.{k}.clear()' in blok:
                continue
            getter = re.search(
                rf"get (\w+)\(\)[^{{]*\{{\s*return this\.formGroup\.get\('{k}'\)", s)
            if getter and f'this.{getter.group(1)}.clear()' in blok:
                continue

            # Diisi lewat fungsi khusus yang dipanggil dari `muatAdendum`.
            #
            # PO-D memuat pekerjanya lewat `muatPekerjaan(induk)`, yang
            # mengelompokkan baris per tugas — bentuk yang tidak dapat
            # ditangani pengisian larik biasa.
            khusus = re.findall(r'this\.(\w+)\(induk\)', blok)
            if any(f"formGroup.get('{k}')" in s[s.index(f'{f}('):s.index(f'{f}(') + 3000]
                   for f in khusus if f'{f}(' in s):
                continue

            masalah.append(
                f'{nama}: FormArray `{k}` tidak diisi saat memuat dokumen '
                f'lama — bagiannya akan kosong pada adendum'
            )

    return masalah


if __name__ == '__main__':
    h = periksa()
    print(f'FormArray tak diisi saat adendum: {len(h)}')
    print()
    for x in h[:20]:
        print(f'  {x}')
    sys.exit(1 if h else 0)
