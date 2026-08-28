import { CommonModule } from '@angular/common';
import { Component, Input, ChangeDetectionStrategy} from '@angular/core';

/** Renders a truck silhouette for a given fleet `icon` key. Shared by the
 *  transport PO picker and the fleet-info dialog so the SVGs live in one place. */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-fleet-icon',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span class="fleet-icon" [ngSwitch]="icon">
      <svg
        *ngSwitchCase="'van'"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.6"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="M2 16V8a1 1 0 0 1 1-1h10v9" />
        <path d="M13 10h4l3 3v3h-7z" />
        <circle cx="6" cy="17.5" r="1.5" />
        <circle cx="17" cy="17.5" r="1.5" />
      </svg>
      <svg
        *ngSwitchCase="'pickup'"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.6"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="M2 15V10h7v5" />
        <path d="M9 12h4l3 3v0h-7z" />
        <path d="M9 15h7" />
        <circle cx="6" cy="17" r="1.5" />
        <circle cx="15" cy="17" r="1.5" />
      </svg>
      <svg
        *ngSwitchCase="'engkel'"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.6"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="M2 15V9h8v6" />
        <path d="M10 11h4l3 3v1h-7z" />
        <circle cx="6" cy="17" r="1.5" />
        <circle cx="16" cy="17" r="1.5" />
      </svg>
      <svg
        *ngSwitchCase="'cdd'"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.6"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="M2 15V7h10v8" />
        <path d="M12 10h4l3 3v2h-7z" />
        <circle cx="6" cy="17" r="1.6" />
        <circle cx="16" cy="17" r="1.6" />
      </svg>
      <svg
        *ngSwitchCase="'cdd_long'"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.6"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="M1 15V7h13v8" />
        <path d="M14 10h3l3 3v2h-6z" />
        <circle cx="5" cy="17" r="1.5" />
        <circle cx="17" cy="17" r="1.5" />
      </svg>
      <svg
        *ngSwitchCase="'fuso'"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.6"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="M2 15V5h11v10" />
        <path d="M13 9h4l3 4v2h-7z" />
        <circle cx="6" cy="17.5" r="1.7" />
        <circle cx="16.5" cy="17.5" r="1.7" />
      </svg>
      <svg
        *ngSwitchCase="'tronton'"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.6"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="M1 15V6h14v9" />
        <path d="M15 10h3l3 3v2h-6z" />
        <circle cx="5" cy="17.5" r="1.4" />
        <circle cx="8.5" cy="17.5" r="1.4" />
        <circle cx="17.5" cy="17.5" r="1.4" />
      </svg>
      <svg
        *ngSwitchCase="'wingbox'"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.6"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="M2 15V7h12v8" />
        <path d="M2 11h12" />
        <path d="M14 10h4l3 3v2h-7z" />
        <circle cx="6" cy="17.5" r="1.5" />
        <circle cx="16.5" cy="17.5" r="1.5" />
      </svg>
      <svg
        *ngSwitchCase="'trailer'"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.6"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="M1 15V9h9v6" />
        <path d="M12 15V7h9v8" />
        <circle cx="4" cy="17.5" r="1.4" />
        <circle cx="14.5" cy="17.5" r="1.4" />
        <circle cx="18" cy="17.5" r="1.4" />
      </svg>
      <svg
        *ngSwitchCase="'selfloader'"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.6"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="M2 16v-5h6v5" />
        <path d="M8 13h3l2 3h-5z" />
        <path d="M13 16 22 9" />
        <path d="M13 16h9" />
        <circle cx="5" cy="18" r="1.4" />
        <circle cx="14" cy="18" r="1.4" />
        <circle cx="18" cy="18" r="1.4" />
      </svg>
      <svg
        *ngSwitchCase="'dolly'"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.6"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="M2 12V9h4l2 3" />
        <path d="M2 12h20v3H2z" />
        <circle cx="5" cy="17" r="1.3" />
        <circle cx="8" cy="17" r="1.3" />
        <circle cx="16" cy="17" r="1.3" />
        <circle cx="19" cy="17" r="1.3" />
      </svg>
      <svg
        *ngSwitchDefault
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.6"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="M2 15V7h10v8" />
        <path d="M12 10h4l3 3v2h-7z" />
        <circle cx="6" cy="17" r="1.6" />
        <circle cx="16" cy="17" r="1.6" />
      </svg>
    </span>
  `,
  styles: [
    `
      .fleet-icon,
      .fleet-icon svg {
        display: block;
        width: 100%;
        height: 100%;
      }
    `,
  ],
})
export class FleetIconComponent {
  @Input() icon: string = 'cdd';
}
