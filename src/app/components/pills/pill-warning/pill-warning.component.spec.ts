import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PillWarningComponent } from './pill-warning.component';

describe('PillWarningComponent', () => {
  let component: PillWarningComponent;
  let fixture: ComponentFixture<PillWarningComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PillWarningComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PillWarningComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
