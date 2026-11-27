import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, RouterOutlet, NavigationEnd } from '@angular/router';

import { filter, Subscription } from 'rxjs';

import { HeaderComponent } from './shared/header/header.component';
import { NavComponent } from './shared/nav/nav.component';
import { ContactDataService } from './main-pages/shared-data/contact-data.service';

/**
 * Main application component managing splash screen animations and layout visibility
 * Handles responsive behavior and route-based animations for login pages
 */
@Component({
  selector: 'app-root',
  imports: [RouterOutlet, HeaderComponent, NavComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent implements OnInit, OnDestroy {
  /**
   * The application title
   */
  title = 'join';

  /**
   * Controls the splash screen visibility
   */
  showSplashScreen = false;

  /**
   * Controls the logo animation state
   */
  logoAnimating = false;

  /**
   * Controls when to hide the animated logo and show the auth logo
   */
  animationComplete = false;

  /**
   * Controls whether to show the final normal logo on mobile
   */
  showFinalLogo = false;

  /**
   * Controls the crossfade between mobile logos
   */
  logoSwapping = false;

  /**
   * Subscription to router events
   */
  private routerSubscription: Subscription = new Subscription();

  /**
   * Flag to track if initial route has been processed
   */
  private initialRouteProcessed = false;

  /**
   * Flag to track if app has been initialized
   */
  private appInitialized = false;

  /**
   * Detects if the current device is mobile
   * @returns {boolean} True if screen width is 768px or less
   */
  get isMobile(): boolean {
    return window.innerWidth <= 768;
  }

  /**
   * Checks if current route is an authentication route
   * @returns {boolean} True if on auth, login, or register routes
   */
  get isOnAuthRoute(): boolean {
    const authRoutes = ['/auth', '/auth/login', '/auth/register'];
    return authRoutes.some((route) => this.router.url.startsWith(route));
  }

  /**
   * Determines if current page is a login page
   * @returns {boolean} True if on login route (not root redirect route)
   */
  get isOnLoginPage(): boolean {
    return this.router.url === '/auth/login';
  }

  constructor(private router: Router, public contactDataService: ContactDataService) {}

  /**
   * Initializes the component lifecycle
   * Sets up animation triggers and router event subscriptions
   */
  ngOnInit(): void {
    this.subscribeToRouterEvents();

    setTimeout(() => {
      if (!this.initialRouteProcessed) {
        this.checkAndStartAnimation();
        this.initialRouteProcessed = true;
      }
    }, 100);
  }

  /**
   * Cleans up component resources
   * Unsubscribes from router events to prevent memory leaks
   */
  ngOnDestroy(): void {
    this.routerSubscription.unsubscribe();
  }

  /**
   * Initializes the splash screen animation system
   * Checks current route and starts animation if needed
   */
  private initializeAnimationSystem(): void {
    this.checkAndStartAnimation();
  }

  /**
   * Sets up router event subscription
   * Monitors navigation changes to restart animations
   */
  private subscribeToRouterEvents(): void {
    this.routerSubscription = this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe(() => {
        if (!this.initialRouteProcessed) {
          this.checkAndStartAnimation();
          this.initialRouteProcessed = true;
        } else {
          this.checkAndStartAnimation();
        }
      });
  }

  /**
   * Evaluates current route and manages animation state
   * Resets animation properties and starts sequence for login pages
   */
  private checkAndStartAnimation(): void {
    const currentUrl = this.router.url;
    const isLoginRoute = currentUrl === '/auth/login';

    if (isLoginRoute) {
      this.resetAnimationState();
      this.startSplashAnimation();
    } else {
      this.disableSplashScreen();
    }

    this.appInitialized = true;
  }

  /**
   * Resets all animation properties to initial state
   * Prepares component for new animation sequence
   */
  private resetAnimationState(): void {
    this.showSplashScreen = true;
    this.logoAnimating = false;
    this.animationComplete = false;
    this.logoSwapping = false;
  }

  /**
   * Disables splash screen for non-login pages
   * Sets final state for regular navigation
   */
  private disableSplashScreen(): void {
    this.showSplashScreen = false;
    this.animationComplete = true;
  }

  /**
   * Initiates the splash screen animation sequence
   * Manages timing and device-specific behavior
   */
  private startSplashAnimation(): void {
    setTimeout(() => {
      this.triggerLogoAnimation();
    }, 500);
  }

  /**
   * Activates logo animation and sets up completion timers
   * Handles different timing for mobile and desktop devices
   */
  private triggerLogoAnimation(): void {
    this.logoAnimating = true;

    if (this.isMobile) {
      this.handleMobileAnimation();
    } else {
      this.handleDesktopAnimation();
    }
  }

  /**
   * Manages mobile-specific animation sequence
   * Includes logo swapping and shorter duration
   */
  private handleMobileAnimation(): void {
    this.enableLogoSwapping();
    this.scheduleAnimationCompletion(1300);
  }

  /**
   * Manages desktop-specific animation sequence
   * Uses standard duration without logo swapping
   */
  private handleDesktopAnimation(): void {
    this.scheduleAnimationCompletion(3500);
  }

  /**
   * Enables logo crossfade effect for mobile devices
   * Triggers immediate logo swap
   */
  private enableLogoSwapping(): void {
    setTimeout(() => {
      this.logoSwapping = true;
    }, 0);
  }

  /**
   * Schedules the completion of splash screen animation
   * @param {number} delay - Duration in milliseconds before completion
   */
  private scheduleAnimationCompletion(delay: number): void {
    setTimeout(() => {
      this.completeSplashAnimation();
    }, delay);
  }

  /**
   * Finalizes splash screen animation
   * Hides splash screen and marks animation as complete
   */
  private completeSplashAnimation(): void {
    this.showSplashScreen = false;
    this.animationComplete = true;
  }

  /**
   * Determines whether the layout components should be displayed
   * Hides navigation and header on authentication routes
   * @returns {boolean} True if layout should be visible
   */
  shouldShowLayout(): boolean {
    const noLayoutRoutes = ['/', '/auth', '/auth/login', '/auth/register'];
    return !noLayoutRoutes.includes(this.router.url);
  }
}
