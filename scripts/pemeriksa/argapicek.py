"""
Pemanggilan `ApiService` dengan jumlah argumen yang salah.

`tipecek` menjalankan `tsc` pada berkas yang disebut saja dan TIDAK menelusuri
impornya — tandatangan `ApiService` karena itu tidak pernah diperiksa, dan
`get()` tanpa `queryParams` lolos sepenuhnya.

Baru ketahuan saat `ng build`, dan itu terlambat: build produksi memakan
hampir satu menit sebelum gagal.

Diperiksa dengan menghitung argumen pada tingkat kurung teratas, bukan
memisah dengan koma — template literal dan objek di dalamnya memuat koma
yang bukan pemisah argumen.
"""

import re
import sys
from glob import glob

FE = 'src/app'
LAYANAN = f'{FE}/services/api.service.ts'


def _tandatangan() -> dict[str, int]:
    """Nama metode -> jumlah argumen WAJIB pada `ApiService`."""
    s = open(LAYANAN, errors='ignore').read()
    hasil = {}
    for m in re.finditer(r'\n  (\w+)\(([^)]*)\)\s*\{', s):
        nama, arg = m.group(1), m.group(2).strip()
        if not arg:
            hasil[nama] = 0
            continue
        # Argumen bernilai bawaan atau bertanda `?` tidak wajib.
        wajib = [a for a in arg.split(',')
                 if '=' not in a and '?' not in a.split(':')[0]]
        hasil[nama] = len(wajib)
    return hasil


def _hitung_argumen(s: str, mulai: int) -> int:
    """Jumlah argumen pada pemanggilan yang kurung bukanya di `mulai`."""
    dalam = 0
    n = 1
    kutip = None
    for ch in s[mulai:]:
        if kutip:
            if ch == kutip:
                kutip = None
            continue
        if ch in '\'"`':
            kutip = ch
        elif ch in '([{':
            dalam += 1
        elif ch in ')]}':
            dalam -= 1
            if dalam == 0:
                break
        elif ch == ',' and dalam == 1:
            n += 1
    return n


def periksa(akar: str = FE) -> list[str]:
    tanda = _tandatangan()
    masalah = []

    for p in sorted(glob(f'{akar}/**/*.ts', recursive=True)):
        if p.endswith(('.spec.ts', 'api.service.ts')):
            continue
        s = open(p, errors='ignore').read()

        for m in re.finditer(r'apiService\s*\.\s*(\w+)\s*\(', s):
            metode = m.group(1)
            if metode not in tanda:
                continue
            # Pemanggilan tanpa argumen sama sekali.
            if re.match(r'\s*\)', s[m.end():]):
                jml = 0
            else:
                jml = _hitung_argumen(s, m.end() - 1)

            if jml < tanda[metode]:
                baris = s[:m.start()].count('\n') + 1
                nama = p.replace(akar + '/', '')
                masalah.append(
                    f'{nama}:{baris}: `apiService.{metode}()` diberi {jml} '
                    f'argumen, butuh {tanda[metode]}'
                )

    return masalah


if __name__ == '__main__':
    h = periksa()
    print(f'argumen ApiService salah: {len(h)}')
    print()
    for x in h[:20]:
        print(f'  {x}')
    sys.exit(1 if h else 0)
