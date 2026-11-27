import { Component, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';


import { AuthenticationService } from '../../auth/services/authentication.service';

/**
 * Header component managing navigation, user authentication status and dropdown menu
 * Provides logout functionality and navigation to legal pages
 */
@Component({
  selector: 'app-header',
  imports: [RouterModule],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
})
export class HeaderComponent implements OnInit {
  /**
   * Controls the visibility of the user dropdown menu
   */
  isDropdownOpen = false;

  /**
   * Creates an instance of the component and injects required services.
   *
   * @param authService - Service for managing authentication and user state.
   * @param router - Angular Router for navigation.
   */
  constructor(public authService: AuthenticationService, private router: Router) {}

  /**
   * Initializes component lifecycle
   * Sets up global click listener for dropdown management
   */
  ngOnInit(): void {
    this.setupGlobalClickListener();
  }

  /**
   * Sets up document click listener to close dropdown when clicking outside
   * Improves user experience by auto-closing dropdown menu
   */
  private setupGlobalClickListener(): void {
    document.addEventListener('click', (event) => {
      this.handleOutsideClick(event);
    });
  }

  /**
   * Handles clicks outside the avatar container
   * @param {Event} event - The click event
   */
  private handleOutsideClick(event: Event): void {
    const target = event.target as HTMLElement;
    if (!target?.closest('.avatar-container')) {
      this.isDropdownOpen = false;
    }
  }

  /**
   * Determines if user is currently logged in
   * @returns {boolean} True if user is regular user or guest user
   */
  get isLoggedIn(): boolean {
    return this.authService.isRegularUser() || this.authService.isGuestUser();
  }

  /**
   * Determines if we should hide avatar on mobile legal pages
   * @returns {boolean} True if on legal pages and user is guest (not regular user)
   */
  get shouldHideAvatarOnMobileLegal(): boolean {
    const currentUrl = this.router.url;
    const isLegalPage = currentUrl.includes('/legal-notice') || currentUrl.includes('/privacy-policy');
    const isGuestUser = this.authService.isGuestUser();
    return isLegalPage && isGuestUser;
  }

  /**
   * Gets user initials for avatar display
   * @returns {string} User initials or 'G' for guest
   */
  get userInitials(): string {
    const currentUser = this.authService.currentUser;
    if (currentUser?.displayName) {
      return this.extractInitials(currentUser.displayName);
    }
    return 'G';
  }

  /**
   * Extracts initials from display name
   * @param {string} displayName - The user's display name
   * @returns {string} Formatted initials
   */
  private extractInitials(displayName: string): string {
    const names = displayName.split(' ');
    if (names.length >= 2) {
      return (names[0][0] + names[1][0]).toUpperCase();
    }
    return names[0][0].toUpperCase();
  }

  /**
   * Toggles the visibility of the avatar dropdown menu
   * @param {Event} event - The click event
   */
  toggleDropdown(event: Event): void {
    event.stopPropagation();
    this.isDropdownOpen = !this.isDropdownOpen;
  }

  /**
   * Closes the dropdown menu
   * Helper method for consistent dropdown state management
   */
  closeDropdown(): void {
    this.isDropdownOpen = false;
  }

  /**
   * Navigates to help page and closes dropdown
   * Provides clean navigation with state cleanup
   */
  navigateToHelp(): void {
    this.router.navigate(['/help']);
    this.closeDropdown();
  }

  /**
   * Navigates to legal notice page and closes dropdown
   * Provides clean navigation with state cleanup
   */
  navigateToLegalNotice(): void {
    this.router.navigate(['/legal-notice']);
    this.closeDropdown();
  }

  /**
   * Navigates to privacy policy page and closes dropdown
   * Provides clean navigation with state cleanup
   */
  navigateToPrivacyPolicy(): void {
    this.router.navigate(['/privacy-policy']);
    this.closeDropdown();
  }

  /**
   * Logs out the current user and redirects to login
   * Handles cleanup and error scenarios gracefully
   */
  async logout(): Promise<void> {
    try {
      await this.performLogout();
    } catch (error) {
      this.handleLogoutError(error);
    }
  }

  /**
   * Performs the actual logout process
   * Clears storage and navigates to login page
   */
  private async performLogout(): Promise<void> {
    this.clearUserData();
    await this.authService.logout();
    this.redirectToLogin();
  }

  /**
   * Handles logout errors with fallback cleanup
   * @param {any} error - The error that occurred during logout
   */
  private handleLogoutError(error: any): void {
    console.error('Logout error:', error);
    this.clearUserData();
    this.redirectToLogin();
  }

  /**
   * Clears all user data from storage
   * Ensures complete cleanup of user session
   */
  private clearUserData(): void {
    localStorage.clear();
    sessionStorage.clear();
  }

  /**
   * Redirects to login page and closes dropdown
   * Final step in logout process
   */
  private redirectToLogin(): void {
    this.router.navigate(['/auth/login']);
    this.closeDropdown();
  }
}
