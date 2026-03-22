import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { ToastService, ToastMessage, ToastType } from '../../services/toast.service';
import { trigger, state, style, transition, animate } from '@angular/animations';

interface ToastInternal extends ToastMessage {
  timeoutId?: any;
  paused: boolean;
  timeLeft: number;
  startTime: number;
}

@Component({
  selector: 'app-toast',
  templateUrl: './toast.component.html',
  styleUrls: ['./toast.component.scss'],
  animations: [
    trigger('toastAnimation', [
      transition(':enter', [
        style({ transform: 'translateX(100%)', opacity: 0 }),
        animate('300ms cubic-bezier(0.25, 0.8, 0.25, 1)', style({ transform: 'translateX(0)', opacity: 1 }))
      ]),
      transition(':leave', [
        animate('250ms ease-in', style({ transform: 'translateX(100%)', opacity: 0 }))
      ])
    ])
  ]
})
export class ToastComponent implements OnInit, OnDestroy {
  toasts: ToastInternal[] = [];
  private sub?: Subscription;

  constructor(public toastService: ToastService) {}

  ngOnInit(): void {
    this.sub = this.toastService.toasts$.subscribe(toastMessages => {
      // Create a set of incoming IDs for fast lookup
      const newIds = new Set(toastMessages.map(t => t.id));
      
      // Remove stale toasts from our internal list that are no longer in the service
      this.toasts = this.toasts.filter(t => {
        if (!newIds.has(t.id)) {
          clearTimeout(t.timeoutId);
          return false;
        }
        return true;
      });

      // Add new toasts from service
      toastMessages.forEach(msg => {
        if (!this.toasts.find(t => t.id === msg.id)) {
          const internal: ToastInternal = {
            ...msg,
            paused: false,
            timeLeft: msg.duration,
            startTime: Date.now()
          };
          // Add to internal list
          this.toasts.push(internal);
          // Start its countdown
          this.startTimer(internal);
        }
      });

      // Sort 'toasts' to match the order in 'toastMessages' (which is newest first)
      this.toasts.sort((a, b) => {
        const indexA = toastMessages.findIndex(m => m.id === a.id);
        const indexB = toastMessages.findIndex(m => m.id === b.id);
        return indexA - indexB; // Newest (index 0) stays at the top
      });
    });
  }

  startTimer(toast: ToastInternal): void {
    if (toast.duration <= 0) return; // Never auto-close if duration is 0
    toast.startTime = Date.now();
    toast.timeoutId = setTimeout(() => {
      this.toastService.remove(toast.id);
    }, toast.timeLeft);
  }

  onHover(toast: ToastInternal): void {
    if (toast.timeoutId) {
      clearTimeout(toast.timeoutId);
      toast.timeoutId = undefined;
      toast.timeLeft -= Date.now() - toast.startTime;
      toast.paused = true;
    }
  }

  onLeave(toast: ToastInternal): void {
    if (toast.paused) {
      toast.paused = false;
      this.startTimer(toast);
    }
  }

  close(id: string, event: Event): void {
    event.stopPropagation();
    this.toastService.remove(id);
  }

  getIconClass(type: ToastType): string {
    switch (type) {
      case 'success': return 'fas fa-check-circle text-emerald-500';
      case 'error': return 'fas fa-exclamation-circle text-red-500';
      case 'warning': return 'fas fa-exclamation-triangle text-amber-500';
      case 'info': return 'fas fa-info-circle text-blue-500';
      default: return 'fas fa-bell text-gray-500';
    }
  }

  getThemeClass(type: ToastType): string {
    switch (type) {
      case 'success': return 'toast-theme-success';
      case 'error': return 'toast-theme-error';
      case 'warning': return 'toast-theme-warning';
      case 'info': return 'toast-theme-info';
      default: return 'toast-theme-info';
    }
  }

  trackById(index: number, toast: ToastInternal): string {
    return toast.id;
  }

  ngOnDestroy(): void {
    this.toasts.forEach(t => clearTimeout(t.timeoutId));
    this.sub?.unsubscribe();
  }
}
