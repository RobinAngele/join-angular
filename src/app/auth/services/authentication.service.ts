import { EnvironmentInjector, inject, Injectable, runInInjectionContext } from '@angular/core';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  Auth,
  UserCredential,
  updateProfile,
} from '@angular/fire/auth';
import { onAuthStateChanged, signInAnonymously, User } from 'firebase/auth';
import { BehaviorSubject, Observable } from 'rxjs';
import { DemoDataService } from '../../shared/services/demo-data.service';

/**
 * Service that manages all authentication-related logic using Firebase Auth.
 * Provides methods for sign-up, sign-in (including guest mode), sign-out, and user updates.
 * Exposes authentication state and utility methods for checking user roles and identities.
 *
 * @class AuthenticationService
 */
@Injectable({
  providedIn: 'root',
})
export class AuthenticationService {
  // #region Properties
  /**
   * Angular EnvironmentInjector used to run asynchronous operations
   * within the correct injection context.
   */
  private readonly injector = inject(EnvironmentInjector);

  /**
   * Service that deletes the data a visitor created when they log out.
   */
  private readonly demoDataService = inject(DemoDataService);

  /**
   * Emits the current authentication state of the user.
   * `true` if a user is signed in, `false` otherwise.
   */
  private authStateSubject: BehaviorSubject<boolean | null> = new BehaviorSubject<boolean | null>(null);

  /**
   * Public observable for components/guards to react to auth state changes
   */
  authState$: Observable<boolean | null> = this.authStateSubject.asObservable();

  /**
   * Currently signed-in Firebase user.
   * `null` if no user is authenticated.
   */
  currentUser: User | null = null;
  // #endregion

  /**
   * Creates an instance of the AuthenticationService and triggers the setup of the authentication state listener.
   *
   * @param auth The Firebase Auth instance injected via Angular's DI.
   */
  constructor(private auth: Auth) {
    this.initAuthStateListener();
  }

  // #region Initialization
  /**
   * Initializes a listener for changes in the Firebase authentication state.
   * Updates `authStateSubject` and `currentUser` whenever the auth state changes.
   */
  initAuthStateListener(): void {
    onAuthStateChanged(this.auth, (user) => {
      if (user) {
        this.authStateSubject.next(true);
        this.currentUser = user;
      } else {
        this.authStateSubject.next(false);
      }
    });
  }
  // #endregion

  // #region Sign Up
  /**
   * Creates a new user account using the provided email and password.
   * Executes within Angular's injection context to ensure compatibility with Firebase.
   *
   * @param email The user's email address.
   * @param password The user's password.
   * @returns A promise that resolves with the created user's credentials.
   * @throws An error with a user-friendly message if account creation fails.
   */
  async signUp(email: string, password: string): Promise<UserCredential> {
    try {
      return await runInInjectionContext(this.injector, () =>
        createUserWithEmailAndPassword(this.auth, email, password)
      );
    } catch (error: unknown) {
      console.error(error);
      throw new Error(this.handleFirebaseAuthError(error));
    }
  }
  // #endregion

  // #region Sign In
  /**
   * Signs in an existing user using email and password credentials.
   * Executes within Angular's injection context to ensure Firebase compatibility.
   *
   * @param email The user's email address.
   * @param password The user's password.
   * @returns A promise that resolves with the authenticated user's credentials.
   * @throws An error with a user-friendly message if authentication fails.
   */
  async signIn(email: string, password: string): Promise<UserCredential> {
    try {
      const result: UserCredential = await runInInjectionContext(this.injector, () =>
        signInWithEmailAndPassword(this.auth, email, password)
      );
      return result;
    } catch (error: unknown) {
      console.error(error);
      throw new Error(this.handleFirebaseAuthError(error));
    }
  }

  /**
   * Signs in a user anonymously without requiring credentials.
   * Executes within Angular's injection context to ensure compatibility with Firebase.
   *
   * @returns A promise that resolves with the guest user's credentials.
   * @throws An error if anonymous sign-in fails.
   */
  async guestSignIn(): Promise<UserCredential> {
    try {
      return await runInInjectionContext(this.injector, () => signInAnonymously(this.auth));
    } catch (error) {
      console.error(error);
      throw new Error('Could not log-in anonymously');
    }
  }
  // #endregion

