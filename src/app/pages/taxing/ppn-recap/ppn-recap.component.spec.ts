import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PpnRecapComponent } from './ppn-recap.component';

describe('PpnRecapComponent', () => {
  let component: PpnRecapComponent;
  let fixture: ComponentFixture<PpnRecapComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [PpnRecapComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PpnRecapComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
