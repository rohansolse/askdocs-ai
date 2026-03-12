import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ApiBaseService {
  getUrl(path: string): string {
    return `${environment.apiBaseUrl}/${path.replace(/^\//, '')}`;
  }
}