  // #region Update User Account
  /**
   * Updates the display name of the currently signed-in user.
   * Executes within Angular's injection context to ensure compatibility with Firebase.
   *
   * @param name The new display name for the user.
   * @returns A promise that resolves when the update is complete.
   * @throws An error if the update fails or if no user is currently signed in.
   */
  async updateUserDisplayName(name: string): Promise<void> {
    if (this.auth.currentUser === null) return;
    try {
      return await runInInjectionContext(this.injector, () =>
        updateProfile(this.auth.currentUser!, { displayName: name })
      );
    } catch (error) {
      console.error(error);
      throw new Error('Could not update user data');
    }
  }
  // #endregion

  // #region Sign Out
  /**
   * Signs the user out from Firebase authentication.
   * Executes within Angular's injection context to ensure compatibility with Firebase.
   * Deletes the contacts and tasks the user created before signing out, since the app is a demo.
   * Also resets `currentUser` to `null` after a successful sign-out.
   *
   * @returns A promise that resolves when the user is signed out.
   * @throws An error if the sign-out process fails.
   */
  async logout(): Promise<void> {
    try {
      const userId = this.auth.currentUser?.uid;
      if (userId) {
        await this.demoDataService.deleteVisitorData(userId);
      }
      await runInInjectionContext(this.injector, () => signOut(this.auth));
      this.currentUser = null;
    } catch (error) {
      console.error(error);
      throw new Error('Something went wrong');
    }
  }
  // #endregion

  // #region State & Access
  /**
   * Returns the current authentication status of the user.
   *
   * @returns `true` if a user is authenticated, otherwise `false`.
   */
  isAuthenticated(): boolean | null {
    return this.authStateSubject.value;
  }

  /**
   * Check if the current user is a guest (anonymous) user
   */
  isGuestUser(): boolean {
    return this.auth.currentUser?.isAnonymous ?? false;
  }

  /**
   * Check if the current user is a regular (non-anonymous) user
   */
  isRegularUser(): boolean | null {
    return this.isAuthenticated() && !this.isGuestUser();
  }

  /**
   * Maps Firebase authentication error codes to user-friendly error messages.
   *
   * @param error The error object thrown by Firebase during authentication.
   * @returns A readable string message describing the error.
   */
  private handleFirebaseAuthError(error: unknown): string {
    const err = error as { code?: string };

    switch (err.code) {
      case 'auth/invalid-email':
        return 'Please enter a valid email address.';
      case 'auth/user-disabled':
        return 'This account has been disabled.';
      case 'auth/user-not-found':
        return 'No account found with this email address.';
      case 'auth/wrong-password':
        return 'Incorrect password. Please try again.';
      case 'auth/too-many-requests':
        return 'Too many failed login attempts. Please wait a moment and try again.';
      case 'auth/email-already-in-use':
        return 'This email address is already in use.';
      case 'auth/operation-not-allowed':
        return 'Email/password registration is currently disabled.';
      case 'auth/weak-password':
        return 'Your password is too weak. It must be at least 6 characters.';
      case 'auth/network-request-failed':
        return 'Network error – please check your internet connection.';
      case 'auth/internal-error':
        return 'An internal error occurred. Please try again later.';
      case 'auth/argument-error':
        return 'Invalid input. Please check your email and password.';
      case 'auth/popup-closed-by-user':
        return 'The sign-in popup was closed before completing the process.';
      case 'auth/cancelled-popup-request':
        return 'Another sign-in attempt is already in progress.';
      case 'auth/popup-blocked':
        return 'The sign-in popup was blocked by your browser.';
      default:
        console.warn('Unhandled Firebase Auth error:', error);
        return 'An unknown error occurred. Please try again.';
    }
  }

  /**
   * Checks if the provided email matches the currently signed-in user's email.
   *
   * @param email The email address to compare.
   * @returns `true` if the email matches the current user's email, otherwise `false`.
   */
  isEmailOfCurrentUser(email: string): boolean {
    if (this.currentUser !== null) {
      return email === this.currentUser.email;
    } else {
      return false;
    }
  }
  // #endregion
}
