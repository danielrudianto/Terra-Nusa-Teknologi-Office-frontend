"""
Variabel warna yang dipakai tetapi tidak pernah didefinisikan.

`var(--nama, cadangan)` tidak menghasilkan galat bila `--nama` tidak ada — ia
diam-diam memakai cadangannya. Akibatnya dua komponen yang bermaksud memakai
warna yang sama tampil berbeda, dan bedanya baru terlihat ketika keduanya
kebetulan dilihat berdampingan.

Sudah terjadi pada `--brand-ink`: delapan komponen memakainya, tidak satu pun
mendapat warnanya, dan bannernya tampil jauh lebih gelap daripada banner lain
di aplikasi yang sama.

Yang DILEWATI: variabel yang disetel saat berjalan lewat `style.setProperty`.
Ia memang tidak ada di berkas gaya, dan itu disengaja.
"""

import re
import sys
from glob import glob

FE = 'src'


def periksa(akar: str = FE) -> list[str]:
    # Yang didefinisikan di berkas gaya mana pun.
    didefinisikan: set[str] = set()
    for p in glob(f'{akar}/**/*.scss', recursive=True) + glob(
        f'{akar}/**/*.css', recursive=True
    ):
        s = open(p, errors='ignore').read()
        didefinisikan.update(re.findall(r'(--[\w-]+):\s*[^;]+;', s))

    # Yang disetel saat berjalan; sah walau tidak ada di berkas gaya.
    #
    # Dua jalur: `style.setProperty` dari TypeScript, dan atribut `style`
    # pada templat — keduanya menyetel variabelnya pada elemen, bukan pada
    # lembar gaya, sehingga tidak akan pernah ditemukan pencarian di atas.
    for p in glob(f'{akar}/**/*.ts', recursive=True) + glob(
        f'{akar}/**/*.html', recursive=True
    ):
        s = open(p, errors='ignore').read()
        didefinisikan.update(re.findall(r"setProperty\(\s*['\"](--[\w-]+)", s))
        # `[ngStyle]="{ '--nama': ... }"` dan `[style.--nama]`.
        didefinisikan.update(re.findall(r"['\"](--[\w-]+)['\"]\s*:", s))
        didefinisikan.update(re.findall(r'style\.(--[\w-]+)', s))

    masalah = []
    terlihat: set[str] = set()
    for p in sorted(glob(f'{akar}/app/**/*.scss', recursive=True)):
        s = open(p, errors='ignore').read()
        for m in re.finditer(r'var\((--[\w-]+)', s):
            nama = m.group(1)
            if nama in didefinisikan or nama in terlihat:
                continue
            terlihat.add(nama)
            masalah.append(
                f'{nama} dipakai tetapi tidak pernah didefinisikan — '
                f'seluruh pemakainya memakai nilai cadangan'
            )

    return masalah


def periksa_pasangan_gelap(akar: str = FE) -> list[str]:
    """
    Variabel warna yang punya nilai TERANG tetapi tidak punya pasangan gelap.

    Tema gelap menimpa `--brand-soft` menjadi latar gelap, tetapi tintanya
    tetap memakai nilai terang — dan teks biru tua di atas latar biru gelap
    berkontras 1,65:1, di bawah ambang WCAG 4,5:1.

    Tidak ada galat: bannernya tampil, dan yang membacanya menyimpulkan
    warnanya memang begitu.
    """
    s = open(f'{akar}/styles.scss', errors='ignore').read()
    if 'html[data-theme="dark"]' not in s:
        return []

    # Batas blok gelap dicari SEBELUM komentar dibuang.
    #
    # Penandanya `DARK OVERRIDES` justru berada DI DALAM komentar; membuang
    # komentar lebih dulu menghapus penandanya, dan pemeriksanya berhenti
    # tanpa memeriksa apa pun.
    #
    # `html[data-theme="dark"]` sendiri muncul beberapa kali di berkas ini —
    # yang pertama jauh sebelum daftar warnanya, sehingga memakai penyebutan
    # pertama membuat seluruh variabel terbaca "sudah di bagian gelap".
    m = re.search(r'DARK OVERRIDES[\s\S]*?html\[data-theme="dark"\]\s*\{', s)
    if not m:
        return []
    batas = m.start()

    # Komentar dibuang SESUDAHNYA, pada kedua bagian secara terpisah.
    #
    # `/* ... */` di antara dua deklarasi membuat pola `[^;]+` menyeberang ke
    # deklarasi berikutnya, dan nilainya terbaca sebagai teks panjang yang
    # tidak cocok dengan pola warna.
    buang = lambda x: re.sub(r'/\*[\s\S]*?\*/', '', x)
    bagian_terang = buang(s[:batas])
    bagian_gelap = buang(s[batas:])

    terang = dict(re.findall(r'(--[\w-]+):\s*([^;]+);', bagian_terang))
    gelap = set(re.findall(r'(--[\w-]+):', bagian_gelap))

    masalah = []
    for nama, nilai in terang.items():
        if nama in gelap:
            continue
        # Hanya yang berupa warna; ukuran dan skala tidak perlu pasangan.
        if not re.match(r'#[0-9a-fA-F]{3,8}$|rgba?\(', nilai.strip()):
            continue
        masalah.append(
            f'{nama} punya nilai terang ({nilai.strip()}) tetapi tidak '
            f'ditimpa di tema gelap'
        )
    return masalah


if __name__ == '__main__':
    h = periksa() + periksa_pasangan_gelap()
    print(f'variabel warna bermasalah: {len(h)}')
    print()
    for x in h[:20]:
        print(f'  {x}')
    sys.exit(1 if h else 0)
