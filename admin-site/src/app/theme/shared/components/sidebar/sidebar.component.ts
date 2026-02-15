// Angular Import
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

interface MenuItem {
  label: string;
  icon: string;
  route?: string;
  children?: MenuItem[];
  isOpen?: boolean;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss']
})
export class SidebarComponent {
  @Input() isCollapsed = false;
  @Input() isMobileOpen = false;
  @Output() closeMenu = new EventEmitter<void>();

  // Menu items
  menuItems: MenuItem[] = [
    {
      label: 'Dashboard',
      icon: 'home',
      route: '/analytics'
    },
    {
      label: 'Users',
      icon: 'users',
      route: '/users'
    },
    {
      label: 'Products',
      icon: 'shopping-cart',
      route: '/products'
    },
    {
      label: 'Components',
      icon: 'box',
      route: '/component'
    },
    {
      label: 'Charts',
      icon: 'bar-chart-2',
      route: '/chart'
    },
    {
      label: 'Forms',
      icon: 'edit',
      route: '/forms'
    },
    {
      label: 'Tables',
      icon: 'grid',
      route: '/tables'
    },
    {
      label: 'Pages',
      icon: 'file',
      children: [
        {
          label: 'Sample Page',
          icon: 'arrow-right',
          route: '/sample-page'
        }
      ]
    }
  ];

  // public method
  toggleSubmenu(item: MenuItem): void {
    if (item.children) {
      item.isOpen = !item.isOpen;
    }
  }

  onMenuItemClick(): void {
    // Close mobile menu when item clicked
    if (this.isMobileOpen) {
      this.closeMenu.emit();
    }
  }
}
