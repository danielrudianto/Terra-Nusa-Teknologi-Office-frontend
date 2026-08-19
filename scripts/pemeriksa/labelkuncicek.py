#!/usr/bin/env python3
"""
Periksa kunci terjemahan yang DIRANGKAI, bukan ditulis utuh.

`terjemahcek.py` hanya melihat kunci yang tertulis apa adanya di templat.
Kunci yang dirangkai saat berjalan tidak terlihat olehnya sama sekali:

    labelKolom(kolom: string): string {
      return `employeeProfile.${kolom}`;
    }

Yang dirangkai seperti ini justru paling mudah meleset, karena tidak ada satu
tempat pun yang menyenaraikan nama-nama yang mungkin muncul. Pada riwayat
perubahan profil karyawan, tujuh dari dua puluh empat kolom tidak punya
kuncinya — `heightCm`, `bpjsKesehatan`, `formalEducation`, dan seterusnya —
sebab label isiannya memakai nama yang berbeda (`height`, `bpjsHealth`,
`education`). ngx-translate tidak dipasangi penangan kunci hilang, sehingga
yang tercetak di layar adalah kuncinya sendiri: "employeeProfile.bpjsKesehatan".

Cara kerjanya: cari fungsi yang mengembalikan `` `awalan.${...}` ``, ambil
nama kendali dari `new FormGroup({...})` di berkas yang sama, lalu pastikan
tiap nama itu punya `awalan.<nama>` pada KETIGA berkas bahasa.

Batasnya: nama yang tidak berasal dari kendali formulir — misalnya nama kolom
yang hanya ada di basis data — tidak dapat ditebak dari kode dan tidak
diperiksa di sini.
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

AKAR = Path(__file__).resolve().parents[2]
SUMBER = AKAR / "src" / "app"
BAHASA = AKAR / "src" / "assets" / "i18n"

#: `awalan.${apa pun}` di dalam sebuah template literal.
RANGKAI = re.compile(r"`([A-Za-z][\w]*)\.\$\{")

#: Nama kendali pada tingkat pertama sebuah `new FormGroup({...})`.
KENDALI = re.compile(r"^\s{4,6}(\w+):\s*new Form(?:Control|Array|Group)", re.M)


def muat_bahasa() -> dict[str, dict]:
    return {
        p.stem: json.loads(p.read_text(encoding="utf-8"))
        for p in sorted(BAHASA.glob("*.json"))
    }


def main() -> int:
    bahasa = muat_bahasa()
    if not bahasa:
        print("labelkuncicek: berkas bahasa tidak ditemukan")
        return 1

    temuan: list[str] = []
    for berkas in sorted(SUMBER.rglob("*.component.ts")):
        if berkas.name.endswith(".spec.ts"):
            continue
        teks = berkas.read_text(encoding="utf-8", errors="ignore")

        awalan = sorted(set(RANGKAI.findall(teks)))
        if not awalan:
            continue
        # Hanya awalan yang memang sebuah ruang terjemahan; template literal
        # lain (jalur API, kelas CSS) kebetulan berbentuk sama.
        awalan = [a for a in awalan if any(a in b for b in bahasa.values())]
        if not awalan:
            continue

        kendali = sorted(set(KENDALI.findall(teks)))
        if not kendali:
            continue

        for a in awalan:
            for k in kendali:
                hilang = [
                    nama
                    for nama, isi in bahasa.items()
                    if k not in isi.get(a, {})
                ]
                if hilang:
                    temuan.append(
                        f"{berkas.relative_to(AKAR)}: "
                        f"`{a}.{k}` tidak ada pada {', '.join(hilang)} "
                        f"— yang tercetak adalah kuncinya sendiri"
                    )

    if temuan:
        print("labelkuncicek: kunci terjemahan rangkaian yang tidak ada")
        for t in temuan:
            print("  " + t)
        return 1

    print("labelkuncicek: seluruh kunci rangkaian punya terjemahannya")
    return 0


if __name__ == "__main__":
    sys.exit(main())
