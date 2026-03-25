import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, fromEvent, merge, Subscription } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class NetworkService implements OnDestroy {
  private readonly _isOnline$ = new BehaviorSubject<boolean>(navigator.onLine);
  readonly isOnline$ = this._isOnline$.asObservable();
  private sub!: Subscription;

  constructor() {
    this.sub = merge(
      fromEvent(window, 'online'),
      fromEvent(window, 'offline')
    ).subscribe(() => {
      this._isOnline$.next(navigator.onLine);
    });
  }

  get isOnline(): boolean {
    return this._isOnline$.getValue();
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }
}
