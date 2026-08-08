import { CommonModule } from '@angular/common';
import { Component, Inject, OnDestroy, OnInit } from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { AvatarService } from '../../../services/avatar.service';
import {
  AVATAR_OPTIONS,
  AvatarConfig,
  DEFAULT_AVATAR,
  buildAvatarSvg,
} from '../avatar-parts/avatar-parts.component';
import { AvatarComponent } from '../avatar.component';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Subscription } from 'rxjs';

type TabKey =
  | 'face'
  | 'hair'
  | 'eyes'
  | 'mouth'
  | 'top'
  | 'accessory'
  | 'background';

@Component({
  selector: 'app-avatar-builder',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatIconModule,
    MatTooltipModule,
    TranslatePipe,
    AvatarComponent,
  ],
  templateUrl: './avatar-builder.component.html',
  styleUrl: './avatar-builder.component.scss',
})
export class AvatarBuilderComponent implements OnInit, OnDestroy {
  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { userId: number; name?: string },
    private avatarService: AvatarService,
    private dialogRef: MatDialogRef<AvatarBuilderComponent>,
    private snackBar: MatSnackBar,
    private translate: TranslateService,
    private sanitizer: DomSanitizer,
  ) {}

  isSaving = false;
  activeTab: TabKey = 'face';

  /** The avatar being edited — starts from whatever is stored. */
  draft: AvatarConfig = { ...DEFAULT_AVATAR };

  options = AVATAR_OPTIONS;

  tabs: { key: TabKey; icon: string; labelKey: string }[] = [
    { key: 'face', icon: 'face', labelKey: 'avatarBuilder.face' },
    { key: 'hair', icon: 'content_cut', labelKey: 'avatarBuilder.hair' },
    { key: 'eyes', icon: 'visibility', labelKey: 'avatarBuilder.eyes' },
    {
      key: 'mouth',
      icon: 'sentiment_satisfied',
      labelKey: 'avatarBuilder.mouth',
    },
    { key: 'top', icon: 'checkroom', labelKey: 'avatarBuilder.top' },
    {
      key: 'accessory',
      icon: 'auto_awesome',
      labelKey: 'avatarBuilder.accessory',
    },
    {
      key: 'background',
      icon: 'palette',
      labelKey: 'avatarBuilder.background',
    },
  ];

  private touched = false;
  private sub?: Subscription;

  ngOnInit(): void {
    // The service emits the default first and the stored config once it
    // arrives, so stay subscribed — but never clobber edits already made.
    this.sub = this.avatarService.get(this.data.userId).subscribe((config) => {
      if (!this.touched) this.draft = { ...DEFAULT_AVATAR, ...config };
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  /** Preview of a single option, drawn with the rest of the current draft. */
  optionPreview(patch: Partial<AvatarConfig>): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(
      buildAvatarSvg({ ...this.draft, ...patch }),
    );
  }

  set(patch: Partial<AvatarConfig>): void {
    this.touched = true;
    this.draft = { ...this.draft, ...patch };
  }

  isActive(key: keyof AvatarConfig, value: string): boolean {
    const current = this.draft[key];
    // '' in the option list means "none"
    if (!value) return current == null || current === '';
    return current === value;
  }

  randomise(): void {
    const pick = (list: { id: string }[]) =>
      list[Math.floor(Math.random() * list.length)].id;

    this.set({
      faceID: pick(this.options.faces),
      hairID: pick(this.options.hairs),
      eyesID: pick(this.options.eyes),
      mouthID: pick(this.options.mouths),
      topID: pick(this.options.tops),
      accessoryID: pick(this.options.accessories) || null,
      skinTone: pick(this.options.skinTones),
      hairColor: pick(this.options.hairColors),
      topColor: pick(this.options.topColors),
      backgroundColor: pick(this.options.backgroundColors),
    });
  }

  reset(): void {
    this.set({ ...DEFAULT_AVATAR });
  }

  save(): void {
    this.isSaving = true;
    const payload: Partial<AvatarConfig> = {
      ...this.draft,
      accessoryID: this.draft.accessoryID || null,
    };

    this.avatarService
      .save(this.data.userId, payload)
      .subscribe({
        next: () => {
          // refresh every view already showing this user
          this.avatarService.update(this.data.userId, payload);
          this.snackBar.open(
            this.translate.instant('avatarBuilder.saved'),
            this.translate.instant('avatarBuilder.close'),
            { duration: 3000 },
          );
          this.dialogRef.close(true);
        },
        error: () => {
          this.snackBar.open(
            this.translate.instant('avatarBuilder.saveFailed'),
            this.translate.instant('avatarBuilder.close'),
            { duration: 3000 },
          );
        },
      })
      .add(() => {
        this.isSaving = false;
      });
  }
}
