"""
Tindakan yang MENGUBAH data tanpa menahan dan tanpa mengabarkan.

Ditemukan pada certificate of payment: empat tindakan menentukan — hapus,
setujui CoP, setujui BAP, tandai diperiksa — langsung memanggil server begitu
ditekan, lalu memuat ulang daftarnya. Pada KEGAGALAN ada pesan; pada
KEBERHASILAN tidak ada apa pun.

Dua akibatnya sama-sama buruk, dan yang kedua lebih sering terjadi daripada
yang pertama:

  * dokumen keuangan terhapus oleh satu kali salah tekan;
  * yang ragu apakah tindakannya jadi akan MENEKANNYA SEKALI LAGI — dan pada
    tombol yang menyetujui tagihan, tekanan kedua itu tidak selalu ditolak.

Layar yang berkedip tanpa berkata apa-apa tidak dapat dibedakan dari tombol
yang tidak bekerja. Itulah sebabnya "tidak ada kabar" bukan sekadar soal
kenyamanan.

CARA KERJANYA — dua lintasan

  1. Kumpulkan METODE LAYANAN yang mengubah data, dengan membaca
     `src/app/services/*.ts` dan mencari yang memanggil post/put/patch/delete.
     Tanpa ini, seluruh mutasi yang lewat layanan (pola yang paling banyak
     dipakai repo ini) tidak akan terlihat sama sekali.
  2. Pindai tiap metode komponen; yang memanggil salah satu dari itu — atau
     memanggil api langsung — diperiksa dua hal: apakah ia MENAHAN sebelum
     bertindak, dan apakah ia MENGABARKAN sesudah berhasil.

Yang paling menentukan pada lintasan kedua: `snackBar.open` yang hanya berada
di dalam cabang `error:` atau blok `catch` TIDAK dihitung sebagai kabar
keberhasilan. Justru bentuk itulah yang paling sering ditemukan — layar yang
cerewet saat gagal dan bisu saat berhasil.

Keluarannya LAPORAN, bukan gerbang lulus/gagal: sebagian temuan memang tidak
perlu dikerjakan (menyimpan formulir yang lalu berpindah halaman sudah
mengabarkan dirinya sendiri lewat perpindahannya). Yang perlu dibaca adalah
urutan teratasnya.
"""

import os
import re
import sys
from glob import glob

FE = 'src/app'

#: Kata yang menandai tindakan MERUSAK — hilangnya data.
MERUSAK = ('hapus', 'delete', 'buang', 'remove', 'hancur')

#: Kata yang menandai KEPUTUSAN mengikat — tidak menghilangkan data, tetapi
#: mengubah kedudukan dokumen di mata orang lain.
MENGIKAT = (
    'setujui', 'approve', 'tolak', 'reject', 'batal', 'cancel', 'cabut',
    'kirim', 'send', 'terbit', 'publish', 'tutup', 'lunas', 'bayar',
)

MUTASI_API = re.compile(r'\.(post|put|patch|delete)\s*\(')

#: Metode yang memang tidak perlu dikabarkan sendiri.
#:
#: Menyimpan formulir lalu BERPINDAH HALAMAN sudah mengabarkan dirinya lewat
#: perpindahannya; menambahkan pesan di atasnya hanya menumpuk. Yang dikenali
#: di sini bukan namanya melainkan adanya `router.navigate` sesudah mutasinya.
PINDAH = re.compile(r'router\.navigate|dialogRef.*\.close\(')


def _isi(p: str) -> str:
    return open(p, encoding='utf-8', errors='ignore').read()


def _blok(s: str, mulai: int) -> str:
    """Isi satu metode, dari kurung kurawal pembuka sampai pasangannya."""
    buka = s.find('{', mulai)
    if buka < 0:
        return ''
    dalam = 0
    for i in range(buka, min(len(s), buka + 12000)):
        if s[i] == '{':
            dalam += 1
        elif s[i] == '}':
            dalam -= 1
            if dalam == 0:
                return s[mulai:i + 1]
    return s[mulai:mulai + 12000]


METODE = re.compile(
    r'^\s{2}(?:public |private |protected )?(?:async\s+)?'
    r'(?!constructor|if|for|while|switch|catch|return)([A-Za-z_]\w*)\s*\(',
    re.M,
)


def metode_layanan_yang_mengubah(akar: str) -> set[str]:
    """Nama metode pada `services/*.ts` yang memanggil post/put/patch/delete."""
    nama = set()
    for p in glob(os.path.join(akar, FE, 'services', '*.ts')):
        if p.endswith('.spec.ts'):
            continue
        s = _isi(p)
        for m in METODE.finditer(s):
            if MUTASI_API.search(_blok(s, m.start())):
                nama.add(m.group(1))
    return nama


