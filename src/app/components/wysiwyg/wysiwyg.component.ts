import { CommonModule } from '@angular/common';
import { Component, forwardRef, Input } from '@angular/core';
import {
  ControlValueAccessor,
  FormsModule,
  NG_VALUE_ACCESSOR,
} from '@angular/forms';
import { QuillModule } from 'ngx-quill';

/**
 * Reusable rich-text (WYSIWYG) editor built on ngx-quill.
 * Implements ControlValueAccessor, so it works with reactive forms:
 *   <app-wysiwyg formControlName="notes"></app-wysiwyg>
 *   <app-wysiwyg [formControl]="notesCtrl"></app-wysiwyg>
 * The bound value is an HTML string.
 */
@Component({
  selector: 'app-wysiwyg',
  standalone: true,
  imports: [CommonModule, FormsModule, QuillModule],
  templateUrl: './wysiwyg.component.html',
  styleUrl: './wysiwyg.component.scss',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => WysiwygComponent),
      multi: true,
    },
  ],
})
export class WysiwygComponent implements ControlValueAccessor {
  @Input() placeholder: string = 'Tulis di sini...';
  @Input() minHeight: number = 180;
  @Input() maxHeight: number = 420;
  @Input() readOnly: boolean = false;

  /** Allow callers to override the toolbar if they want. */
  @Input() modules: any = {
    toolbar: [
      ['bold', 'italic', 'underline', 'strike'],
      [{ header: [1, 2, 3, false] }],
      [{ list: 'ordered' }, { list: 'bullet' }],
      [{ indent: '-1' }, { indent: '+1' }],
      ['blockquote'],
      [{ align: [] }],
      ['link'],
      ['clean'],
    ],
  };

  value: string = '';
  isDisabled: boolean = false;

  onChange: (value: any) => void = () => {};
  onTouched: () => void = () => {};

  // ---- ControlValueAccessor ----
  writeValue(value: any): void {
    this.value = value || '';
  }
  registerOnChange(fn: any): void {
    this.onChange = fn;
  }
  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }
  setDisabledState(isDisabled: boolean): void {
    this.isDisabled = isDisabled;
  }

  onContentChanged(event: any): void {
    const html = event?.html ?? '';
    if (html === this.value) return; // avoid feedback loop on writeValue
    this.value = html;
    this.onChange(html);
  }
}