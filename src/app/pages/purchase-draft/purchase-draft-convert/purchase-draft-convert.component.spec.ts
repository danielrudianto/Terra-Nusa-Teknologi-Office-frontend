import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PurchaseDraftConvertComponent } from './purchase-draft-convert.component';

describe('PurchaseDraftConvertComponent', () => {
  let component: PurchaseDraftConvertComponent;
  let fixture: ComponentFixture<PurchaseDraftConvertComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [PurchaseDraftConvertComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PurchaseDraftConvertComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