def _mengabarkan(blok: str) -> bool:
    """
    Ada pesan pada jalur BERHASIL.

    `snackBar.open` yang hanya ada di dalam `error:` atau `catch` tidak
    dihitung — itu justru bentuk yang paling sering ditemukan: cerewet saat
    gagal, bisu saat berhasil.
    """
    if 'snackBar.open' not in blok and 'kabarkan(' not in blok:
        return False
    if 'kabarkan(' in blok:
        return True

    for m in re.finditer(r'snackBar\.open', blok):
        sebelum = blok[:m.start()]
        # Berada di dalam cabang gagal bila `error:` atau `catch` terakhir
        # muncul SESUDAH pembuka blok berhasil terakhir.
        gagal = max(sebelum.rfind('error:'), sebelum.rfind('catch'))
        berhasil = max(sebelum.rfind('next:'), sebelum.rfind('try {'))
        if gagal <= berhasil:
            return True
    return False


#: Bentuk PENAHAN yang sah, bukan cuma dialog bersama.
#:
#: `mobile/hapus-pembelian` menahan dengan kotak centang "saya yakin"
#: (`if (!this.yakin) return;`) — bukan dialog, tetapi tetap menahan. Penjaga
#: yang hanya mengenal satu bentuk akan menuduhnya lalai, dan tuduhan keliru
#: pada layar yang justru sudah benar adalah cara tercepat membuat seluruh
#: laporan ini berhenti dibaca.
PENAHAN = (
    'DeleteConfirmationComponent',
    'konfirmasi(',
    'ConfirmComponent',
    'KonfirmasiComponent',
    'window.confirm',
    'this.yakin',
    'sudahYakin',
    # Layar persetujuan mobile menuntut kotak "saya sudah membaca"
    # dicentang sebelum tombolnya hidup.
    'sudahBaca',
    'sudahPeriksa',
)


def _delegasi(s: str, blok: str, diri: str) -> str:
    """Isi metode LAIN di berkas yang sama yang dipanggil dari `blok`."""
    tambahan = []
    for m in re.finditer(r'this\.([A-Za-z_]\w*)\s*\(', blok):
        nama = m.group(1)
        if nama == diri:
            continue
        d = re.search(
            rf'^\s{{2}}(?:public |private |protected )?(?:async\s+)?'
            rf'{re.escape(nama)}\s*\(',
            s,
            re.M,
        )
        if d:
            tambahan.append(_blok(s, d.start()))
    return '\n'.join(tambahan)


#: Properti yang MEMANG layanan, dikumpulkan dari suntikannya.
SUNTIKAN = re.compile(
    r'(?:private|public|protected|readonly)\s+(?:readonly\s+)?'
    r'([A-Za-z_]\w*)\s*(?::\s*\w*(?:Service|Api)\b|=\s*inject\(\s*\w*(?:Service|Api)\b)'
)


def _penerima_layanan(s: str) -> set[str]:
    """
    Nama properti yang benar-benar berisi layanan pada berkas ini.

    Tanpa ini, nama metode layanan yang umum — `update`, `simpan`, `hapus` —
    bertabrakan dengan pemanggilan yang sama sekali lain. `hapusBaris()` pada
    lembar periksa CoP hanya menyunting signal di layar lewat
    `this.penyesuaian.update(...)`, dan tertuduh menghapus data dari server
    semata-mata karena ada layanan lain yang kebetulan punya metode `update`.
    """
    nama = set(SUNTIKAN.findall(s))
    nama.update({'api', 'apiService', 'service', 'http'})
    return nama


def _menahan(blok: str) -> bool:
    if any(x in blok for x in PENAHAN):
        return True
    # Dialog APA PUN yang jawabannya ditunggu adalah penahan.
    #
    # `tutupTender()` membuka dialog keputusan yang bahkan menuntut alasan
    # tertulis minimal sepuluh aksara — penahan yang lebih kuat daripada
    # "yakin?". Penjaga yang hanya mengenal `DeleteConfirmationComponent`
    # menuduhnya lalai justru karena penahannya lebih baik.
    # Ditulis sebagai regex, bukan pencarian untai: pemanggilan berantai
    # di repo ini kerap dipenggal baris (`this.dialog` lalu `.open(`),
    # dan pencarian untai 'dialog.open(' melewatkan seluruhnya.
    return bool(re.search(r'dialog\s*\.\s*open\s*\(', blok)) and (
        'afterClosed()' in blok or 'afterDismissed()' in blok
    )


def _bobot(nama: str) -> str:
    n = nama.lower()
    if any(k in n for k in MERUSAK):
        return 'merusak'
    if any(k in n for k in MENGIKAT):
        return 'mengikat'
    return 'biasa'


