import { HttpEventType } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatListModule } from '@angular/material/list';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { finalize } from 'rxjs';
import { DocumentApiService, DocumentSummary } from '../../core/services/document-api.service';
import { DocumentSelectionService } from '../../core/services/document-selection.service';

@Component({
  selector: 'app-documents-page',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatCardModule,
    MatCheckboxModule,
    MatListModule,
    MatProgressBarModule,
    MatProgressSpinnerModule,
    MatSnackBarModule
  ],
  templateUrl: './documents-page.component.html',
  styleUrl: './documents-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DocumentsPageComponent {
  private readonly documentApi = inject(DocumentApiService);
  private readonly documentSelection = inject(DocumentSelectionService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly destroyRef = inject(DestroyRef);

  readonly isLoading = signal(false);
  readonly isUploading = signal(false);
  readonly uploadProgress = signal<number | null>(null);
  readonly selectedFiles = signal<File[]>([]);
  readonly errorMessage = signal('');
  readonly documents = this.documentSelection.documents;
  readonly selectedDocumentIds = this.documentSelection.selectedDocumentIds;
  readonly allSelected = this.documentSelection.allSelected;
  readonly selectionSummary = computed(() => {
    const total = this.documents().length;
    const selected = this.selectedDocumentIds().length;

    if (!total) {
      return 'No documents available';
    }

    if (selected === total) {
      return 'All documents selected';
    }

    if (!selected) {
      return 'No documents selected';
    }

    return `${selected} of ${total} selected`;
  });
  readonly supportedFormats = '.pdf,.docx,.txt,.png,.jpg,.jpeg';

  ngOnInit(): void {
    this.loadDocuments();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = input.files ? Array.from(input.files) : [];

    this.selectedFiles.set(files);
    this.uploadProgress.set(null);
    this.errorMessage.set('');
  }

  uploadDocument(): void {
    const files = this.selectedFiles();
    if (!files.length || this.isUploading()) {
      return;
    }

    this.isUploading.set(true);
    this.uploadProgress.set(0);
    this.errorMessage.set('');

    this.documentApi
      .uploadDocuments(files)
      .pipe(
        finalize(() => this.isUploading.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (event) => {
          if (event.type === HttpEventType.UploadProgress) {
            const total = event.total || files.reduce((sum, file) => sum + file.size, 0);
            this.uploadProgress.set(Math.round((event.loaded / total) * 100));
          }

          if (event.type === HttpEventType.Response) {
            this.selectedFiles.set([]);
            this.uploadProgress.set(null);
            const uploadedCount = event.body?.documents.length || files.length;
            this.snackBar.open(
              uploadedCount === 1
                ? 'Document uploaded successfully.'
                : `${uploadedCount} documents uploaded successfully.`,
              'Close',
              {
              duration: 3000
              }
            );
            this.loadDocuments();
          }
        },
        error: (error) => {
          this.errorMessage.set(error?.error?.message || 'Upload failed.');
          this.snackBar.open(this.errorMessage(), 'Close', {
            duration: 4000
          });
        }
      });
  }

  trackByDocument(index: number, document: DocumentSummary): number {
    return document.id;
  }

  formatDocumentType(document: DocumentSummary): string {
    switch (document.fileType) {
      case 'pdf':
        return 'PDF';
      case 'docx':
        return 'DOCX';
      case 'text':
        return 'TXT';
      case 'image':
        return 'IMAGE';
      default:
        return document.fileType.toUpperCase();
    }
  }

  selectedFilesLabel(): string {
    const files = this.selectedFiles();

    if (!files.length) {
      return '';
    }

    if (files.length === 1) {
      return files[0].name;
    }

    return `${files.length} files selected`;
  }

  isDocumentSelected(documentId: number): boolean {
    return this.selectedDocumentIds().includes(documentId);
  }

  toggleSelectAll(checked: boolean): void {
    this.documentSelection.setAllSelected(checked);
  }

  toggleDocumentSelection(documentId: number, checked: boolean): void {
    this.documentSelection.toggleDocument(documentId, checked);
  }

  private loadDocuments(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.documentApi
      .listDocuments()
      .pipe(
        finalize(() => this.isLoading.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (documents) => this.documentSelection.setDocuments(documents),
        error: (error) => {
          this.errorMessage.set(error?.error?.message || 'Failed to load documents.');
        }
      });
  }
}
