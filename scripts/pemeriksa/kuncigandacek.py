"""
Kunci i18n yang tertulis DUA KALI dalam objek yang sama.

JSON tidak melarangnya, dan tidak ada yang mengeluh: `JSON.parse` menyimpan
yang TERAKHIR dan membuang yang sebelumnya tanpa sepatah pun peringatan.
Pemuat terjemahan Angular memakai `JSON.parse`, jadi nilai yang pertama
sekadar lenyap.

Akibatnya persis jenis yang paling sulit ditelusuri: seseorang memperbaiki
sebuah teks, menyimpannya, melihat layarnya tidak berubah, dan menyimpulkan
tembolok atau pemuatnya yang rusak — padahal suntingannya memang benar,
hanya kena salinan yang kalah.

Sudah terjadi pada `projectReport.contractDppHint`: dua nilai dengan MAKNA
BERBEDA hidup berdampingan berjarak dua puluh empat baris, dan yang tampil
di layar bukan yang dikira orang.

`terjemahcek` dan pemeriksa kunci lain memuat berkasnya dengan `json.load`,
jadi mereka sudah melihat hasil yang sudah dibuang itu — tidak satu pun
dapat melihat masalahnya. Karena itu pemeriksa ini membaca PASANGANNYA,
bukan kamusnya.
"""

import collections
import json
import sys

I18N = 'src/assets/i18n'
BAHASA = ('id', 'en', 'zh')


def periksa(akar: str = I18N) -> list[str]:
    masalah: list[str] = []

    for lang in BAHASA:
        temuan: list[tuple[str, int]] = []

        def hook(pasangan, _t=temuan):
            cacah = collections.Counter(k for k, _ in pasangan)
            _t.extend((k, n) for k, n in cacah.items() if n > 1)
            return dict(pasangan)

        with open(f'{akar}/{lang}.json', encoding='utf-8') as f:
            json.load(f, object_pairs_hook=hook)

        for kunci, n in temuan:
            masalah.append(
                f'{lang}.json: `{kunci}` ditulis {n} kali — '
                f'hanya yang TERAKHIR yang terpakai'
            )

    return sorted(masalah)


if __name__ == '__main__':
    h = periksa()
    print(f'kunci ganda: {len(h)}')
    print()
    for x in h[:25]:
        print(f'  {x}')
    sys.exit(1 if h else 0)
