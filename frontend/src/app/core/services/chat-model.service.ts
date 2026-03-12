import { Injectable, computed, inject, signal } from '@angular/core';
import { finalize } from 'rxjs';
import { ChatApiService, ChatModelSummary } from './chat-api.service';

@Injectable({
  providedIn: 'root'
})
export class ChatModelService {
  private readonly chatApi = inject(ChatApiService);
  private readonly hasLoaded = signal(false);

  readonly availableModels = signal<ChatModelSummary[]>([]);
  readonly selectedModel = signal('');
  readonly loading = signal(false);
  readonly loadError = signal('');
  readonly hasModels = computed(() => this.availableModels().length > 0);

  ensureLoaded(): void {
    if (this.loading() || this.hasLoaded()) {
      return;
    }

    this.loading.set(true);
    this.loadError.set('');

    this.chatApi
      .getModels()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (result) => {
          this.availableModels.set(result.models);

          const matchedModel = result.models.find(
            (model) => this.normalizeModelName(model.name) === this.normalizeModelName(result.defaultModel)
          );
          const nextModel = matchedModel?.name || result.models[0]?.name || result.defaultModel;

          this.selectedModel.set(nextModel);
          this.hasLoaded.set(true);
        },
        error: (error) => {
          this.loadError.set(error?.error?.message || 'Failed to load available models.');
        }
      });
  }

  updateSelectedModel(modelName: string): void {
    this.selectedModel.set(modelName);
  }

  getDisplayName(modelName: string | null | undefined): string {
    return (modelName || '').trim().replace(/:latest$/i, '');
  }

  private normalizeModelName(value: string | null | undefined): string {
    return (value || '').trim().toLowerCase().replace(/:latest$/, '');
  }
}
