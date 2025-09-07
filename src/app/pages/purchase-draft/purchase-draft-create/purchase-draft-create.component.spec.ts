import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PurchaseDraftCreateComponent } from './purchase-draft-create.component';

describe('PurchaseDraftCreateComponent', () => {
  let component: PurchaseDraftCreateComponent;
  let fixture: ComponentFixture<PurchaseDraftCreateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [PurchaseDraftCreateComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PurchaseDraftCreateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
