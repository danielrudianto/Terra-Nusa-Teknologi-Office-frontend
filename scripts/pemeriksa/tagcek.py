"""
Tag HTML yang tidak berpasangan pada templat.

`blokcek` memeriksa blok kendali Angular (`@if`, `@for`), BUKAN tag HTML —
templat yang `<form>`-nya tertutup di tempat yang salah lolos sepenuhnya
darinya, dan galatnya baru muncul saat `ng serve` sebagai `NG5002`, setelah
tiga puluh detik membangun.

Sudah terjadi saat membongkar stepper formulir pembelian: penggantian yang
memakan satu tag pembuka membuat seluruh sisa berkas bergeser, dan pesan
Angular menunjuk baris yang jauh dari sebabnya.
"""

import re
import sys
from glob import glob

FE = 'src/app'

#: Tag yang memang tidak punya penutup.
KOSONG = {
    'input', 'img', 'br', 'hr', 'meta', 'link', 'source', 'area',
    'base', 'col', 'embed', 'param', 'track', 'wbr',
}


def periksa_satu(teks: str) -> str | None:
    """Kembalikan keterangan masalah pertama, atau None bila seimbang."""
    # Komentar dibuang lebih dulu: tag di dalamnya bukan tag sungguhan, dan
    # contoh potongan HTML di komentar kerap sengaja tidak lengkap.
    bersih = re.sub(r'<!--[\s\S]*?-->', lambda m: '\n' * m.group(0).count('\n'),
                    teks)

    tumpuk: list[tuple[str, int]] = []
    for m in re.finditer(r'<(/?)([a-zA-Z][\w-]*)([^>]*?)(/?)>', bersih):
        tutup, nama, _atr, mandiri = m.groups()
        if nama.lower() in KOSONG or mandiri:
            continue
        baris = bersih[: m.start()].count('\n') + 1
        if not tutup:
            tumpuk.append((nama, baris))
            continue
        if tumpuk and tumpuk[-1][0] == nama:
            tumpuk.pop()
            continue
        atas = tumpuk[-1] if tumpuk else ('(tidak ada)', 0)
        return (
            f'baris {baris}: `</{nama}>` menutup, tetapi yang terbuka '
            f'`<{atas[0]}>` dari baris {atas[1]}'
        )

    if tumpuk:
        nama, baris = tumpuk[0]
        return f'baris {baris}: `<{nama}>` tidak pernah ditutup'
    return None


def periksa(akar: str = FE) -> list[str]:
    masalah = []
    for p in sorted(glob(f'{akar}/**/*.html', recursive=True)):
        h = open(p, errors='ignore').read()
        hasil = periksa_satu(h)
        if hasil:
            masalah.append(f'{p.replace(akar + "/", "")}: {hasil}')
    return masalah


if __name__ == '__main__':
    h = periksa()
    print(f'templat dengan tag tak berpasangan: {len(h)}')
    print()
    for x in h[:20]:
        print(f'  {x}')
    sys.exit(1 if h else 0)
