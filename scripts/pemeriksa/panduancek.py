"""
Panduan harus menempel pada halaman yang benar — dan hanya itu.

DUA KERUSAKAN YANG DITEMUKAN SEKALIGUS

1. `certificate-of-payment.*.md` ADA di `src/assets/panduan`, lengkap dalam
   tiga bahasa, tetapi tidak dirujuk rute mana pun. Panduannya ditulis,
   diterjemahkan, dikirim — dan tidak dapat ditemukan dari halamannya sendiri.

2. Perpindahan halaman tidak pernah mengosongkan panduan yang sedang termuat.
   Buka panduan di Purchase Order, pindah ke halaman yang tidak punya kunci
   `panduan`, buka panduannya: yang tampil masih panduan purchase order.
   Tanpa galat, tanpa tanda apa pun, dan isinya terbaca seolah-olah memang
   milik halaman itu — yang membacanya mengikuti petunjuk untuk layar lain.

Yang kedua mengenai SETIAP halaman tanpa kunci `panduan`, bukan cuma yang
kebetulan ketahuan. Itu sebabnya penjaga ini memeriksa keduanya.
"""

import os
import re
import sys

RUTE = 'src/app/app-routing.module.ts'
ASET = 'src/assets/panduan'
LAYANAN = 'src/app/services/panduan.service.ts'


def _isi(p: str) -> str:
    return open(p, encoding='utf-8', errors='ignore').read()


def periksa(akar: str = '.') -> list[str]:
    masalah: list[str] = []

    p_rute = os.path.join(akar, RUTE)
    p_aset = os.path.join(akar, ASET)
    if not os.path.exists(p_rute) or not os.path.isdir(p_aset):
        return ['berkas rute atau folder panduan tidak ditemukan']

    rute = _isi(p_rute)
    dirujuk = set(re.findall(r"panduan: '([^']+)'", rute))
    tersedia = {
        f.rsplit('.', 2)[0]
        for f in os.listdir(p_aset)
        if f.endswith('.md')
    }

    for yatim in sorted(tersedia - dirujuk):
        masalah.append(
            f'`{yatim}` punya berkas panduan tetapi tidak dirujuk rute mana '
            f'pun — tidak dapat ditemukan dari halamannya sendiri'
        )

    for hantu in sorted(dirujuk - tersedia):
        masalah.append(
            f'rute merujuk panduan `{hantu}` tetapi berkasnya tidak ada — '
            f'halamannya membuka panduan kosong'
        )

    # --- isi halaman lama harus dilepas saat berpindah ------------------
    #
    # Diperiksa dari SUMBERNYA, bukan dari perilakunya: kerusakan ini tidak
    # menghasilkan galat apa pun, dan uji yang memeriksanya lewat layar akan
    # hijau selama topiknya kebetulan sama.
    p_layanan = os.path.join(akar, LAYANAN)
    if os.path.exists(p_layanan):
        s = _isi(p_layanan)
        m = re.search(
            r'NavigationEnd[\s\S]{0,400}?\.subscribe\(\(\) => \{([\s\S]{0,400}?)\}\)',
            s,
        )
        if not m:
            masalah.append(
                'langganan NavigationEnd di panduan.service tidak terbaca — '
                'penjaga ini perlu disesuaikan'
            )
        elif 'lepasIsiHalamanLama' not in m.group(1):
            masalah.append(
                'perpindahan halaman tidak melepas panduan halaman sebelumnya '
                '— halaman tanpa kunci `panduan` akan menampilkan panduan '
                'halaman yang tadi dibuka'
            )

    return masalah


if __name__ == '__main__':
    h = periksa()
    print(f'pemetaan panduan: {len(h)} temuan')
    print()
    for x in h:
        print(f'  - {x}')
    sys.exit(1 if h else 0)
