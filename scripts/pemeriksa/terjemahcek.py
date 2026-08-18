"""
Kunci i18n yang nilainya masih berbahasa Indonesia pada berkas EN atau ZH.

`kuncicek` memastikan setiap kunci PUNYA nilai di ketiga bahasa — tetapi tidak
memeriksa apakah nilainya benar-benar diterjemahkan. Kunci yang disalin apa
adanya dari `id.json` lolos pemeriksaan itu sepenuhnya.

Akibatnya layar berbahasa Inggris menampilkan "Tambah pekerjaan" dan
"Subtotal (DPP)" di tengah kalimat Inggris, tanpa satu pun tanda bahwa ada
yang terlewat.

Sudah terjadi pada 152 kunci sekaligus.
"""

import json
import re
import sys

I18N = 'src/assets/i18n'

# Kata yang menandai teks Indonesia.
#
# Sengaja kata FUNGSI dan kerja umum, bukan kata benda: "Total", "Filter",
# "April", dan "Email" sama di kedua bahasa, dan menandainya menghasilkan
# ratusan temuan keliru yang membuat pemeriksa ini berhenti dibaca.
INDO = re.compile(
    r'\b(tambah|hapus|ubah|simpan|batal|pilih|cari|belum|sudah|tidak|dan|atau'
    r'|yang|untuk|dari|pada|dengan|akan|dapat|harus|semua|lainnya|kembali'
    r'|lanjut|kosong|isi|masukkan|klik|jumlah|nilai|nama|tanggal'
    r'|keterangan|catatan|pekerjaan|pemasok|pelanggan|proyek|dokumen|berkas'
    r'|bulan|tahun|hari|minggu|pengguna|karyawan|gaji|bayar|terima|kirim)\b',
    re.I,
)


def _datar(o, pre=''):
    for k, v in o.items():
        if isinstance(v, dict):
            yield from _datar(v, f'{pre}{k}.')
        else:
            yield f'{pre}{k}', v


def periksa(akar: str = I18N) -> list[str]:
    b = {}
    for lang in ('id', 'en', 'zh'):
        b[lang] = dict(_datar(json.load(open(f'{akar}/{lang}.json'))))

    masalah = []
    for lang in ('en', 'zh'):
        for k, v in b['id'].items():
            if not isinstance(v, str):
                continue
            # Nilai yang PERSIS sama dan memuat kata Indonesia.
            if b[lang].get(k) == v and INDO.search(v):
                masalah.append(
                    f'{lang}.json: `{k}` masih berbahasa Indonesia — "{v[:44]}"'
                )
    return masalah


if __name__ == '__main__':
    h = periksa()
    print(f'kunci belum diterjemahkan: {len(h)}')
    print()
    for x in h[:25]:
        print(f'  {x}')
    sys.exit(1 if h else 0)
