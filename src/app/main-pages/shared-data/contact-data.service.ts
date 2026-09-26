import {
  Firestore,
  collection,
  doc,
  onSnapshot,
  addDoc,
  deleteDoc,
  updateDoc,
  DocumentData,
  QuerySnapshot,
  QueryDocumentSnapshot,
  CollectionReference,
  DocumentReference,
} from '@angular/fire/firestore';
import { Auth, onAuthStateChanged } from '@angular/fire/auth';
import { EnvironmentInjector, Injectable, inject, runInInjectionContext } from '@angular/core';
import { BehaviorSubject, Observable, Observer } from 'rxjs';
import { Contacts } from './../contacts-interface';

/**
 * Service for managing contact data operations with Firebase Firestore
 * Handles CRUD operations, contact organization, and real-time updates
 */
@Injectable({
  providedIn: 'root',
})
export class ContactDataService {
  /** Firebase Firestore instance */
  private readonly firestore = inject(Firestore);

  /** Angular environment injector for dependency injection context */
  private readonly injector = inject(EnvironmentInjector);

  /** Firebase Auth instance, used to start the listener only once a user is signed in */
  private readonly auth = inject(Auth);

  /** Unsubscribe function for the auth state listener */
  private unsubAuth?: () => void;

  /** Flag indicating if user is not in login state */
  notInLogIn: boolean = false;

  /** Controls visibility of signup button */
  signUpButtonVisible = true;

  /** Unsubscribe function for Firebase listeners */
  unsubList?: () => void;

  /** Organized contact list grouped by alphabetical letters */
  contactlist: { letter: string; contacts: Contacts[] }[] = [];

  /** Private behavior subject for selected contact ID */
  private selectedContactIdSubject = new BehaviorSubject<string | null>(null);

  /** Observable for selected contact ID changes */
  selectedContactId$ = this.selectedContactIdSubject.asObservable();

  /**
   * Initializes the ContactDataService and sets up Firebase listeners
   */
  constructor() {
    this.unsubAuth = onAuthStateChanged(this.auth, (user) => this.handleAuthChange(!!user));
  }

  /**
   * Starts the contact listener when a user signs in and stops it on sign-out.
   * Firestore rules require authentication, so a listener started before sign-in would be rejected.
   * @param {boolean} signedIn - Whether a user is currently signed in
   */
  private handleAuthChange(signedIn: boolean) {
    this.stopContactList();
    if (signedIn) {
      this.initializeContactList();
    } else {
      this.contactlist = [];
    }
  }

  /**
   * Sets up the Firebase listener for contact list updates
   */
  private initializeContactList() {
    this.unsubList = runInInjectionContext(this.injector, () =>
      onSnapshot(
        this.getContactRef(),
        (list) => {
          this.resetContactList();
          this.processContactList(list);
        },
        (error) => console.error('Contact listener error:', error)
      )
    );
  }

  /**
   * Stops the Firebase contact listener if it is running
   */
  private stopContactList() {
    this.unsubList?.();
    this.unsubList = undefined;
  }

  /**
   * Resets the contact list with alphabetical structure
   */
  private resetContactList() {
    this.contactlist = [];
    for (let i = 65; i <= 90; i++) {
      this.contactlist.push({
        letter: String.fromCharCode(i),
        contacts: [],
      });
    }
  }

  /**
   * Processes the Firebase contact list and organizes by letter
   * @param {QuerySnapshot<DocumentData>} list - Firebase snapshot list
   */
  private processContactList(list: QuerySnapshot<DocumentData>): void {
    list.forEach((element: QueryDocumentSnapshot<DocumentData>) => {
      const contact = this.setContactObject(element.data(), element.id);
      const firstLetter = contact.name.charAt(0).toUpperCase();
      const index = this.contactlist.findIndex((singleContact) => singleContact.letter === firstLetter);
      if (index !== -1) {
        this.contactlist[index].contacts.push(contact);
        this.contactlist[index].contacts.sort((a, b) => a.name.localeCompare(b.name));
      }
    });
  }

  /**
   * Sets the selected contact ID in the behavior subject
   * @param {string | null} contactId - The contact ID to select, or null to deselect
   */
  setSelectedContactId(contactId: string | null) {
    this.selectedContactIdSubject.next(contactId);
  }

  /**
   * Gets the current selected contact ID
   * @returns The currently selected contact ID or null
   */
  getSelectedContactId(): string | null {
    return this.selectedContactIdSubject.getValue();
  }

  /**
   * Cleans up Firebase listeners on component destruction
   */
  ngOnDestroy() {
    this.unsubAuth?.();
    this.stopContactList();
  }

