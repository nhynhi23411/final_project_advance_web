// Angular Import
import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';

// Project Import
import { HeaderComponent } from '../../shared/components/header/header.component';
import { SidebarComponent } from '../../shared/components/sidebar/sidebar.component';
import { FooterComponent } from '../../shared/components/footer/footer.component';

@Component({
  selector: 'app-admin',
  imports: [RouterModule, CommonModule, HeaderComponent, SidebarComponent, FooterComponent],
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.scss']
})
export class AdminComponent {
  // public props
  isNavCollapsed = false;
  isMobileNavOpen = false;

  closeMobileMenu(): void {
    this.isMobileNavOpen = false;
  }
}
