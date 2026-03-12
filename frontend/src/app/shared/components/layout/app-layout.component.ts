import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatToolbarModule } from '@angular/material/toolbar';
import { ChatModelService } from '../../../core/services/chat-model.service';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    MatButtonModule,
    MatFormFieldModule,
    MatSelectModule,
    MatToolbarModule
  ],
  templateUrl: './app-layout.component.html',
  styleUrl: './app-layout.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppLayoutComponent {
  readonly chatModelService = inject(ChatModelService);

  readonly availableModels = this.chatModelService.availableModels;
  readonly selectedModel = this.chatModelService.selectedModel;
  readonly modelsLoading = this.chatModelService.loading;

  ngOnInit(): void {
    this.chatModelService.ensureLoaded();
  }

  updateSelectedModel(modelName: string): void {
    this.chatModelService.updateSelectedModel(modelName);
  }
}
