import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PphRecapComponent } from './pph-recap.component';

describe('PphRecapComponent', () => {
  let component: PphRecapComponent;
  let fixture: ComponentFixture<PphRecapComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [PphRecapComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PphRecapComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
