import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AvatarPartsComponent } from './avatar-parts.component';

describe('AvatarPartsComponent', () => {
  let component: AvatarPartsComponent;
  let fixture: ComponentFixture<AvatarPartsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AvatarPartsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AvatarPartsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
