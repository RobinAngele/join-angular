import { Component, Output, EventEmitter, Input, OnInit, OnChanges, SimpleChanges, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';

import { Contacts } from '../../../contacts-interface';
import { getRandomColor } from '../../../../shared/color-utils';
import { ContactDataService } from '../../../shared-data/contact-data.service';
import { AuthenticationService } from '../../../../auth/services/authentication.service';

/**
 * Component responsible for rendering and managing the contact form.
 * Handles both creation and editing of a contact.
 */
@Component({
  selector: 'app-contact-form',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './contact-form.component.html',
  styleUrl: './contact-form.component.scss',
})
export class ContactFormComponent implements OnInit, OnChanges {
  /**
   * The contact to be edited. If null, the form will create a new contact.
   */
  @Input() editingContact: Contacts | null = null;

  /**
   * Emits the contact data when the form is submitted.
   */
  @Output() contactSubmitted = new EventEmitter<Contacts>();

  /**
   * Emits an event when the user cancels the form action.
   */
  @Output() formCancelled = new EventEmitter<void>();

  /**
   * The reactive form group that holds the contact form fields.
   */
  contactForm: FormGroup;

  /**
   * Service used to manage contact data (injected using `inject()` for signal-based usage).
   */
  contactDataService = inject(ContactDataService);

  /**
   * Utility function to generate a random color.
   */
  getRandomColor = getRandomColor;

  /**
   * Constructor initializes the form group and injects required services.
   * @param fb Angular FormBuilder to create the reactive form.
   * @param authenticationService Service used to access authentication context.
   */
  constructor(private fb: FormBuilder, private authenticationService: AuthenticationService) {
    this.contactForm = this.fb.group({
      name: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.pattern(/^[\+]?[0-9\s\-\(\)]{10,}$/)]],
    });
  }

  /**
   * Initializes the form with prefilled data if editing
   */
  ngOnInit() {
    this.prefillForm();
  }

  /**
   * Handles changes to the editing contact input
   * @param changes - The changes to component inputs
   */
  ngOnChanges(changes: SimpleChanges) {
    if (changes['editingContact'] && !changes['editingContact'].firstChange) {
      this.prefillForm();
    }
  }

  /**
   * Prefills the form with existing contact data or resets it
   */
  private prefillForm() {
    if (this.editingContact) {
      this.contactForm.patchValue({
        name: this.editingContact.name || '',
        email: this.editingContact.email || '',
        phone: this.editingContact.phone || '',
      });
    } else {
      this.contactForm.reset();
    }
  }

  /**
   * Checks if a form field is invalid and should show errors
   * @param fieldName - The name of the field to check
   * @returns True if field is invalid and should show errors
   */
  isFieldInvalid(fieldName: string): boolean {
    const field = this.contactForm.get(fieldName);
    return field ? field.invalid && (field.dirty || field.touched) : false;
  }

  /**
   * Handles form submission for creating or updating contacts
   */
  onSubmit(): void {
    if (this.isFormValid()) {
      this.submitValidForm();
    } else {
      this.handleInvalidForm();
    }
  }

  /**
   * Checks if the form is valid
   * @returns {boolean} True if form is valid
   */
  private isFormValid(): boolean {
    return this.contactForm.valid;
  }

  /**
   * Handles invalid form submission
   */
  private handleInvalidForm(): void {
    this.markAllFieldsAsTouched();
  }

  /**
   * Submits a valid form with contact data
   */
  private submitValidForm(): void {
    const contactData = this.createContactDataFromForm();
    this.updateUserDisplayNameIfNeeded();
    this.contactSubmitted.emit(contactData);
  }

  /**
   * Creates contact data object from form values
   * @returns {Contacts} Contact data object
   */
  private createContactDataFromForm(): Contacts {
    const contactData: Contacts = {
      name: this.contactForm.value.name,
      email: this.contactForm.value.email,
      phone: this.contactForm.value.phone || '',
    };

    if (this.editingContact) {
      contactData.id = this.editingContact.id;
    }

    return contactData;
  }

  /**
   * Updates user display name if editing own contact
   */
  private updateUserDisplayNameIfNeeded(): void {
    if (this.isEditingOwnContact()) {
      this.authenticationService.updateUserDisplayName(this.contactForm.value.name);
    }
  }

  /**
   * Marks all form fields as touched to show validation errors
   */
  private markAllFieldsAsTouched() {
    Object.keys(this.contactForm.controls).forEach((key) => {
      this.contactForm.get(key)?.markAsTouched();
    });
  }

  /**
   * Deletes the current contact via ContactDataService
   */
  async deleteContact(): Promise<void> {
    if (!this.canDeleteContact()) {
      return;
    }

    try {
      await this.performContactDeletion();
      this.handleSuccessfulDeletion();
    } catch (error) {
      this.handleDeletionError(error);
    }
  }

  /**
   * Checks if contact can be deleted
   * @returns {boolean} True if contact can be deleted
   */
  private canDeleteContact(): boolean {
    return Boolean(this.editingContact?.id);
  }

  /**
   * Performs the actual contact deletion
   */
  private async performContactDeletion(): Promise<void> {
    await this.contactDataService.deleteContact(this.editingContact!.id!);
  }

  /**
   * Handles successful contact deletion
   */
  private handleSuccessfulDeletion(): void {
    this.formCancelled.emit();
  }

  /**
   * Handles contact deletion errors
   * @param {any} error - The error that occurred
   */
  private handleDeletionError(error: any): void {
    console.error('Error:', error);
    alert('Error. Cannot delete contact.');
  }

  /**
   * Handles form cancellation
   */
  onCancel(): void {
    this.formCancelled.emit();
  }

  /**
   * Gets initials from a contact name
   * @param {string} name - The contact name
   * @returns {string} The initials string
   */
  getInitials(name: string): string {
    return name
      .split(' ')
      .map((word) => this.extractFirstCharacter(word))
      .join('');
  }

  /**
   * Extracts first character from a word
   * @param {string} word - Word to extract character from
   * @returns {string} First character of the word
   */
  private extractFirstCharacter(word: string): string {
    return word.charAt(0);
  }

  /**
   * Checks if currently editing own contact
   * @returns {boolean} True if editing own contact
   */
  isEditingOwnContact(): boolean {
    if (!this.editingContact) {
      return false;
    }

    return this.authenticationService.isEmailOfCurrentUser(this.editingContact.email);
  }

  /**
   * Shows blocked edit information to user
   */
  showBlockedEditInfo(): void {
    if (this.isEditingOwnContact()) {
      this.displayEditBlockedMessage();
    }
  }

  /**
   * Displays message about blocked email editing
   */
  private displayEditBlockedMessage(): void {
    alert('Your email address is used for login and cannot be changed.');
  }
}
