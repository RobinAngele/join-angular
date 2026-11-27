import { Component, OnInit } from '@angular/core';
import { RouterModule, RouterOutlet } from '@angular/router';

import { ContactDataService } from '../main-pages/shared-data/contact-data.service';

/**
 * Authentication Component
 *
 * Main authentication container that handles login/register routing and logo animation.
 * Manages responsive behavior and splash screen timing.
 */
@Component({
  selector: 'app-auth',
  imports: [RouterOutlet, RouterModule],
  templateUrl: './auth.component.html',
  styleUrl: './auth.component.scss',
})
export class AuthComponent implements OnInit {
  /**
   * Controls the visibility of the logo animation on the login screen.
   */
  showLogo = false;

  /**
   * Determines whether the current device is considered mobile based on screen width.
   * @returns {boolean} True if screen width is 768px or less
   */
  get isMobile(): boolean {
    return window.innerWidth <= 768;
  }

  /**
   * Creates an instance of AuthComponent.
   * @param {ContactDataService} contactDataService - Shared service for managing contact-related state
   */
  constructor(public contactDataService: ContactDataService) {
    setInterval(() => {
      this.isMobile;
    }, 100);
  }

  /**
   * Triggers the logo animation after a short delay when the component initializes.
   */
  ngOnInit() {
    setTimeout(() => {
      this.showLogo = true;
    }, 1500);
  }
}
