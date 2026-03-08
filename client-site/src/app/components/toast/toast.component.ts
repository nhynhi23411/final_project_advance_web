import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { ToastService, ToastMessage, ToastType } from '../../services/toast.service';

@Component({
  selector: 'app-toast',
  templateUrl: './toast.component.html',
  styleUrls: ['./toast.component.scss'],
})
export class ToastComponent implements OnInit, OnDestroy {
  message: ToastMessage | null = null;
  private sub?: Subscription;

  constructor(public toastService: ToastService) {}

  ngOnInit(): void {
    this.sub = this.toastService.message$.subscribe((m) => (this.message = m));
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  get typeClass(): string {
    if (!this.message?.type) return 'bg-blueGray-700';
    const map: Record<ToastType, string> = {
      success: 'bg-emerald-600',
      error: 'bg-red-600',
      warning: 'bg-amber-600',
      info: 'bg-blueGray-700',
    };
    return map[this.message.type] || map.info;
  }
}
