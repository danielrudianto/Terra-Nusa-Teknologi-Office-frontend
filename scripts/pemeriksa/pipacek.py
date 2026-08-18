"""
Pipe dipakai templat tetapi tidak didaftarkan komponennya.

Komponen standalone harus menyebut setiap pipe di `imports`. Yang lupa
menghasilkan `NG8004: No pipe found with name '...'` — dan galatnya baru
muncul saat `ng build`, yang memakan hampir satu menit sebelum gagal.

`modulcek` memeriksa elemen dan direktif, bukan pipe: `| shortCurrency`
tidak menyerupai tag mana pun, sehingga lolos sepenuhnya darinya.

Pipe bawaan Angular (`date`, `number`, `translate`, dan seterusnya) tidak
diperiksa — daftarnya diambil dari `src/app/pipes/` saja, yaitu yang memang
milik aplikasi ini.
"""

import os
import re
import sys
from glob import glob

FE = 'src/app'


def _pipe_aplikasi(akar: str) -> dict[str, str]:
    """Nama pipe -> nama kelasnya."""
    hasil = {}
    for p in glob(f'{akar}/pipes/*.ts'):
        s = open(p, errors='ignore').read()
        nama = re.search(r"name:\s*'(\w+)'", s)
        kelas = re.search(r'export class (\w+)', s)
        if nama and kelas:
            hasil[nama.group(1)] = kelas.group(1)
    return hasil


def periksa(akar: str = FE) -> list[str]:
    pipa = _pipe_aplikasi(akar)
    if not pipa:
        return []

    masalah = []
    for p in sorted(glob(f'{akar}/**/*.component.html', recursive=True)):
        ts = p[:-5] + '.ts'
        if not os.path.exists(ts):
            continue

        h = open(p, errors='ignore').read()
        t = open(ts, errors='ignore').read()

        for nama, kelas in pipa.items():
            # `| nama` dengan spasi bebas; batas kata mencegah `| shortCurrencyX`
            # ikut tertangkap.
            if not re.search(rf'\|\s*{nama}\b', h):
                continue
            # Diperiksa pada daftar `imports`, BUKAN seluruh berkas.
            #
            # Nama kelasnya juga muncul di baris `import` di atas, dan berkas
            # yang mengimpornya tanpa mendaftarkannya justru keadaan yang
            # hendak ditemukan pemeriksa ini.
            daftar = re.search(r'imports:\s*\[([\s\S]*?)\]', t)
            if daftar and kelas in daftar.group(1):
                continue
            baris = h[: re.search(rf'\|\s*{nama}\b', h).start()].count('\n') + 1
            nama_berkas = p.replace(akar + '/', '')
            masalah.append(
                f'{nama_berkas}:{baris}: `{nama}` dipakai tetapi '
                f'`{kelas}` tidak ada di `imports`'
            )

    return masalah


if __name__ == '__main__':
    h = periksa()
    print(f'pipe tak terdaftar: {len(h)}')
    print()
    for x in h[:20]:
        print(f'  {x}')
    sys.exit(1 if h else 0)
