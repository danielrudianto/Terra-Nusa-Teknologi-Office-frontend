import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FleetInfoDialogComponent } from './fleet-info-dialog.component';

describe('FleetInfoDialogComponent', () => {
  let component: FleetInfoDialogComponent;
  let fixture: ComponentFixture<FleetInfoDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FleetInfoDialogComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FleetInfoDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
