import {
  animate,
  group,
  query,
  style,
  transition,
  trigger,
} from '@angular/animations';

/**
 * Gerak KELUAR lembar bawah di ponsel.
 *
 * Masuknya sudah dianimasikan CSS (naik dari bawah); keluarnya dulu
 * seketika — lembarnya lenyap begitu `dipilih` dikosongkan, dan yang
 * terbaca adalah layar yang berkedip, bukan lembar yang turun. `:leave`
 * menahan elemennya sampai geraknya selesai.
 *
 * Dipasang pada TIRAI (pembungkus); lembarnya ditemukan lewat kelas
 * `akn-m-lembar`. Ditutup dengan menyeret (`appGeserTutup`) lembarnya sudah
 * di bawah, jadi yang tersisa hanya tirai yang memudar.
 *
 *   <div class="mpo-tirai" @lembarBawah [@.disabled]="gerakMati()">
 */
export const lembarBawah = trigger('lembarBawah', [
  transition(':leave', [
    group([
      query(
        '.akn-m-lembar',
        [animate('220ms cubic-bezier(0.4, 0, 1, 1)', style({ transform: 'translateY(100%)' }))],
        { optional: true },
      ),
      animate('220ms ease-in', style({ opacity: 0 })),
    ]),
  ]),
]);
