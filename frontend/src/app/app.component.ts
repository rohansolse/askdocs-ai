import { ChangeDetectionStrategy, Component } from '@angular/core';
import { AppLayoutComponent } from './shared/components/layout/app-layout.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [AppLayoutComponent],
  template: '<app-layout />',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppComponent {}

