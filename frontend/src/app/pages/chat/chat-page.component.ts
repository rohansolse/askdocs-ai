import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
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
import { DocumentApiService, DocumentSummary } from '../../core/services/document-api.service';
import { ChatModelService } from '../../core/services/chat-model.service';
import { DocumentSelectionService } from '../../core/services/document-selection.service';
import { ChatRichTextPipe } from '../../shared/pipes/chat-rich-text.pipe';

@Component({
  selector: 'app-chat-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatInputModule,
    MatListModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    ChatRichTextPipe
  ],
  templateUrl: './chat-page.component.html',
  styleUrl: './chat-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ChatPageComponent {
  private readonly chatApi = inject(ChatApiService);
  private readonly documentApi = inject(DocumentApiService);
  private readonly documentSelection = inject(DocumentSelectionService);
  private readonly chatModelService = inject(ChatModelService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly destroyRef = inject(DestroyRef);

  readonly chats = signal<ChatHistory[]>([]);
  readonly selectedChatId = signal<number | null>(null);
  readonly historyLoading = signal(false);
  readonly documentsLoading = signal(false);
  readonly isAsking = signal(false);
  readonly pendingMessages = signal<ChatMessage[]>([]);
  readonly pendingChatTitle = signal<string | null>(null);
  readonly latestContext = signal<AskQuestionResponse['context']>([]);
  readonly contextExpanded = signal(false);
  readonly errorMessage = signal('');
  readonly selectionErrorMessage = signal('');
  readonly selectedModel = this.chatModelService.selectedModel;
  readonly questionControl = new FormControl('', {
    nonNullable: true
  });
  readonly documents = this.documentSelection.documents;
  readonly selectedDocumentIds = this.documentSelection.selectedDocumentIds;
  readonly selectedDocuments = this.documentSelection.selectedDocuments;
  readonly allDocumentsSelected = this.documentSelection.allSelected;

  ngOnInit(): void {
    this.loadDocuments();
    this.chatModelService.ensureLoaded();
    this.loadHistory();
  }

  readonly selectedChat = computed(() => {
    const selectedChatId = this.selectedChatId();
    return this.chats().find((chat) => chat.id === selectedChatId);
  });

  readonly renderedMessages = computed(() => [
    ...(this.selectedChat()?.messages || []),
    ...this.pendingMessages()
  ]);

  readonly conversationTitle = computed(
    () => this.selectedChat()?.title || this.pendingChatTitle() || 'New local RAG conversation'
  );

  readonly selectedDocumentsLabel = computed(() => {
    const documents = this.documents();
    const selectedDocuments = this.selectedDocuments();

    if (!documents.length) {
      return 'No documents uploaded';
    }

    if (!selectedDocuments.length) {
      return 'No documents selected';
    }

    if (selectedDocuments.length === documents.length) {
      return 'All Documents';
    }

    if (selectedDocuments.length === 1) {
      return selectedDocuments[0].originalName;
    }

    return selectedDocuments.map((document) => document.originalName).join(', ');
  });

  readonly selectedDocumentsCountLabel = computed(() => {
    const total = this.documents().length;
    const selected = this.selectedDocuments().length;

    if (!total) {
      return '0 selected';
    }

    if (selected === total) {
      return `All ${total} selected`;
    }

    return `${selected} of ${total} selected`;
  });
  readonly chatStatusMessage = computed(() => {
    if (!this.isAsking()) {
      return '';
    }

    const model = this.selectedModel();
    const modelLabel = model ? this.chatModelService.getDisplayName(model) : 'the selected Ollama model';
    return `Searching relevant chunks and generating a local reply with ${modelLabel}...`;
  });
  readonly visibleContext = computed(() => {
    const context = this.latestContext();
    return this.contextExpanded() ? context : context.slice(0, 2);
  });

  selectChat(chatId: number): void {
    this.selectedChatId.set(chatId);
    this.pendingMessages.set([]);
    this.pendingChatTitle.set(null);
    this.latestContext.set([]);
    this.contextExpanded.set(false);
  }

  startNewChat(): void {
    this.selectedChatId.set(null);
    this.pendingMessages.set([]);
    this.pendingChatTitle.set(null);
    this.latestContext.set([]);
    this.contextExpanded.set(false);
    this.questionControl.setValue('');
  }

  submitQuestion(): void {
    const question = this.questionControl.value.trim();
    if (this.isAsking()) {
      return;
    }

    if (!question) {
      this.errorMessage.set('Enter a question before sending.');
      return;
    }

    if (!this.selectedDocumentIds().length) {
      this.selectionErrorMessage.set('Select at least one document before sending a question.');
      return;
    }

    this.errorMessage.set('');
    this.selectionErrorMessage.set('');
    this.isAsking.set(true);
    this.pendingMessages.update((messages) => [
      ...messages,
      {
        id: Date.now(),
        chatId: this.selectedChatId() || 0,
        role: 'user',
        content: question,
        createdAt: new Date().toISOString()
      }
    ]);
    if (!this.selectedChatId()) {
      this.pendingChatTitle.set(this.createTitleFromQuestion(question));
    }
    this.questionControl.setValue('');

    this.chatApi
      .askQuestion({
        question,
        chatId: this.selectedChatId() || undefined,
        selectedDocumentIds: this.selectedDocumentIds(),
        model: this.selectedModel() || undefined
      })
      .pipe(
        finalize(() => this.isAsking.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (response) => {
          this.selectedChatId.set(response.chatId);
          this.pendingChatTitle.set(response.title);
          this.pendingMessages.update((messages) => [
            ...messages,
            {
              id: Date.now() + 1,
              chatId: response.chatId,
              role: 'assistant',
              content: response.answer,
              createdAt: new Date().toISOString()
            }
          ]);
          this.latestContext.set(response.context);
          this.contextExpanded.set(false);
          this.loadHistory(response.chatId, true);
        },
        error: (error) => {
          this.pendingMessages.set([]);
          this.pendingChatTitle.set(null);
          this.errorMessage.set(error?.error?.message || 'Failed to get chat response.');
          this.snackBar.open(this.errorMessage(), 'Close', {
            duration: 4000
          });
        }
      });
  }

  handleComposerKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.submitQuestion();
    }
  }

  async copyMessage(content: string): Promise<void> {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(content);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = content;
        textarea.setAttribute('readonly', 'true');
        textarea.style.position = 'absolute';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }

      this.snackBar.open('Copied to clipboard.', 'Close', {
        duration: 2000
      });
    } catch (error) {
      this.snackBar.open('Failed to copy message.', 'Close', {
        duration: 2500
      });
    }
  }

  trackByChat(index: number, chat: ChatHistory): number {
    return chat.id;
  }

  trackByMessage(index: number, message: ChatMessage): number {
    return message.id + index;
  }

  trackByDocument(index: number, document: DocumentSummary): number {
    return document.id;
  }

  toggleContextExpanded(): void {
    this.contextExpanded.update((value) => !value);
  }

  isDocumentSelected(documentId: number): boolean {
    return this.selectedDocumentIds().includes(documentId);
  }

  toggleSelectAll(checked: boolean): void {
    this.documentSelection.setAllSelected(checked);
    this.selectionErrorMessage.set('');
  }

  toggleDocumentSelection(documentId: number, checked: boolean): void {
    this.documentSelection.toggleDocument(documentId, checked);
    this.selectionErrorMessage.set('');
  }

  private loadDocuments(): void {
    this.documentsLoading.set(true);

    this.documentApi
      .listDocuments()
      .pipe(
        finalize(() => this.documentsLoading.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (documents) => {
          this.documentSelection.setDocuments(documents);
        },
        error: (error) => {
          this.errorMessage.set(error?.error?.message || 'Failed to load documents.');
        }
      });
  }

  private loadHistory(preferredChatId?: number, clearPending = false): void {
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
          if (clearPending) {
            this.pendingMessages.set([]);
            this.pendingChatTitle.set(null);
          }
        },
        error: (error) => {
          this.errorMessage.set(error?.error?.message || 'Failed to load chat history.');
        }
      });
  }

  private createTitleFromQuestion(question: string): string {
    const normalized = question.trim().replace(/\s+/g, ' ');
    return normalized.length > 60 ? `${normalized.slice(0, 57)}...` : normalized;
  }
}
