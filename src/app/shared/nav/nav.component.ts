import { Component } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { AuthenticationService } from '../../auth/services/authentication.service';
import { ContactDataService } from '../../main-pages/shared-data/contact-data.service';


/**
 * Navigation Component
 *
 * Displays the main application navigation menu with conditional visibility
 * based on user authentication status and current route.
 */
@Component({
  selector: 'app-nav',
  imports: [RouterModule],
  templateUrl: './nav.component.html',
  styleUrl: './nav.component.scss',
})
export class NavComponent {
  /**
   * Creates an instance of NavComponent.
   * @param {AuthenticationService} authService - Service for user authentication
   * @param {ContactDataService} contactDataService - Service for contact data operations
   * @param {Router} router - Angular router for navigation
   */
  constructor(
    public authService: AuthenticationService,
    public contactDataService: ContactDataService,
    private router: Router
  ) {}

  /**
   * Check if user should see the full navigation
   * Guest users see simplified nav only on legal pages
   * @returns {boolean} True if user should see full navigation
   */
  get isLoggedIn(): boolean {
    if (this.authService.isRegularUser()) {
      return true;
    }

    if (this.authService.isGuestUser()) {
      const currentUrl = this.router.url;
      const isLegalPage = currentUrl.includes('/legal-notice') || currentUrl.includes('/privacy-policy');
      return !isLegalPage;
    }

    return false;
  }
}
