import { HttpEventType } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { finalize } from 'rxjs';
import { DocumentApiService, DocumentSummary } from '../../core/services/document-api.service';

@Component({
  selector: 'app-documents-page',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
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
  private readonly snackBar = inject(MatSnackBar);
  private readonly destroyRef = inject(DestroyRef);

  readonly documents = signal<DocumentSummary[]>([]);
  readonly isLoading = signal(false);
  readonly isUploading = signal(false);
  readonly uploadProgress = signal<number | null>(null);
  readonly selectedFile = signal<File | null>(null);
  readonly errorMessage = signal('');

  ngOnInit(): void {
    this.loadDocuments();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;

    this.selectedFile.set(file);
    this.uploadProgress.set(null);
    this.errorMessage.set('');
  }

  uploadDocument(): void {
    const file = this.selectedFile();
    if (!file || this.isUploading()) {
      return;
    }

    this.isUploading.set(true);
    this.uploadProgress.set(0);
    this.errorMessage.set('');

    this.documentApi
      .uploadDocument(file)
      .pipe(
        finalize(() => this.isUploading.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (event) => {
          if (event.type === HttpEventType.UploadProgress) {
            const total = event.total || file.size;
            this.uploadProgress.set(Math.round((event.loaded / total) * 100));
          }

          if (event.type === HttpEventType.Response) {
            this.selectedFile.set(null);
            this.uploadProgress.set(null);
            this.snackBar.open('Document uploaded successfully.', 'Close', {
              duration: 3000
            });
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
        next: (documents) => this.documents.set(documents),
        error: (error) => {
          this.errorMessage.set(error?.error?.message || 'Failed to load documents.');
        }
      });
  }
}

