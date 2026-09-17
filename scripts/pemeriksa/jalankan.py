#!/usr/bin/env python3
"""
Menjalankan SELURUH pemeriksa, dengan garis dasar yang hanya boleh menyusut.

MASALAH YANG DIPECAHKAN

Empat pemeriksa sudah merah sebelum gerbang CI ini ada — `daftarcek`,
`daftarseragamcek`, `setelcek`, `warnacek`. Temuannya nyata, tetapi
memperbaikinya pekerjaan tersendiri, dan sebagiannya keputusan tata letak yang
bukan milik siapa pun yang kebetulan sedang mengirim kode.

Gerbang yang MERAH SEJAK HARI PERTAMA punya satu nasib: dimatikan. Entah
dengan `continue-on-error`, entah dengan berhenti membacanya — dan sejak saat
itu ia tidak menjaga apa pun, termasuk yang sebelumnya hijau.

CARA KERJANYA

Keluaran setiap pemeriksa disimpan sebagai GARIS DASAR di `dasar/`. Gerbangnya
merah bila:

  * pemeriksa yang tadinya hijau menjadi merah — kerusakan baru;
  * keluaran pemeriksa yang merah BERUBAH — temuannya bertambah, atau
    berpindah tempat.

Keluaran yang berubah karena temuannya BERKURANG juga membuatnya merah, dan
itu disengaja: memperbaiki sesuatu harus disertai memperbarui garis dasarnya,
supaya perbaikan itu tidak dapat mundur lagi tanpa ketahuan. Pesannya
menyebutkan perintahnya.

Ini ratchet: keadaannya hanya dapat membaik.

CARA PAKAI

    python3 scripts/pemeriksa/jalankan.py            # jalankan gerbangnya
    python3 scripts/pemeriksa/jalankan.py --rekam    # perbarui garis dasar
"""

import hashlib
import pathlib
import subprocess
import sys

DIR = pathlib.Path(__file__).resolve().parent
DASAR = DIR / "dasar"


def _jalankan(p: pathlib.Path) -> tuple[int, str]:
    hasil = subprocess.run(
        [sys.executable, str(p)],
        capture_output=True,
        text=True,
        timeout=300,
        cwd=DIR.parents[1],
    )
    return hasil.returncode, hasil.stdout + hasil.stderr


def _sidik(teks: str) -> str:
    return hashlib.sha256(teks.encode("utf-8")).hexdigest()[:16]


def main() -> int:
    rekam = "--rekam" in sys.argv
    DASAR.mkdir(exist_ok=True)

    pemeriksa = sorted(
        p for p in DIR.glob("*.py") if p.name not in ("jalankan.py", "__init__.py")
    )

    baru: list[str] = []      # tadinya hijau, sekarang merah
    berubah: list[str] = []   # merah, dan temuannya bergeser
    merah: list[str] = []     # merah, sama persis seperti garis dasarnya
    hijau = 0

    for p in pemeriksa:
        kode, keluaran = _jalankan(p)
        berkas_dasar = DASAR / f"{p.stem}.txt"

        if kode == 0:
            hijau += 1
            if berkas_dasar.exists() and rekam:
                berkas_dasar.unlink()   # sudah bersih; garis dasarnya dibuang
            elif berkas_dasar.exists():
                berubah.append(
                    f"{p.stem}: SUDAH BERSIH — hapus garis dasarnya dengan "
                    f"`python3 scripts/pemeriksa/jalankan.py --rekam` supaya "
                    f"perbaikannya tidak dapat mundur lagi tanpa ketahuan"
                )
            continue

        if rekam:
            berkas_dasar.write_text(keluaran, encoding="utf-8")
            merah.append(f"{p.stem} (direkam)")
            continue

        if not berkas_dasar.exists():
            baru.append(f"{p.stem}")
            continue

        if _sidik(berkas_dasar.read_text(encoding="utf-8")) != _sidik(keluaran):
            berubah.append(
                f"{p.stem}: temuannya BERBEDA dari garis dasar — bertambah, "
                f"atau berpindah tempat"
            )
        else:
            merah.append(p.stem)

    print(f"pemeriksa: {len(pemeriksa)}  |  hijau: {hijau}  |  "
          f"merah (diketahui): {len(merah)}")

    if merah and not rekam:
        print()
        print("  Sudah merah sebelum gerbang ini ada — belum diperbaiki, dan")
        print("  TIDAK menggagalkan kiriman selama temuannya tidak bertambah:")
        for x in merah:
            print(f"    - {x}")

    if baru:
        print()
        print("  MERAH BARU — pemeriksa ini tadinya hijau:")
        for x in baru:
            print(f"    - {x}")

    if berubah:
        print()
        print("  BERUBAH dari garis dasar:")
        for x in berubah:
            print(f"    - {x}")

    if rekam:
        print()
        print(f"  Garis dasar diperbarui di {DASAR.relative_to(DIR.parents[1])}/")
        return 0

    return 1 if (baru or berubah) else 0


if __name__ == "__main__":
    sys.exit(main())
