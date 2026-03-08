import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastMessage {
  text: string;
  type?: ToastType;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private messageSubject = new BehaviorSubject<ToastMessage | null>(null);

  message$ = this.messageSubject.asObservable();

  show(text: string, type: ToastType = 'info'): void {
    this.messageSubject.next({ text, type });
    setTimeout(() => this.messageSubject.next(null), 4000);
  }

  success(text: string): void {
    this.show(text, 'success');
  }

  error(text: string): void {
    this.show(text, 'error');
  }

  warning(text: string): void {
    this.show(text, 'warning');
  }

  info(text: string): void {
    this.show(text, 'info');
  }

  dismiss(): void {
    this.messageSubject.next(null);
  }
}
