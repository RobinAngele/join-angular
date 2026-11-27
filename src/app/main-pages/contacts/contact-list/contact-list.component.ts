import { Component, Output, EventEmitter, OnInit, Input } from '@angular/core';

import { getRandomColor } from '../../../shared/color-utils';
import { ContactDataService } from '../../shared-data/contact-data.service';

/**
 * Contact list component that displays an alphabetically organized list of contacts
 * Provides selection functionality and add contact capabilities
 */
@Component({
  selector: 'app-contact-list',
  imports: [],
  templateUrl: './contact-list.component.html',
  styleUrl: './contact-list.component.scss',
})
export class ContactListComponent implements OnInit {
  /** Indicates if the contact dialog is currently open */
  @Input() isDialogOpen: boolean = false;

  /** ID of the currently selected contact */
  @Input() selectedContactId: string | null = null;

  /** Event emitted when a contact is selected */
  @Output() contactSelected = new EventEmitter<string>();

  /** Event emitted when add contact is requested */
  @Output() addContactRequested = new EventEmitter<void>();

  /** Event emitted when dialog close is requested */
  @Output() closeDialogRequested = new EventEmitter<void>();

  /** Array of alphabet letters for contact grouping */
  alphabet: string[] = [];

  /** Reference to color utility function for avatar colors */
  getRandomColor = getRandomColor;

  /**
   * Constructor initializes the contact list component
   * @param {ContactDataService} contactDataService - Service for contact data operations
   */
  constructor(public contactDataService: ContactDataService) {}

  /**
   * Initializes the component and generates alphabet array
   */
  ngOnInit(): void {
    this.generateAlphabet();
  }

  /**
   * Generates the alphabet array for contact grouping
   */
  private generateAlphabet() {
    for (let i = 65; i <= 90; i++) {
      this.alphabet.push(String.fromCharCode(i));
    }
  }

  /**
   * Opens the add contact dialog
   */
  openAddContactDialog() {
    this.addContactRequested.emit();
  }

  /**
   * Opens or closes the mobile add contact dialog based on current state
   */
  openMobileAddContactDialog() {
    if (this.isDialogOpen) {
      this.closeDialogRequested.emit();
    } else {
      this.addContactRequested.emit();
    }
  }

  /**
   * Gets the first letter of a name
   * @param name - The contact name
   * @returns The first letter
   */
  getFirstLetter(name: string) {
    return name.charAt(0);
  }

  /**
   * Handles contact selection
   * @param contactId - The ID of the selected contact
   */
  selectContact(contactId: string | undefined) {
    if (contactId !== undefined) {
      localStorage.setItem('selectedContactId', contactId);
      this.contactSelected.emit(contactId);
    }
  }
}
