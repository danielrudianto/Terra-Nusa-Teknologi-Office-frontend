"""
Kunci i18n yang ada di satu bahasa tetapi tidak di bahasa lain.

Kunci yang hilang TIDAK menghasilkan galat. ngx-translate menampilkan nama
kuncinya apa adanya, sehingga layar berbahasa Mandarin memuat tulisan
`pdf.ttdPakai` di tengah antarmukanya — kelihatan seperti kerusakan tata
letak, bukan seperti terjemahan yang belum dibuat, dan yang melihatnya
tidak punya petunjuk berkas mana yang harus disunting.

Bentuknya selalu sama: kunci baru ditambahkan ke `id.json` dan `en.json`
sementara `zh.json` tertinggal, karena yang menambahkan tidak menulis
Mandarin dan tidak ada yang memeriksanya. Terkumpul sampai 133 kunci
sebelum pemeriksa ini ada.

`terjemahcek` tidak menangkapnya: ia membandingkan NILAI yang sama persis,
sedangkan kunci yang hilang tidak punya nilai untuk dibandingkan.
"""

import json
import sys

I18N = 'src/assets/i18n'
BAHASA = ('id', 'en', 'zh')


def _datar(o, pre=''):
    for k, v in o.items():
        if isinstance(v, dict):
            yield from _datar(v, f'{pre}{k}.')
        else:
            yield f'{pre}{k}'


def periksa(akar: str = I18N) -> list[str]:
    kunci = {}
    for lang in BAHASA:
        with open(f'{akar}/{lang}.json', encoding='utf-8') as f:
            kunci[lang] = set(_datar(json.load(f)))

    semua = set().union(*kunci.values())
    masalah = []
    for lang in BAHASA:
        for k in sorted(semua - kunci[lang]):
            ada = ', '.join(b for b in BAHASA if k in kunci[b])
            masalah.append(f'{lang}.json: `{k}` tidak ada — sudah ada di {ada}')
    return masalah


if __name__ == '__main__':
    h = periksa()
    print(f'kunci tidak lengkap: {len(h)}')
    print()
    for x in h[:25]:
        print(f'  {x}')
    sys.exit(1 if h else 0)
