import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TaxingComponent } from './taxing.component';

describe('TaxingComponent', () => {
  let component: TaxingComponent;
  let fixture: ComponentFixture<TaxingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [TaxingComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TaxingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
