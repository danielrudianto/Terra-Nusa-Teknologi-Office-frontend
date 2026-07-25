import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PphSelectorComponent } from './pph-selector.component';

describe('PphSelectorComponent', () => {
  let component: PphSelectorComponent;
  let fixture: ComponentFixture<PphSelectorComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [PphSelectorComponent]
    });
    fixture = TestBed.createComponent(PphSelectorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
