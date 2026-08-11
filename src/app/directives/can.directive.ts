import {
  Directive,
  Input,
  TemplateRef,
  ViewContainerRef,
  effect,
  inject,
} from '@angular/core';
import { PermissionService } from '../services/permission.service';

/**
 * Tampilkan elemen hanya bila pengguna berhak.
 *
 *     <button *appCan="'purchase_order:delete'">Hapus</button>
 *     <a *appCan="'salary_slip:read'">Slip Gaji</a>
 *
 * Beberapa modul sekaligus — tampil bila salah satunya boleh, berguna untuk
 * menu induk yang memayungi banyak halaman:
 *
 *     <div *appCan="['expenses:read', 'income:read']">…</div>
 *
 * Ini kenyamanan, bukan pengamanan: rute di server tetap menolak walau
 * elemennya berhasil dimunculkan dengan cara lain.
 */
@Directive({
  selector: '[appCan]',
  standalone: true,
})
export class CanDirective {
  private readonly tpl = inject(TemplateRef<unknown>);
  private readonly vcr = inject(ViewContainerRef);
  private readonly perm = inject(PermissionService);

  private rules: string[] = [];
  private shown = false;

  constructor() {
    // Izin dimuat setelah layar tampil, sehingga penilaian harus diulang
    // begitu petanya masuk — tanpa ini menu tetap kosong sampai halaman
    // dimuat ulang.
    effect(() => {
      this.perm.permissions();
      this.render();
    });
  }

  @Input({ required: true })
  set appCan(value: string | string[]) {
    this.rules = Array.isArray(value) ? value : [value];
    this.render();
  }

  private allowed(): boolean {
    if (!this.rules.length) return true;
    return this.rules.some((r) => {
      const [modul, aksi] = r.split(':');
      return this.perm.can(modul, (aksi || 'read').trim());
    });
  }

  private render(): void {
    const boleh = this.allowed();
    if (boleh === this.shown) return;

    this.vcr.clear();
    if (boleh) this.vcr.createEmbeddedView(this.tpl);
    this.shown = boleh;
  }
}
