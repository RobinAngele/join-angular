import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthenticationService } from '../services/authentication.service';
import { Router, RouterModule } from '@angular/router';
import { ContactDataService } from '../../main-pages/shared-data/contact-data.service';
import { DemoDataService } from '../../shared/services/demo-data.service';

/**
 * Login Component
 *
 * Handles user authentication with email and password.
 * Provides login form functionality and guest access option.
 */
@Component({
  selector: 'app-login',
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  // #region Properties
  /**
   * Indicates whether the password input field is focused or active.
   */
  passwordInput: boolean = false;

  /**
   * Indicates whether the email input field is focused or active.
   */
  emailInput: boolean = false;

  /**
   * Determines if the password should be displayed in plain text.
   */
  showPassword: boolean = false;

  /**
   * Stores the password entered by the user for login.
   */
  passwordInputTest: string = '';

  /**
   * Stores the email entered by the user for login.
   */
  emailInputTest: string = '';

  /**
   * Contains the error message to be displayed to the user in case of login failure or other issues.
   */
  errorMessage: string = '';
  // #endregion

  /**
   * Creates an instance of LoginComponent.
   * @param {AuthenticationService} authenticationService - Service for user authentication
   * @param {Router} router - Angular router for navigation
   * @param {ContactDataService} contactDataService - Service for contact data operations
   * @param {DemoDataService} demoDataService - Service that restores the demo contacts and tasks
   */
  constructor(
    private authenticationService: AuthenticationService,
    private router: Router,
    public contactDataService: ContactDataService,
    private demoDataService: DemoDataService
  ) {}

  // #region UI Interactions
  /**
   * Toggles the visibility of the password input field and sets focus on the input element.
   * @param inputElement - The HTML input element for the password field.
   */
  togglePasswordVisibility(inputElement: HTMLInputElement) {
    this.showPassword = !this.showPassword;
    inputElement.focus();
  }

  /**
   * Prevents the input field from losing focus when an interactive element is clicked.
   * @param event - The mouse event triggered by the user.
   */
  preventBlur(event: MouseEvent) {
    event.preventDefault();
  }
  // #endregion

  // #region Login
  /**
   * Logs in the user with the provided email and password.
   * On success, redirects to the summary or mobile greeting screen based on screen size.
   * Displays an error message if authentication fails.
   */
  async onLogin() {
    try {
      await this.authenticationService.signIn(this.emailInputTest, this.passwordInputTest);
      await this.demoDataService.seedDemoData();

      if (this.isMobile) {
        this.router.navigate(['/mobile-greeting']);
      } else {
        this.router.navigate(['/summary']);
      }

      this.contactDataService.notInLogIn = true;
    } catch (error) {
      this.errorMessage = (error as Error).message;
      this.clearError();
    }
  }

  /**
   * Logs in a guest user without credentials.
   * Redirects based on device screen size.
   * Displays an error message if the login fails.
   */
  async onGuestLogin() {
    try {
      await this.authenticationService.guestSignIn();
      await this.demoDataService.seedDemoData();

      if (this.isMobile) {
        this.router.navigate(['/mobile-greeting']);
      } else {
        this.router.navigate(['/summary']);
      }

      this.contactDataService.notInLogIn = true;
    } catch (error) {
      this.errorMessage = (error as Error).message;
      this.clearError();
    }
  }
  // #endregion

  // #region Logout
  /**
   * Logs the user out and redirects to the login page.
   * Displays an error message if logout fails.
   */
  async onLogout() {
    try {
      await this.authenticationService.logout();
      this.router.navigate(['/auth/login']);
    } catch (error) {
      this.errorMessage = (error as Error).message;
      this.clearError();
    }
  }
  // #endregion

  // #region Getters / Utils
  /**
   * Returns whether the device is considered mobile based on screen width.
   */
  get isMobile(): boolean {
    return window.innerWidth <= 768;
  }

  /**
   * Clears the current error message after a 4-second timeout.
   */
  clearError() {
    setTimeout(() => {
      this.errorMessage = '';
    }, 4000);
  }
  // #endregion
}
