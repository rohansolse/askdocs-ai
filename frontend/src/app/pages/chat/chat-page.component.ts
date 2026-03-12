import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { finalize } from 'rxjs';
import {
  AskQuestionResponse,
  ChatApiService,
  ChatHistory,
  ChatMessage
} from '../../core/services/chat-api.service';

@Component({
  selector: 'app-chat-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatListModule,
    MatProgressSpinnerModule,
    MatSnackBarModule
  ],
  templateUrl: './chat-page.component.html',
  styleUrl: './chat-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ChatPageComponent {
  private readonly chatApi = inject(ChatApiService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly destroyRef = inject(DestroyRef);

  readonly chats = signal<ChatHistory[]>([]);
  readonly selectedChatId = signal<number | null>(null);
  readonly historyLoading = signal(false);
  readonly isAsking = signal(false);
  readonly pendingMessages = signal<ChatMessage[]>([]);
  readonly latestContext = signal<AskQuestionResponse['context']>([]);
  readonly errorMessage = signal('');
  readonly questionControl = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required]
  });

  ngOnInit(): void {
    this.loadHistory();
  }

  get selectedChat(): ChatHistory | undefined {
    const selectedChatId = this.selectedChatId();
    return this.chats().find((chat) => chat.id === selectedChatId);
  }

  get renderedMessages(): ChatMessage[] {
    return [...(this.selectedChat?.messages || []), ...this.pendingMessages()];
  }

  selectChat(chatId: number): void {
    this.selectedChatId.set(chatId);
    this.pendingMessages.set([]);
    this.latestContext.set([]);
  }

  startNewChat(): void {
    this.selectedChatId.set(null);
    this.pendingMessages.set([]);
    this.latestContext.set([]);
    this.questionControl.setValue('');
  }

  submitQuestion(): void {
    const question = this.questionControl.value.trim();
    if (!question || this.isAsking()) {
      return;
    }

    this.errorMessage.set('');
    this.isAsking.set(true);
    this.pendingMessages.set([
      {
        id: -1,
        chatId: this.selectedChatId() || 0,
        role: 'user',
        content: question,
        createdAt: new Date().toISOString()
      }
    ]);

    this.chatApi
      .askQuestion({
        question,
        chatId: this.selectedChatId() || undefined
      })
      .pipe(
        finalize(() => this.isAsking.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (response) => {
          this.questionControl.setValue('');
          this.pendingMessages.set([]);
          this.latestContext.set(response.context);
          this.loadHistory(response.chatId);
        },
        error: (error) => {
          this.pendingMessages.set([]);
          this.errorMessage.set(error?.error?.message || 'Failed to get chat response.');
          this.snackBar.open(this.errorMessage(), 'Close', {
            duration: 4000
          });
        }
      });
  }

  trackByChat(index: number, chat: ChatHistory): number {
    return chat.id;
  }

  trackByMessage(index: number, message: ChatMessage): number {
    return message.id + index;
  }

  private loadHistory(preferredChatId?: number): void {
    this.historyLoading.set(true);

    this.chatApi
      .getHistory()
      .pipe(
        finalize(() => this.historyLoading.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (chats) => {
          this.chats.set(chats);
          const nextSelectedChatId = preferredChatId ?? this.selectedChatId() ?? chats[0]?.id ?? null;
          this.selectedChatId.set(nextSelectedChatId);
        },
        error: (error) => {
          this.errorMessage.set(error?.error?.message || 'Failed to load chat history.');
        }
      });
  }
}
