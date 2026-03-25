import { Component } from '@angular/core';
import { NetworkService } from '../../services/network.service';

@Component({
  selector: 'app-offline-status',
  templateUrl: './offline-status.component.html',
  styleUrls: ['./offline-status.component.scss']
})
export class OfflineStatusComponent {
  constructor(public networkService: NetworkService) {}
}
