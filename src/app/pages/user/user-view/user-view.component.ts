import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { ApiService } from 'src/app/services/api.service';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-user-view',
  templateUrl: './user-view.component.html',
  styleUrl: './user-view.component.scss',
  standalone: true,
  imports: [MatDialogModule, MatIconModule, CommonModule, TranslatePipe],
})
export class UserViewComponent {
  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { id: number },
    private apiService: ApiService,
    private translate: TranslateService,
  ) {}

  user: any = null;

  ngOnInit(): void {
    this.apiService.get('users/' + this.data.id, {}).subscribe({
      next: (data: any) => {
        this.user = data;
      },
      error: (err) => {
        console.error(err);
      },
    });
  }

  get authLabel(): string {
    return this.translate.instant(
      'user.level' + (this.user?.authenticationLevel || 1),
    );
  }
}
