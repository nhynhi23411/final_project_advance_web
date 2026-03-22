import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration: number;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private toastsSubject = new BehaviorSubject<ToastMessage[]>([]);
  toasts$ = this.toastsSubject.asObservable();

  show(message: string, type: ToastType = 'info', title?: string, duration: number = 4000): void {
    const id = Math.random().toString(36).substring(2, 9);
    const toast: ToastMessage = { id, type, message, title, duration };
    
    const currentToasts = this.toastsSubject.value;
    // Add new toast to the START of the array so it appears at the top
    this.toastsSubject.next([toast, ...currentToasts].slice(0, 5)); // Keep max 5
  }

  success(message: string, title?: string, duration?: number): void {
    this.show(message, 'success', title || 'Thành công', duration);
  }

  error(message: string, title?: string, duration?: number): void {
    this.show(message, 'error', title || 'Lỗi', duration || 5000);
  }

  warning(message: string, title?: string, duration?: number): void {
    this.show(message, 'warning', title || 'Cảnh báo', duration);
  }

  info(message: string, title?: string, duration?: number): void {
    this.show(message, 'info', title || 'Thông tin', duration);
  }

  remove(id: string): void {
    const current = this.toastsSubject.value.filter(t => t.id !== id);
    this.toastsSubject.next(current);
  }
}
