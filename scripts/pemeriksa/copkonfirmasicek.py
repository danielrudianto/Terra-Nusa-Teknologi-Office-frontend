"""
Tindakan menentukan pada CoP harus MENAHAN dan MENGABARKAN.

Sebelumnya keempatnya — hapus, setujui CoP, setujui BAP, tandai diperiksa —
langsung memanggil server begitu ditekan, lalu memuat ulang daftarnya. Tidak
ada yang menahan, dan pada keberhasilan tidak ada yang mengabarkan.

Dua akibatnya sama-sama buruk: dokumen keuangan terhapus oleh satu kali salah
tekan, dan yang ragu apakah tindakannya jadi akan menekannya SEKALI LAGI —
pada tombol yang menyetujui tagihan.

Diperiksa DI SINI, bukan di karma: keduanya menuntut membaca berkas sumber,
dan karma tidak menyajikannya. `fetch` menjawab 404, penjaganya melewatkan
diam-diam, dan ujinya HIJAU tanpa memeriksa apa pun — persis kelas bug yang
paling ingin dihindari penjaga ini.

Tiga yang dijaga:

  1. tiap tindakan berkonfirmasi MENUNGGU jawabannya sebelum bertindak;
  2. tiap tindakan MENGABARKAN keberhasilannya;
  3. seluruh kunci terjemahannya ada di ketiga bahasa.
"""

import json
import os
import re
import sys

FE = 'src'
COP = f'{FE}/app/pages/certificate-of-payment'

LAYAR = (
    f'{COP}/certificate-of-payment-list/certificate-of-payment-list.component.ts',
    f'{COP}/certificate-of-payment-view/certificate-of-payment-view.component.ts',
)

#: Tindakan yang WAJIB meminta konfirmasi lebih dulu.
#:
#: `periksa` sengaja tidak masuk: ia sakelar yang dapat dikembalikan dari
#: layar yang sama, dan meminta konfirmasi pada tindakan yang mudah
#: dibatalkan melatih orang menekan "Ya" tanpa membaca — sehingga konfirmasi
#: pada HAPUS ikut kehilangan dayanya. Ia tetap wajib mengabarkan.
BERKONFIRMASI = ('hapus', 'setujui', 'setujuiBap')

SEMUA_AKSI = BERKONFIRMASI + ('periksa', 'cabutPeriksa')

KUNCI_WAJIB = [
    'konfirmHapusJudul', 'konfirmHapus',
    'konfirmSetujuiJudul', 'konfirmSetujui',
    'konfirmSetujuiBapJudul', 'konfirmSetujuiBap',
    'berhasilHapus', 'berhasilSetujui', 'berhasilSetujuiBap',
    'berhasilPeriksa', 'berhasilCabutPeriksa',
]

BAHASA = ('id', 'en', 'zh')


def _isi(jalur: str) -> str:
    return open(jalur, encoding='utf-8', errors='ignore').read()


def periksa(akar: str = '.') -> list[str]:
    masalah: list[str] = []

    # --- 1 & 2: bentuk pemanggilannya di kedua layar -------------------
    for jalur in LAYAR:
        p = os.path.join(akar, jalur)
        if not os.path.exists(p):
            masalah.append(f'{jalur}: berkasnya tidak ada')
            continue
        s = _isi(p)
        nama = os.path.basename(jalur)

        for aksi in BERKONFIRMASI:
            # Hanya tindakan yang MEMANG ADA di layar itu yang dituntut.
            #
            # Dialog lihat tidak punya tombol hapus sama sekali; menuntutnya
            # di sana menghasilkan temuan yang selalu muncul dan selalu boleh
            # diabaikan — dan pemeriksa yang begitu berhenti dibaca, termasuk
            # temuan berikutnya yang sungguhan.
            if not re.search(rf"\basync {aksi}\(", s):
                continue

            m = re.search(rf"konfirmasi\((?:c, )?'{aksi}'\)", s)
            if not m:
                masalah.append(
                    f'{nama}: "{aksi}" tidak meminta konfirmasi — '
                    f'satu kali salah tekan langsung sampai ke server'
                )
                continue

            # Bentuk yang benar: `if (!(await this.konfirmasi(...))) return;`
            #
            # Yang salah dan tampak benar sekilas: lupa `await`, sehingga yang
            # diperiksa adalah Promise — dan Promise SELALU truthy, jadi
            # penjaganya tidak pernah menahan apa pun.
            #
            # Yang diperiksa hanya aksara TEPAT SEBELUM pemanggilannya, bukan
            # jendela di sekelilingnya. Jendela yang lebar ikut menangkap
            # `await firstValueFrom(...)` dua baris di bawahnya — dan
            # penjaganya lolos justru pada bentuk yang paling ingin dicegah.
            # (Versi pertama penjaga ini memang bocor persis di situ.)
            sebelum = s[max(0, m.start() - 30):m.start()]
            sesudah = s[m.end():m.end() + 60]
            if 'await this.' not in sebelum:
                masalah.append(
                    f'{nama}: "{aksi}" tidak menunggu jawaban konfirmasinya — '
                    f'Promise selalu truthy, penjaganya tidak menahan apa pun'
                )
            elif 'return' not in sesudah:
                masalah.append(
                    f'{nama}: "{aksi}" tidak berhenti saat dibatalkan'
                )

        # Mengabarkan keberhasilan. Dialog lihat tidak punya `hapus`, jadi
        # yang dituntut hanya aksi yang memang ada di berkas itu.
        for aksi in SEMUA_AKSI:
            if aksi in ('periksa', 'cabutPeriksa'):
                ada = 'kabarkan(' in s and 'cabutPeriksa' in s
                if not ada:
                    masalah.append(
                        f'{nama}: menandai/mencabut pemeriksaan tidak '
                        f'mengabarkan hasilnya'
                    )
                break

        for aksi in BERKONFIRMASI:
            if f"konfirmasi(c, '{aksi}')" not in s and f"konfirmasi('{aksi}')" not in s:
                continue
            if not re.search(rf"kabarkan\((?:c, )?'{aksi}'\)", s):
                masalah.append(
                    f'{nama}: "{aksi}" berhasil tanpa memberi kabar — '
                    f'yang ragu akan menekannya sekali lagi'
                )

    # --- 3: kelengkapan terjemahan ------------------------------------
    for bahasa in BAHASA:
        p = os.path.join(akar, FE, 'assets', 'i18n', f'{bahasa}.json')
        if not os.path.exists(p):
            masalah.append(f'{bahasa}.json: berkasnya tidak ada')
            continue
        try:
            cop = json.loads(_isi(p)).get('cop', {})
        except json.JSONDecodeError as e:
            masalah.append(f'{bahasa}.json: bukan JSON yang sah — {e}')
            continue
        for kunci in KUNCI_WAJIB:
            if not str(cop.get(kunci) or '').strip():
                masalah.append(
                    f'{bahasa}.json: `cop.{kunci}` kosong — '
                    f'ngx-translate menampilkan nama kuncinya mentah di layar'
                )

    return masalah


if __name__ == '__main__':
    h = periksa()
    print(f'konfirmasi & kabar tindakan CoP: {len(h)} temuan')
    print()
    for x in h[:20]:
        print(f'  - {x}')
    sys.exit(1 if h else 0)