def periksa(akar: str = '.') -> list[dict]:
    layanan = metode_layanan_yang_mengubah(akar)
    temuan: list[dict] = []

    berkas = sorted(glob(os.path.join(akar, FE, '**', '*.ts'), recursive=True))
    for p in berkas:
        jalur = p.replace('\\', '/')
        if jalur.endswith('.spec.ts') or '/services/' in jalur:
            continue
        # Komponen yang SELURUH tugasnya meminta konfirmasi.
        #
        # `reimbursement-confirm` adalah layar konfirmasinya itu sendiri —
        # yang membukanya sudah melewati satu tahap, dan menekan "Setujui" di
        # situ ADALAH konfirmasinya. Menuntut konfirmasi kedua di dalam layar
        # konfirmasi adalah tuduhan yang tidak mungkin dipenuhi.
        if re.search(r'-(confirm|konfirmasi|keputusan)[./]', jalur):
            continue
        s = _isi(p)
        if 'snackBar' not in s and 'apiService' not in s and 'service' not in s:
            continue
        penerima = _penerima_layanan(s)

        for m in METODE.finditer(s):
            nama = m.group(1)
            blok = _blok(s, m.start())
            if not blok:
                continue

            # Ikuti SATU tingkat pendelegasian — TETAPI hanya untuk bukti
            # menahan dan mengabarkan, BUKAN untuk menilai apakah metodenya
            # mengubah data.
            #
            # Dua alasannya berlawanan arah, dan keduanya pernah saya langgar:
            #
            #   * `setujui()` pada layar persetujuan mobile cuma meneruskan ke
            #     `kirim()`, dan DI SITULAH pesan berhasilnya — tanpa
            #     mengikuti delegasinya, ia tertuduh bisu padahal berbicara
            #     lewat perantaranya;
            #   * `hapusBaris()` pada lembar periksa CoP hanya menyunting
            #     signal di layar, tanpa menyentuh server sama sekali — tetapi
            #     ia memanggil `susunKontrolNominal()`, dan bila mutasi ikut
            #     dinilai dari blok gabungan, ia tertuduh menghapus data
            #     padahal tidak menghapus apa pun.
            delegasi = _delegasi(s, blok, nama)
            bukti = blok + delegasi

            lewat_layanan = any(
                re.search(rf'this\.{re.escape(rec)}\.{re.escape(x)}\s*\(', blok)
                for x in layanan
                for rec in penerima
            )
            langsung = bool(MUTASI_API.search(blok))
            if not (langsung or lewat_layanan):
                continue

            # Metode PERANTARA tidak dilaporkan sendiri.
            #
            # `kirimStatus()` pada daftar PO mobile hanya dipanggil oleh
            # `setujui()` dan `tolak()`, dan penahannya ada di SITU. Melaporkan
            # perantaranya berarti satu tindakan tampil dua kali — sekali
            # sebagai tombol yang ditekan orang, sekali lagi sebagai fungsi
            # yang tidak pernah dilihat siapa pun.
            dipanggil = re.search(
                rf'this\.{re.escape(nama)}\s*\(', s.replace(blok, '')
            )
            if dipanggil:
                continue

            bobot = _bobot(nama)
            # Nama metode layanan dapat bertabrakan dengan nama metode biasa
            # (`cari`, `pilih`, `muat`), sehingga tebakan "lewat layanan" pada
            # tindakan yang tidak menentukan hampir selalu keliru — pemilih
            # autocomplete ikut tertuduh. Untuk yang berbobot biasa, hanya
            # mutasi LANGSUNG yang dihitung.
            if bobot == 'biasa' and not langsung:
                continue
            menahan = _menahan(bukti)
            mengabarkan = _mengabarkan(bukti)
            pindah = bool(PINDAH.search(bukti))

            if menahan and mengabarkan:
                continue
            # Yang berpindah halaman/menutup dialog sudah mengabarkan diri
            # lewat perpindahannya — kecuali bila ia merusak, sebab hilangnya
            # data tetap perlu dinyatakan.
            if mengabarkan or (pindah and bobot != 'merusak'):
                if menahan or bobot == 'biasa':
                    continue

            temuan.append({
                'berkas': os.path.relpath(p, os.path.join(akar, FE)),
                'baris': s[:m.start()].count('\n') + 1,
                'metode': nama,
                'bobot': bobot,
                'menahan': menahan,
                'mengabarkan': mengabarkan,
            })

    urutan = {'merusak': 0, 'mengikat': 1, 'biasa': 2}
    temuan.sort(key=lambda t: (urutan[t['bobot']], not t['menahan'], t['berkas']))
    return temuan


if __name__ == '__main__':
    h = periksa()
    berat = [t for t in h if t['bobot'] in ('merusak', 'mengikat')]

    print(f'aksi senyap: {len(h)} temuan ({len(berat)} merusak/mengikat)')
    print()
    judul = {'merusak': 'MERUSAK', 'mengikat': 'MENGIKAT', 'biasa': 'biasa'}
    sekarang = None
    for t in h:
        if t['bobot'] != sekarang:
            sekarang = t['bobot']
            print(f'--- {judul[sekarang]} ---')
        kurang = []
        if not t['menahan']:
            kurang.append('tanpa konfirmasi')
        if not t['mengabarkan']:
            kurang.append('tanpa kabar berhasil')
        print(f"  {t['berkas']}:{t['baris']} · {t['metode']}() — {', '.join(kurang)}")

    # Bukan gerbang: sebagian temuan memang tidak perlu dikerjakan.
    sys.exit(0)
