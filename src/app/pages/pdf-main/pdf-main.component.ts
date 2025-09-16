import { Component } from '@angular/core';

@Component({
  selector: 'app-pdf-main',
  standalone: false,
  templateUrl: './pdf-main.component.html',
  styleUrl: './pdf-main.component.scss',
})
export class PdfMainComponent {
  onFileDropped(event: any) {}

  onFileSelected(event: any) {}
}
