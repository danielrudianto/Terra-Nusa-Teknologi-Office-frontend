import { CommonModule } from '@angular/common';
import {
  Component,
  Input,
  OnChanges,
  OnDestroy,
  SimpleChanges,
} from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Subscription } from 'rxjs';
import { AvatarService, KeadaanAvatar } from '../../services/avatar.service';
import {
  AvatarConfig,
  buildAvatarSvg,
} from './avatar-parts/avatar-parts.component';

/**
 * Renders a user's avatar.
 *
 * Two ways to use it:
 *   <app-avatar [userId]="row.createdBy" [name]="row.createdByName"/>
 *   <app-avatar [config]="draftConfig"/>   <- live preview in the builder
 *
 * With `userId` the config is pulled through AvatarService, which batches the
 * requests, so putting this in a 50-row table still costs one HTTP call.
 */
@Component({
  selector: 'app-avatar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span
      class="av"
      [class.av--square]="square"
      [style.width.px]="size"
      [style.height.px]="size"
      [attr.title]="name || null"
    >
      <span
        *ngIf="svg; else initialsTpl"
        class="av__svg"
        [innerHTML]="svg"
      ></span>
      <ng-template #initialsTpl>
        <span class="av__initials" [style.font-size.px]="size * 0.4">{{
          initials
        }}</span>
      </ng-template>
    </span>
  `,
  styles: [
    `
      .av {
        display: inline-grid;
        place-items: center;
        overflow: hidden;
        border-radius: 50%;
        flex: 0 0 auto;
        background: var(--brand-soft, #e7ecfb);
        color: var(--brand, #154dec);
        line-height: 1;
      }
      .av--square {
        border-radius: 22%;
      }
      .av__svg,
      .av__svg :is(svg) {
        display: block;
        width: 100%;
        height: 100%;
      }
      .av__initials {
        font-weight: 700;
        text-transform: uppercase;
        font-family: 'Montserrat', sans-serif;
      }
    `,
  ],
})
export class AvatarComponent implements OnChanges, OnDestroy {
  constructor(
    private avatarService: AvatarService,
    private sanitizer: DomSanitizer,
  ) {}

  /** Look the avatar up by user. */
  @Input() userId: number | null = null;
  /** Or pass a config directly (builder preview). Wins over userId. */
  @Input() config: Partial<AvatarConfig> | null = null;
  /** Used for the initials fallback and the tooltip. */
  @Input() name: string | null = null;
  @Input() size: number = 34;
  @Input() square: boolean = false;

  svg: SafeHtml | null = null;
  private sub?: Subscription;

  /**
   * Inisial — yang tampil selama avatarnya belum/tidak ada.
   *
   * Ini BUKAN cadangan yang jarang terpakai; ia yang membedakan orang yang
   * belum menyetel avatar. Sebelumnya semuanya digambar sebagai satu wajah
   * bawaan yang sama, sehingga dua orang berbeda tampil identik — dan orang
   * yang avatarnya gagal dimuat tampak berganti wajah.
   */
  get initials(): string {
    const source = (this.name || '').trim();
    if (!source) return '?';
    const parts = source.split(/\s+/);
    if (parts.length === 1) return parts[0].charAt(0);
    return parts[0].charAt(0) + parts[parts.length - 1].charAt(0);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['config'] && this.config) {
      this.sub?.unsubscribe();
      this.render(this.config);
      return;
    }

    if (changes['userId']) {
      this.sub?.unsubscribe();
      this.svg = null;

      if (this.userId == null) return;
      this.sub = this.avatarService
        .get(this.userId)
        .subscribe((config) => this.render(config));
      return;
    }

    /*
     * Nama berubah sementara avatarnya belum ada: inisialnya harus ikut.
     *
     * Tanpa cabang ini, baris yang namanya datang belakangan (daftar yang
     * memuat nama lewat langganan terpisah) tetap menampilkan inisial lama —
     * atau `?`.
     */
    if (changes['name'] && !this.svg) {
      // `svg` memang null; templatenya membaca `initials` langsung, jadi
      // tidak ada yang perlu dihitung ulang di sini selain memicu render.
      this.svg = null;
    }
  }

  /**
   * `null` berarti belum/tidak ada avatarnya — dan yang digambar INISIAL.
   *
   * Menggambar `DEFAULT_AVATAR` di sini adalah persoalan yang diperbaiki:
   * wajah bawaan itu satu wajah tertentu, dipakai bersama oleh semua orang
   * yang belum menyetel avatar dan oleh setiap pengambilan yang gagal.
   */
  private render(config: KeadaanAvatar | Partial<AvatarConfig> | null): void {
    if (!config) {
      this.svg = null;
      return;
    }
    // Built from our own constants only — no user supplied markup ever reaches
    // this string, so bypassing the sanitiser here is safe.
    this.svg = this.sanitizer.bypassSecurityTrustHtml(buildAvatarSvg(config));
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }
}
