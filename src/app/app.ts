import { Component, signal } from '@angular/core';
import { CommonModule, AsyncPipe } from '@angular/common';
import { Router, RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, AsyncPipe],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('WhoPaysWhat');

  constructor(
    private router: Router,
    public authService: AuthService
  ) { }

  isHome() {
    return this.router.url === '/' || this.router.url === '';
  }

  async logout() {
    await this.authService.signOut();
    this.router.navigate(['/']);
  }
}
