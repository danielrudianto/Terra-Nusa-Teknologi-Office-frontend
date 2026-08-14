// file-drop.component.ts
import {
  Component,
  EventEmitter,
  Input,
  Output,
  HostListener,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-file-drop',
  templateUrl: './file-drop.component.html',
  styleUrl: './file-drop.component.scss',
  standalone: true,
  imports: [
    TranslatePipe,
    CommonModule,],
})
export class FileDropComponent {
  @Input('allowedExtensions') allowedExtensions: string[] = [];
  @Input('allowMultipleFiles') allowMultipleFiles: boolean = false;
  @Input('show') show!: boolean;

  @Output('onFileDropped') onFileDropped: EventEmitter<FileList> =
    new EventEmitter<FileList>();

  allowedList: string = '';
  incorrectInput: boolean = false;
  errorMessage: string = '';
  files: File[] = [];
  isDragging: boolean = false;
  dragCounter: number = 0;

  ngOnInit(): void {
    this.allowedList =
      this.allowedExtensions.length > 0
        ? this.allowedExtensions.join(', ')
        : 'any';
  }

  // Prevent default drag behaviors for the entire window
  @HostListener('window:dragover', ['$event'])
  onWindowDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();

    // Show overlay when dragging anywhere in the window
    if (!this.isDragging && this.containsFiles(event)) {
      this.dragCounter++;
      this.isDragging = true;
    }
  }

  @HostListener('window:drop', ['$event'])
  onWindowDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();

    // Reset dragging state when file is dropped anywhere
    this.resetDragState();

    // Handle the drop if it contains files
    if (this.containsFiles(event)) {
      this.handleDrop(event.dataTransfer?.files || null);
    }
  }

  @HostListener('window:dragleave', ['$event'])
  onWindowDragLeave(event: DragEvent) {
    // Only trigger when leaving the window (not child elements)
    if (
      event.clientX <= 0 ||
      event.clientY <= 0 ||
      event.clientX >= window.innerWidth ||
      event.clientY >= window.innerHeight
    ) {
      this.resetDragState();
    }
  }

  // Handle drop on the specific dropzone
  onFilePlaced(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    this.resetDragState();
    this.handleDrop(e.dataTransfer?.files || null);
  }

  onFileSelected(e: Event) {
    const input = e.target as HTMLInputElement;
    this.handleDrop(input.files);
  }

  private containsFiles(event: DragEvent): boolean {
    if (!event.dataTransfer) return false;

    // Check if the drag event contains files
    const types = event.dataTransfer.types;
    return (
      types &&
      (types.includes('Files') ||
        types.includes('application/x-moz-file') ||
        (types.length > 0 && types[0] === 'Files'))
    );
  }

  private resetDragState() {
    this.dragCounter = 0;
    this.isDragging = false;
  }

  private handleDrop(files: FileList | null) {
    this.resetDragState(); // Ensure overlay disappears after drop

    if (!files || files.length === 0) return;

    this.errorMessage = '';
    this.incorrectInput = false;
    this.files = [];

    this.incorrectInput = !this.allowMultipleFiles && files.length > 1;
    if (this.incorrectInput) {
      this.incorrectInput = true;
      this.errorMessage = 'Only one file can be specified';
      return;
    }

    this.incorrectInput = !this.validateExtensions(files);
    if (this.incorrectInput) {
      this.errorMessage = 'Incorrect extension noticed';
      return;
    }

    this.files = Array.from(files);
    this.onFileDropped.emit(files);
  }

  private validateExtensions(files: FileList): boolean {
    if (this.allowedExtensions.length == 0) {
      return true;
    }

    let extensions: string[] = [];
    const extensionPattern = /\.([0-9a-z]+)(?=[?#])|(\.)(?:[\w]+)$/gim;

    Array.from(files).forEach((file) => {
      const matches = file.name.toLowerCase().match(extensionPattern);
      if (matches) {
        matches.forEach((ext) => extensions.push(ext));
      }
    });

    const forbidden = extensions.filter(
      (x) => !this.allowedExtensions.includes(x),
    );
    const valid = forbidden.length == 0;

    return valid;
  }
}
