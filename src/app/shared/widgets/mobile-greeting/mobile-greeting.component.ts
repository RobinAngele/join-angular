import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

import { AuthenticationService } from '../../../auth/services/authentication.service';

/**
 * Mobile greeting component that displays personalized greeting messages
 * Automatically redirects to summary page after a delay
 */
@Component({
  selector: 'app-mobile-greeting',
  imports: [],
  templateUrl: './mobile-greeting.component.html',
  styleUrl: './mobile-greeting.component.scss',
})
export class MobileGreetingComponent implements OnInit {
  /**
   * Delay in milliseconds before redirecting after a successful login.
   */
  private readonly REDIRECT_DELAY = 2500;

  /**
   * Pixel width below which the app is considered to be in mobile view.
   */
  private readonly MOBILE_BREAKPOINT = 768;

  /**
   * The hour (0–23) after which "night" ends. Used for time-based greetings or logic.
   */
  private readonly NIGHT_END_HOUR = 5;

  /**
   * The hour (0–23) after which "morning" ends.
   */
  private readonly MORNING_END_HOUR = 12;

  /**
   * The hour (0–23) after which "afternoon" ends.
   */
  private readonly AFTERNOON_END_HOUR = 18;

  /**
   * Constructs the component and injects required services.
   *
   * @param router Angular Router for navigation.
   * @param authenticationService Service for handling user authentication.
   */
  constructor(private router: Router, private authenticationService: AuthenticationService) {}

  /**
   * Initializes component and sets up auto-redirect
   */
  ngOnInit(): void {
    this.scheduleRedirectToSummary();
  }

  /**
   * Schedules automatic navigation to summary page
   */
  private scheduleRedirectToSummary(): void {
    setTimeout(() => {
      this.router.navigate(['/summary']);
    }, this.REDIRECT_DELAY);
  }

  /**
   * Gets greeting message based on current time of day
   * @returns {string} Personalized greeting message
   */
  getGreetingMessage(): string {
    const currentHour = this.getCurrentHour();
    const baseGreeting = this.getBaseGreeting(currentHour);
    const punctuation = this.getGreetingPunctuation();

    return baseGreeting + punctuation;
  }

  /**
   * Gets current hour of the day
   * @returns {number} Current hour (0-23)
   */
  private getCurrentHour(): number {
    const now = new Date();
    return now.getHours();
  }

  /**
   * Gets base greeting text based on hour
   * @param {number} hour - Current hour
   * @returns {string} Base greeting text
   */
  private getBaseGreeting(hour: number): string {
    if (this.isNightTime(hour)) {
      return 'Good night';
    }

    if (this.isMorningTime(hour)) {
      return 'Good morning';
    }

    if (this.isAfternoonTime(hour)) {
      return 'Good afternoon';
    }

    return 'Good evening';
  }

  /**
   * Checks if current time is night time
   * @param {number} hour - Current hour
   * @returns {boolean} True if night time
   */
  private isNightTime(hour: number): boolean {
    return hour <= this.NIGHT_END_HOUR;
  }

  /**
   * Checks if current time is morning
   * @param {number} hour - Current hour
   * @returns {boolean} True if morning time
   */
  private isMorningTime(hour: number): boolean {
    return hour <= this.MORNING_END_HOUR;
  }

  /**
   * Checks if current time is afternoon
   * @param {number} hour - Current hour
   * @returns {boolean} True if afternoon time
   */
  private isAfternoonTime(hour: number): boolean {
    return hour <= this.AFTERNOON_END_HOUR;
  }

  /**
   * Gets punctuation for greeting based on user status
   * @returns {string} Comma if user has name, empty string otherwise
   */
  private getGreetingPunctuation(): string {
    return this.getUserName() ? ',' : '';
  }

  /**
   * Gets user display name
   * @returns {string} User name or empty string for guests
   */
  getUserName(): string {
    if (this.isGuestUser()) {
      return '';
    }

    return this.getCurrentUserDisplayName();
  }

  /**
   * Checks if current user is a guest
   * @returns {boolean} True if user is guest
   */
  private isGuestUser(): boolean {
    return this.authenticationService.isGuestUser();
  }

  /**
   * Gets current user display name
   * @returns {string} User display name or empty string
   */
  private getCurrentUserDisplayName(): string {
    const currentUser = this.authenticationService.currentUser;
    return currentUser?.displayName ?? '';
  }

  /**
   * Checks if current device is mobile
   * @returns {boolean} True if mobile device
   */
  get isMobile(): boolean {
    return window.innerWidth <= this.MOBILE_BREAKPOINT;
  }
}
