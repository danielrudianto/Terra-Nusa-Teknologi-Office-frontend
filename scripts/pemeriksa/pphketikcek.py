"""
Kolom kode PPh yang masih dapat DIKETIK.

Kode objek pajak hanya boleh datang dari pemilihnya, karena yang menentukan
uangnya bukan kodenya melainkan TARIF yang menyertainya. Mengetik ulang kode
pada kolom bebas tidak mengubah `pphPercentage` sama sekali: dokumennya
tersimpan dengan kode satu dan potongan dari kode lain, tanpa galat apa pun.

Akibatnya sudah terbaca di basis data produksi: kode `21-100-24NL` yang tidak
ada sama sekali di `utils/pph.ts`, dan kode-kode yang berakhir dengan
baris-baru sehingga terhitung sebagai kode yang berbeda saat dikelompokkan.

Seluruh formulir SPK sudah `readonly` sejak awal. Yang tertinggal justru dua
layar yang menjadi pintu masuk FAKTUR — pembelian dan konversi draf — dan
dari dua pintu itulah sampahnya masuk.

Yang diperiksa HANYA `readonly`, bukan ada-tidaknya pembuka pemilih pada
kolomnya. Sebagian kolom memang tetap dan tidak punya pemilih sama sekali —
PO-H perorangan memakai satu kode baku — dan menuntut pemilih di situ hanya
menghasilkan pengecualian yang harus dirawat.
"""

import pathlib
import re
import sys

FE = 'src/app'

def _blok_input(s: str, mulai: int) -> str:
    """Untai dari `<input` pembungkus posisi ini sampai penutupnya."""
    awal = s.rfind('<input', 0, mulai)
    if awal < 0:
        return ''
    akhir = s.find('/>', mulai)
    return s[awal:akhir + 2] if akhir > 0 else s[awal:]


def periksa(akar: str = FE) -> list[str]:
    masalah = []
    for berkas in sorted(pathlib.Path(akar).rglob('*.html')):
        s = berkas.read_text(errors='ignore')
        for m in re.finditer(r'formControlName="pphCode"', s):
            blok = _blok_input(s, m.start())
            if not blok:
                continue
            baris = s.count('\n', 0, m.start()) + 1
            jalur = berkas.as_posix()
            if 'readonly' not in blok:
                masalah.append(
                    f'{jalur}:{baris}: kolom pphCode dapat diketik — '
                    f'kode berubah tanpa tarifnya ikut berubah'
                )
    return masalah


if __name__ == '__main__':
    h = periksa()
    print(f'kolom kode PPh bermasalah: {len(h)}')
    print()
    for x in h[:20]:
        print(f'  {x}')
    sys.exit(1 if h else 0)
