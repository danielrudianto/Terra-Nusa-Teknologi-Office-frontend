import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';

import {
  AgendaService,
  Birthday,
  Reminder,
} from '../../../services/agenda.service';
import { labelJarak, urutkanAgenda } from '../../../helpers/agenda.helper';

interface BarisRingkas {
  jenis: 'birthday' | 'reminder';
  daysUntil: number;
  judul: string;
  jarak: string;
}

/**
 * Agenda ringkas pada beranda mobile.
 *
 * MENGAPA HANYA MEMBACA
 *
 * Aplikasi mobile ini tidak punya satu pun layar untuk membuat atau mengubah
 * dokumen — itu keputusan yang dijelaskan di `mobile.routes.ts`, dan yang
 * membuat lantai levelnya berada di 3. Agenda masuk sebagai KETERANGAN, bukan
 * sebagai layar kerja baru: yang membuka aplikasi ini sedang di luar kantor
 * dan cukup perlu tahu apa yang dekat. Membuat dan mengubah pengingat tetap
 * di desktop.
 *
 * MENGAPA BUKAN TAB SENDIRI
 *
 * Tab keempat untuk daftar yang isinya paling banyak beberapa baris hanya
 * menambah tempat untuk salah tekan. Ia ikut di beranda, di bawah kartu-kartu
 * yang menunggu keputusan — dibaca sambil lalu, bukan dituju.
 *
 * Datanya lewat `AgendaService` yang sama dengan desktop, dan kata-katanya
 * lewat `agenda.helper` yang sama. Tidak ada aturan yang ditulis dua kali.
 */
@Component({
  selector: 'app-agenda-ringkas',
  standalone: true,
  imports: [CommonModule, MatIconModule, TranslatePipe],
  templateUrl: './agenda-ringkas.component.html',
  styleUrl: './agenda-ringkas.component.scss',
})
export class AgendaRingkasComponent implements OnInit {
  private readonly agenda = inject(AgendaService);

  /** Paling banyak segini yang ditampilkan; sisanya diringkas satu baris. */
  private readonly BATAS = 4;

  sedangMemuat = true;
  gagal = false;
  baris: BarisRingkas[] = [];
  /** Berapa yang tidak muat ditampilkan. */
  sisa = 0;

  ngOnInit(): void {
    this.muat();
  }

  muat(): void {
    this.sedangMemuat = true;
    this.gagal = false;
    this.agenda
      .load(7)
      .subscribe({
        next: (r) => {
          const semua: BarisRingkas[] = [
            ...(r?.birthdays ?? []).map((b: Birthday) => ({
              jenis: 'birthday' as const,
              daysUntil: b.daysUntil,
              judul: b.name,
              jarak: labelJarak(b.daysUntil),
            })),
            ...(r?.reminders ?? []).map((p: Reminder) => ({
              jenis: 'reminder' as const,
              daysUntil: p.daysUntil,
              judul: p.title,
              jarak: labelJarak(p.daysUntil),
            })),
          ].sort(urutkanAgenda);

          this.baris = semua.slice(0, this.BATAS);
          this.sisa = Math.max(semua.length - this.BATAS, 0);
        },
        error: () => {
          /*
           * Gagal memuat TIDAK dibiarkan tampil sebagai agenda kosong.
           *
           * "Tidak ada agenda" dan "agendanya tidak terbaca" adalah dua
           * keadaan yang berbeda, dan yang pertama menenangkan orang secara
           * keliru — ia berhenti memeriksa justru ketika ada yang perlu
           * diperiksa.
           */
          this.baris = [];
          this.sisa = 0;
          this.gagal = true;
        },
      })
      .add(() => (this.sedangMemuat = false));
  }

  /** Ikon per jenis; ulang tahun dan pengingat tidak perlu dibaca dua kali. */
  ikon(b: BarisRingkas): string {
    return b.jenis === 'birthday' ? 'cake' : 'notifications';
  }

  /** Hari ini ditandai — itu satu-satunya yang menuntut tindakan sekarang. */
  hariIni(b: BarisRingkas): boolean {
    return b.daysUntil <= 0;
  }
}
