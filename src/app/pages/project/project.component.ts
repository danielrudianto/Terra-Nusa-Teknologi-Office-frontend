import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';

/** Pembungkus rute proyek; isinya ditentukan anak rutenya. */
@Component({
  selector: 'app-project',
  standalone: true,
  imports: [RouterModule],
  template: '<router-outlet></router-outlet>',
})
export class ProjectComponent {}
