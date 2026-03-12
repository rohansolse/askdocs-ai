import { Routes } from '@angular/router';
import { ChatPageComponent } from './pages/chat/chat-page.component';
import { DocumentsPageComponent } from './pages/documents/documents-page.component';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'documents'
  },
  {
    path: 'documents',
    component: DocumentsPageComponent
  },
  {
    path: 'chat',
    component: ChatPageComponent
  },
  {
    path: '**',
    redirectTo: 'documents'
  }
];

