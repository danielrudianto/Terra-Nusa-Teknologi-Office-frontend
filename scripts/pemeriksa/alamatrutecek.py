"""
Alamat API yang tidak cocok dengan prefix rute di backend.

Alamat yang keliru dijawab 404, dan penanganan galat yang sopan mengubahnya
menjadi daftar kosong — tanpa satu pun galat di layar. Pemilih rekening pada
dialog rencana pengeluaran tampil kosong berhari-hari karena ini: alamatnya
`bank-accounts`, sedangkan prefixnya `/banks`.

Diperiksa terhadap `routes/routes.py` di repo backend, bila terjangkau. Bila
tidak, pemeriksa ini DIAM — lebih baik tidak memeriksa apa pun daripada
melaporkan seluruh alamat sebagai salah hanya karena berkasnya tidak ada.
"""

import os
import re
import sys
from glob import glob

FE = 'src'
BE_KANDIDAT = ('../be/routes/routes.py', '../backend/routes/routes.py')


def _prefix_backend() -> set[str] | None:
    for p in BE_KANDIDAT:
        if os.path.exists(p):
            s = open(p, errors='ignore').read()
            return {
                m.group(1).strip('/')
                for m in re.finditer(r'prefix="([^"]*)"', s)
            }
    return None


def periksa(akar: str = FE) -> list[str]:
    prefix = _prefix_backend()
    if prefix is None:
        return []

    masalah = []
    terlihat: set[str] = set()

    for p in sorted(glob(f'{akar}/app/**/*.ts', recursive=True)):
        s = open(p, errors='ignore').read()
        # HANYA pemanggilan `ApiService`.
        #
        # `.get('nama')` juga dipakai `FormGroup` untuk membaca isian, dan
        # memeriksanya sebagai alamat menghasilkan ratusan positif palsu —
        # pemeriksa yang berisik akan diabaikan, dan itu sama saja dengan
        # tidak ada.
        for m in re.finditer(
            r"(?:apiService|api|service|http)\s*\.\s*"
            r"(?:get|post|put|patch|delete)\(\s*[`'\"]([a-z][\w/.-]*)",
            s,
            re.I,
        ):
            alamat = m.group(1)
            akar_alamat = alamat.split('/')[0]

            # Template literal berisi variabel tidak dapat dipastikan.
            if '$' in alamat:
                continue
            # Berkas statis, bukan rute API — `index.html` diambil langsung
            # dari server web untuk memeriksa versi yang sedang dilayani.
            if '.' in alamat:
                continue
            if akar_alamat in prefix or akar_alamat in terlihat:
                continue

            terlihat.add(akar_alamat)
            nama = p.replace(akar + '/', '')
            baris = s[: m.start()].count('\n') + 1
            masalah.append(
                f'{nama}:{baris}: `{alamat}` — tidak ada prefix rute '
                f'`/{akar_alamat}` di backend'
            )

    return masalah


if __name__ == '__main__':
    h = periksa()
    print(f'alamat rute tak dikenal: {len(h)}')
    print()
    for x in h[:20]:
        print(f'  {x}')
    sys.exit(1 if h else 0)
