import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { RouterModule } from '@angular/router';

export interface PageTitleBreadcrumb {
  label: string;
  link?: string;
}

@Component({
  selector: 'app-page-title',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './page-title.component.html',
  styleUrls: ['./page-title.component.scss']
})
export class PageTitleComponent {
  @Input({ required: true }) title = '';
  @Input() subtitle = '';
  @Input() breadcrumbs: PageTitleBreadcrumb[] = [];
  @Input() showBreadcrumb = false;
}
