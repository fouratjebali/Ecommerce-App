import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AccountMenuComponent } from './components/account-menu/account-menu';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, AccountMenuComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {}
