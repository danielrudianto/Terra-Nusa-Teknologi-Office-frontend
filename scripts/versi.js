#!/usr/bin/env node
/*
 * Bangkitkan `src/app/versi.ts` dari package.json dan git.
 *
 * Dijalankan otomatis sebelum build lewat `prebuild` di package.json,
 * sehingga tidak ada yang perlu mengingat menjalankannya. Berkas versi yang
 * diperbarui tangan cepat atau lambat tertinggal — dan versi yang salah lebih
 * menyesatkan daripada tidak ada versi sama sekali.
 *
 * Yang dicatat tiga hal:
 *   - nomor versi dari package.json, dinaikkan tangan saat rilis berarti
 *   - tanggal build, yang menjawab "kapan ini ter-deploy"
 *   - commit pendek, yang menjawab "kode yang mana persisnya"
 *
 * Commit-nya yang paling berguna saat ada laporan bug: satu baris itu
 * langsung menunjuk ke keadaan kode yang dipakai orang tersebut.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const akar = path.join(__dirname, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(akar, 'package.json'), 'utf8'));

function commitPendek() {
  try {
    return execSync('git rev-parse --short HEAD', { cwd: akar })
      .toString()
      .trim();
  } catch {
    // Bukan repo git, atau git tidak terpasang. Bukan alasan menggagalkan
    // build: versinya tetap berguna tanpa commit.
    return 'tanpa-git';
  }
}

const isi = `/*
 * DIBANGKITKAN OTOMATIS — jangan disunting tangan.
 *
 * Ditulis ulang oleh scripts/versi.js setiap kali build dijalankan.
 * Perubahan yang diketik di sini akan hilang pada build berikutnya.
 */
export const VERSI = {
  nomor: '${pkg.version}',
  tanggal: '${new Date().toISOString()}',
  commit: '${commitPendek()}',
} as const;
`;

/*
 * Ditulis ke `src/app/versi.ts`, yang SENGAJA tidak ikut git.
 *
 * Berkas yang dibangkitkan tetapi ter-commit akan ditimpa kembali oleh
 * `git pull` dengan isi lama — sehingga aplikasi menampilkan tanggal dan
 * commit dari saat berkas itu pertama dibuat, bukan dari build yang sedang
 * berjalan. Sudah terjadi sekali; tanggalnya beku di 16 Agustus 15:09.
 *
 * Karena itu skrip ini WAJIB berjalan sebelum build. Ia dipasang sebagai
 * `prebuild` di package.json, dan `deploy-fe.sh` memakai `npm run build`
 * agar tahapan itu tidak terlewat.
 */
const tujuan = path.join(akar, 'src', 'app', 'versi.ts');
fs.writeFileSync(tujuan, isi);
console.log(`versi ${pkg.version} (${commitPendek()}) ditulis ke src/app/versi.ts`);
