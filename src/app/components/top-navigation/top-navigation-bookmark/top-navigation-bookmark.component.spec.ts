import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TopNavigationBookmarkComponent } from './top-navigation-bookmark.component';

describe('TopNavigationBookmarkComponent', () => {
  let component: TopNavigationBookmarkComponent;
  let fixture: ComponentFixture<TopNavigationBookmarkComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TopNavigationBookmarkComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TopNavigationBookmarkComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
