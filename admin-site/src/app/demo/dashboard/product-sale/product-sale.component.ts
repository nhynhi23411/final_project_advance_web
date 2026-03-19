// angular import
import { Component } from '@angular/core';

// project import
import { SharedModule } from 'src/app/theme/shared/shared.module';

interface ProgressBarItem {
  value: string;
  color: string;
  percentage: number;
}

interface CampaignRow {
  date: string;
  data: ProgressBarItem[];
}

@Component({
  selector: 'app-product-sale',
  imports: [SharedModule],
  templateUrl: './product-sale.component.html',
  styleUrls: ['./product-sale.component.scss']
})
export class ProductSaleComponent {
  // Column headers
  product_sale = [
    {
      title: 'Campaign date'
    },
    {
      title: 'Click',
      icon: 'icon-help-circle'
    },
    {
      title: 'Cost',
      icon: 'icon-help-circle'
    },
    {
      title: 'CTR',
      icon: 'icon-help-circle'
    },
    {
      title: 'ARPU',
      icon: 'icon-help-circle'
    },
    {
      title: 'ECPI',
      icon: 'icon-help-circle'
    },
    {
      title: 'ROI',
      icon: 'icon-help-circle'
    },
    {
      title: 'Revenue',
      icon: 'icon-help-circle'
    },
    {
      title: 'Conversions',
      icon: 'icon-help-circle'
    }
  ];

  // Campaign data - to be populated with real API data
  campaignData: CampaignRow[] = [];
}
