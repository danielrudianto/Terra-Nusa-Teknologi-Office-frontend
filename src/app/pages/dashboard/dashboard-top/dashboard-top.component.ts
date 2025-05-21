import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  HostListener,
  Input,
  ViewChild,
} from '@angular/core';
import { Observable, Subscription } from 'rxjs';
import { availableFeaturesSearch, IFeature } from '../../../utils/features';

@Component({
    selector: 'app-dashboard-top',
    templateUrl: './dashboard-top.component.html',
    styleUrls: ['./dashboard-top.component.scss'],
    standalone: false
})
export class DashboardTopComponent {
  constructor(private cdr: ChangeDetectorRef) {}

  @Input() onCtrlFPresed: Observable<void> = new Observable<void>();
  @ViewChild('search') search!: ElementRef<HTMLInputElement>;
  private ctrlFSubscription: Subscription | null = null;
  isFocused: boolean = false;
  results: IFeature[] = [];

  width: number = 0;
  height: number = 0;
  x: number = 0;
  y: number = 0;

  ngOnInit(): void {
    this.ctrlFSubscription = this.onCtrlFPresed.subscribe(() => {
      this.search.nativeElement.focus();
    });
  }

  ngAfterViewInit(): void {
    this.search.nativeElement.addEventListener(
      'keydown',
      (_: KeyboardEvent) => {
        this.onSearch();
      }
    );

    this.search.nativeElement.addEventListener('focus', () => {
      this.isFocused = true;
    });

    this.search.nativeElement.addEventListener('blur', () => {
      this.isFocused = false;
    });

    this.width = this.search.nativeElement.offsetWidth;
    this.height = this.search.nativeElement.offsetHeight;
    this.x = this.search.nativeElement.offsetLeft;
    this.y = this.search.nativeElement.offsetTop;

    this.cdr.detectChanges();
  }

  ngOnDestroy(): void {
    if (this.ctrlFSubscription) {
      this.ctrlFSubscription.unsubscribe();
    }
  }

  onSearch(): void {
    const query = this.search.nativeElement.value;
    const searchResults = availableFeaturesSearch.search(query);
    // limit the searchresults to 5
    const limitedResults = searchResults.slice(0, 5);
    this.results = limitedResults;
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent) {
    if ((event.key === 'esc' || event.key === 'Escape') && this.isFocused) {
      event.preventDefault(); // prevent default browser find dialog
      this.search.nativeElement.blur();
      this.isFocused = false;
    }
  }
}
