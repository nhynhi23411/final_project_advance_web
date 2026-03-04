// angular imports
import { Component, OnInit } from '@angular/core';

// project imports
import { SharedModule } from 'src/app/theme/shared/shared.module';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [SharedModule],
  templateUrl: './users.component.html',
  styleUrls: ['./users.component.scss']
})
export class UsersComponent implements OnInit {
  constructor() {}

  ngOnInit() {}
}
