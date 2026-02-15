// Angular Import
import { Component, HostListener, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';

// Project Import
import { HeaderComponent } from '../../shared/components/header/header.component';
import { SidebarComponent } from '../../shared/components/sidebar/sidebar.component';
import { FooterComponent } from '../../shared/components/footer/footer.component';
import { BreadcrumbComponent } from '../../shared/components/breadcrumb/breadcrumb.component';
import { LayoutStateService } from '../../shared/service/layout-state.service';

@Component({
  selector: 'app-admin',
  imports: [RouterModule, CommonModule, HeaderComponent, SidebarComponent, FooterComponent, BreadcrumbComponent],
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.scss']
})
export class AdminComponent {
  private layoutState = inject(LayoutStateService);

  // public props
  isNavCollapsed = false;
  isMobileNavOpen = false;
  windowWidth: number;

  // constructor
  constructor() {
    this.windowWidth = window.innerWidth;
  }

  @HostListener('window:resize', ['$event'])
  // eslint-disable-next-line
  onResize(event: any): void {
    this.windowWidth = event.target.innerWidth;
  }

  // public methods
  toggleSidebar(): void {
    this.isNavCollapsed = !this.isNavCollapsed;
  }

  toggleMobileSidebar(): void {
    this.isMobileNavOpen = !this.isMobileNavOpen;
  }

  closeMobileMenu(): void {
    this.isMobileNavOpen = false;
  }
}
