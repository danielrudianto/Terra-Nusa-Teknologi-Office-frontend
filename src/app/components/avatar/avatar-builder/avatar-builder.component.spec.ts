import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AvatarBuilderComponent } from './avatar-builder.component';

describe('AvatarBuilderComponent', () => {
  let component: AvatarBuilderComponent;
  let fixture: ComponentFixture<AvatarBuilderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AvatarBuilderComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AvatarBuilderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
