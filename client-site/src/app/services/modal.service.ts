import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface ModalConfig {
    component: any;
    data?: any;
    width?: string;
    zIndex?: number;
}

@Injectable({ providedIn: 'root' })
export class ModalService {
    private modalStack: ModalConfig[] = [];
    private modals$ = new BehaviorSubject<ModalConfig[]>([]);

    constructor() { }

    open(config: ModalConfig): Observable<any> {
        this.modalStack.push(config);
        this.modals$.next([...this.modalStack]);
        return new Observable(observer => {
            // Store observer for later close resolution
            (config as any)._observer = observer;
        });
    }

    close(data?: any): void {
        const config = this.modalStack.pop();
        if (config && (config as any)._observer) {
            (config as any)._observer.next(data);
            (config as any)._observer.complete();
        }
        this.modals$.next([...this.modalStack]);
    }

    closeAll(): void {
        this.modalStack = [];
        this.modals$.next([]);
    }

    getModals(): Observable<ModalConfig[]> {
        return this.modals$.asObservable();
    }

    hasOpenModal(): boolean {
        return this.modalStack.length > 0;
    }
}