  /**
   * Gets the Firebase contacts collection reference
   * @returns Firebase collection reference for contacts
   */
  getContactRef(): CollectionReference<DocumentData> {
    return collection(this.firestore, 'contacts');
  }

  /**
   * Gets a single document reference
   * @param {string} colId - Collection ID
   * @param {string} docId - Document ID
   * @returns {DocumentReference<DocumentData>} Firebase document reference
   */
  getSingleDocRef(colId: string, docId: string): DocumentReference<DocumentData> {
    return doc(collection(this.firestore, colId), docId);
  }

  /**
   * Creates a contact object from Firebase document data
   * @param {DocumentData} obj - Firebase document data
   * @param {string} id - Document ID
   * @returns {Contacts} Contacts object
   */
  setContactObject(obj: DocumentData, id: string): Contacts {
    return {
      id: id || '',
      name: obj['name'] as string,
      email: obj['email'] as string,
      phone: (obj['phone'] as string) || '',
    };
  }

  /**
   * Gets a contact by ID as an observable
   * @param {string} id - Contact ID to find
   * @returns {Observable<Contacts | null>} Observable of contact or null
   */
  getContactById(id: string): Observable<Contacts | null> {
    return new Observable<Contacts | null>((observer) => {
      const findAndEmitContact = this.createContactFinder(id, observer);
      return this.setupContactObserver(findAndEmitContact);
    });
  }

  /**
   * Creates a contact finder function
   * @param {string} id - Contact ID to find
   * @param {Observer<Contacts | null>} observer - Observable observer
   * @returns {() => void} Contact finder function
   */
  private createContactFinder(id: string, observer: Observer<Contacts | null>) {
    return () => {
      const contact = this.findContactInList(id);
      observer.next(contact || null);
    };
  }

  /**
   * Finds a contact in the contact list
   * @param {string} id - Contact ID to find
   * @returns {Contacts | undefined} Contact or undefined
   */
  private findContactInList(id: string): Contacts | undefined {
    for (const group of this.contactlist) {
      const contact = group.contacts.find((c) => c.id === id);
      if (contact) return contact;
    }
    return undefined;
  }

  /**
   * Sets up the contact observer with interval
   * @param {() => void} findAndEmitContact - Function to find and emit contact
   * @returns {() => void} Cleanup function
   */
  private setupContactObserver(findAndEmitContact: () => void) {
    findAndEmitContact();
    const intervalId = setInterval(findAndEmitContact, 300);
    return () => clearInterval(intervalId);
  }

  /**
   * Adds a new contact to Firebase
   * @param {Contacts} contactData - Contact data to add
   * @returns {Promise<void>} Promise that resolves when contact is added
   */
  async addContact(contactData: Contacts): Promise<void> {
    try {
      await runInInjectionContext(this.injector, () => addDoc(this.getContactRef(), contactData));
    } catch (error: unknown) {
      console.error('Error adding contact:', error);
      throw error;
    }
  }

  /**
   * Deletes a contact from Firebase
   * @param {string} contactId - ID of contact to delete
   * @returns {Promise<void>} Promise that resolves when contact is deleted
   */
  async deleteContact(contactId: string): Promise<void> {
    try {
      await runInInjectionContext(this.injector, () => deleteDoc(doc(this.firestore, 'contacts', contactId)));
    } catch (error: unknown) {
      console.error('Error deleting contact:', error);
      throw error;
    }
  }

  /**
   * Updates an existing contact in Firebase
   * @param {Contacts} contactData - Updated contact data
   * @returns {Promise<void>} Promise that resolves when contact is updated
   */
  async updateContact(contactData: Contacts): Promise<void> {
    if (contactData.id === undefined) return;
    const contactDataId: string = contactData.id;
    try {
      await runInInjectionContext(this.injector, () =>
        updateDoc(this.getSingleDocRef('contacts', contactDataId), this.getCleanJson(contactData))
      );
    } catch (err: unknown) {
      console.error('Error updating contact:', err);
      throw err;
    }
  }

  /**
   * Cleans contact object for Firebase storage
   * @param {Contacts} contact - Contact object to clean
   * @returns {Omit<Contacts, 'id'> & { id?: string }} Clean contact object
   */
  getCleanJson(contact: Contacts): Omit<Contacts, 'id'> & { id?: string } {
    return {
      id: contact.id,
      name: contact.name,
      email: contact.email,
      phone: contact.phone,
    };
  }

  /**
   * Gets initials from a contact name
   * @param {string} name - The contact name
   * @returns {string} The initials string
   */
  getInitials(name: string): string {
    return name
      .split(' ')
      .map((word) => word.charAt(0))
      .join('');
  }
}
