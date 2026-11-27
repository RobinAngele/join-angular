import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnChanges,
  ViewChild,
  ElementRef,
  ChangeDetectorRef,
} from '@angular/core';

import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { Task, Subtask } from '../../../../shared-data/task.interface';
import { ContactDataService } from '../../../../shared-data/contact-data.service';
import { getRandomColor, getInitials } from '../../../../../shared/color-utils';

/**
 * Task edit form component for editing task details
 * Handles form validation, contact management, and subtask editing
 */
@Component({
  selector: 'app-task-edit-form',
  imports: [ReactiveFormsModule, FormsModule],
  templateUrl: './task-edit-form.component.html',
  styleUrl: './task-edit-form.component.scss',
})
/**
 * Component for editing an existing task.
 * Provides form handling and emits events for saving and cancelling edits.
 */
export class TaskEditFormComponent implements OnInit, OnChanges {
  /**
   * The task data to be edited.
   */
  @Input() task: Task | null = null;

  /**
   * Emits the updated task when the save button is clicked.
   */
  @Output() saveClicked = new EventEmitter<Task>();

  /**
   * Emits when the cancel button is clicked.
   */
  @Output() cancelClicked = new EventEmitter<void>();

  /**
   * Reference to the input element used for editing task title.
   */
  @ViewChild('editInput') editInputRef!: ElementRef<HTMLInputElement>;

  /**
   * The reactive form for editing the task.
   */
  editForm!: FormGroup;

  /**
   * Controls the visibility of the contacts list.
   */
  showContactsList = false;

  /**
   * Search term used to filter contacts.
   */
  contactSearchTerm = '';

  /**
   * Index of the subtask currently being edited.
   */
  editingSubtaskIndex: number | null = null;

  /**
   * Temporary value for the subtask title being edited.
   */
  editingSubtaskText: string = '';

  /**
   * The minimum allowed date for the due date picker.
   */
  minDate: string = '';

  /**
   * Utility to get a random background color for contact avatars.
   */
  getRandomColor = getRandomColor;

  /**
   * Utility to get initials from a contact's name.
   */
  getInitials = getInitials;

  /**
   * Delay in milliseconds before focusing the edit input.
   */
  private readonly EDIT_INPUT_FOCUS_DELAY = 10;

  /**
   * Constructor for the TaskEditFormComponent.
   * Initializes the form and injects required services.
   *
   * @param formBuilder - Used to build the reactive form.
   * @param contactDataService - Provides access to contact data.
   * @param changeDetectorRef - Used to manually trigger change detection.
   */
  constructor(
    private formBuilder: FormBuilder,
    public contactDataService: ContactDataService,
    private changeDetectorRef: ChangeDetectorRef
  ) {
    this.initializeForm();
  }

  /**
   * Initializes component and sets minimum date
   */
  ngOnInit(): void {
    this.initializeTaskData();
    this.setMinimumDate();
  }

  /**
   * Handles input changes
   */
  ngOnChanges(): void {
    this.initializeTaskData();
  }

  /**
   * Initializes task data if available
   */
  private initializeTaskData(): void {
    if (this.task) {
      this.populateEditForm(this.task);
    }
  }

  /**
   * Sets minimum date to today
   */
  private setMinimumDate(): void {
    const today = new Date();
    this.minDate = today.toISOString().split('T')[0];
  }

  /**
   * Initializes the reactive form
   */
  private initializeForm(): void {
    this.editForm = this.formBuilder.group({
      title: ['', Validators.required],
      description: [''],
      dueDate: [''],
      priority: ['medium'],
      assignedUsers: [[]],
      subtasks: [[]],
    });
  }

  /**
   * Populates form with task data
   * @param {Task} task - Task to populate form with
   */
  private populateEditForm(task: Task): void {
    this.editForm.patchValue({
      title: task.title,
      description: task.description,
      dueDate: this.getFormattedDueDate(task.dueDate),
      priority: task.priority,
      assignedUsers: task.assignedUsers,
      subtasks: task.subtasks || [],
    });
  }

  /**
   * Gets formatted due date for form input
   * @param {Date | undefined} date - Date to format
   * @returns {string} Formatted date string
   */
  private getFormattedDueDate(date: Date | undefined): string {
    return date ? this.formatDateForInput(date) : '';
  }

  /**
   * Formats date for HTML input field
   * @param {Date} date - Date to format
   * @returns {string} ISO date string
   */
  private formatDateForInput(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  /**
   * Adds new subtask from user prompt
   */
  addSubtask(): void {
    const subtaskTitle = this.promptForSubtaskTitle();
    if (subtaskTitle) {
      this.createAndAddSubtask(subtaskTitle);
    }
  }

  /**
   * Prompts user for subtask title
   * @returns {string | null} Subtask title or null
   */
  private promptForSubtaskTitle(): string | null {
    return prompt('Enter subtask title:');
  }

  /**
   * Creates and adds new subtask to form
   * @param {string} title - Subtask title
   */
  private createAndAddSubtask(title: string): void {
    const currentSubtasks = this.getCurrentSubtasks();
    const newSubtask = this.createNewSubtask(title);

    this.updateSubtasksInForm([...currentSubtasks, newSubtask]);
  }

  /**
   * Creates new subtask object
   * @param {string} title - Subtask title
   * @returns {Subtask} New subtask object
   */
  private createNewSubtask(title: string): Subtask {
    return {
      id: Date.now().toString(),
      title: title,
      completed: false,
    };
  }

  /**
   * Gets current subtasks from form
   * @returns {Subtask[]} Current subtasks array
   */
  private getCurrentSubtasks(): Subtask[] {
    return this.editForm.get('subtasks')?.value || [];
  }

  /**
   * Updates subtasks in form
   * @param {Subtask[]} subtasks - Updated subtasks array
   */
  private updateSubtasksInForm(subtasks: Subtask[]): void {
    this.editForm.patchValue({ subtasks });
  }

  /**
   * Removes subtask at specified index
   * @param {number} index - Index of subtask to remove
   */
  removeSubtask(index: number): void {
    const currentSubtasks = this.getCurrentSubtasks();
    currentSubtasks.splice(index, 1);
    this.updateSubtasksInForm(currentSubtasks);
  }

  /**
   * Toggles user assignment to task
   * @param {string} userName - Name of user to toggle
   */
  toggleAssignedUser(userName: string): void {
    const currentUsers = this.getCurrentAssignedUsers();
    const updatedUsers = this.getUpdatedUsersList(currentUsers, userName);

    this.updateAssignedUsersInForm(updatedUsers);
  }

  /**
   * Gets current assigned users from form
   * @returns {string[]} Current assigned users
   */
  private getCurrentAssignedUsers(): string[] {
    return this.editForm.get('assignedUsers')?.value || [];
  }

  /**
   * Gets updated users list after toggle
   * @param {string[]} currentUsers - Current users list
   * @param {string} userName - User to toggle
   * @returns {string[]} Updated users list
   */
  private getUpdatedUsersList(currentUsers: string[], userName: string): string[] {
    const userIndex = currentUsers.indexOf(userName);

    if (userIndex > -1) {
      currentUsers.splice(userIndex, 1);
    } else {
      currentUsers.push(userName);
    }

    return currentUsers;
  }

  /**
   * Updates assigned users in form
   * @param {string[]} users - Updated users array
   */
  private updateAssignedUsersInForm(users: string[]): void {
    this.editForm.patchValue({ assignedUsers: users });
  }

  /**
   * Checks if user is assigned to task
   * @param {string} userName - User name to check
   * @returns {boolean} True if user is assigned
   */
  isUserAssigned(userName: string): boolean {
    const assignedUsers = this.getCurrentAssignedUsers();
    return assignedUsers.includes(userName);
  }

  /**
   * Gets all available contacts
   * @returns {string[]} Array of contact names
   */
  getAvailableContacts(): string[] {
    const contacts = this.extractContactNamesFromService();
    return this.getFilteredContacts(contacts);
  }

  /**
   * Extracts contact names from contact service
   * @returns {string[]} Array of contact names
   */
  private extractContactNamesFromService(): string[] {
    const contacts: string[] = [];

    this.contactDataService.contactlist.forEach((group) => {
      group.contacts.forEach((contact) => {
        contacts.push(contact.name);
      });
    });

    return contacts;
  }

  /**
   * Gets filtered contacts based on search term
   * @param {string[]} contacts - Array of contact names
   * @returns {string[]} Filtered contact names
   */
  getFilteredContacts(contacts: string[]): string[] {
    if (!this.hasValidSearchTerm()) {
      return contacts;
    }

    return this.filterContactsBySearchTerm(contacts);
  }

  /**
   * Checks if search term is valid
   * @returns {boolean} True if search term is valid
   */
  private hasValidSearchTerm(): boolean {
    return Boolean(this.contactSearchTerm?.trim());
  }

  /**
   * Filters contacts by search term
   * @param {string[]} contacts - Contacts to filter
   * @returns {string[]} Filtered contacts
   */
  private filterContactsBySearchTerm(contacts: string[]): string[] {
    const searchTerm = this.contactSearchTerm.toLowerCase();

    return contacts.filter((contactName) => {
      return this.contactMatchesSearchTerm(contactName, searchTerm);
    });
  }

  /**
   * Checks if contact matches search term
   * @param {string} contactName - Contact name to check
   * @param {string} searchTerm - Search term
   * @returns {boolean} True if contact matches
   */
  private contactMatchesSearchTerm(contactName: string, searchTerm: string): boolean {
    const contactObj = this.findContactByName(contactName);

    if (contactObj) {
      return this.checkContactObjectMatch(contactObj, searchTerm);
    }

    return contactName.toLowerCase().includes(searchTerm);
  }

  /**
   * Checks if contact object matches search term
   * @param {any} contactObj - Contact object to check
   * @param {string} searchTerm - Search term
   * @returns {boolean} True if contact matches
   */
  private checkContactObjectMatch(contactObj: any, searchTerm: string): boolean {
    const nameMatch = contactObj.name.toLowerCase().includes(searchTerm);
    const emailMatch = contactObj.email.toLowerCase().includes(searchTerm);
    return nameMatch || emailMatch;
  }

  /**
   * Finds contact object by name
   * @param {string} name - Contact name to search for
   * @returns {any | null} Contact object or null
   */
  private findContactByName(name: string): any | null {
    for (const group of this.contactDataService.contactlist) {
      const contact = group.contacts.find((c) => c.name === name);
      if (contact) {
        return contact;
      }
    }
    return null;
  }

  /**
   * Clears the contact search term
   */
  clearContactSearch(): void {
    this.contactSearchTerm = '';
  }

  /**
   * Handles search input changes
   * @param {Event} event - Input change event
   */
  onSearchChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.contactSearchTerm = input.value;
    this.changeDetectorRef.detectChanges();
  }

  /**
   * Handles save button click
   */
  onSaveClick(): void {
    if (this.isFormValidForSave()) {
      const updatedTask = this.createUpdatedTask();
      this.saveClicked.emit(updatedTask);
    }
  }

  /**
   * Checks if form is valid for saving
   * @returns {boolean} True if form is valid
   */
  private isFormValidForSave(): boolean {
    return this.editForm.valid && this.task !== null;
  }

  /**
   * Creates updated task from form values
   * @returns {Task} Updated task object
   */
  private createUpdatedTask(): Task {
    const formValue = this.editForm.value;

    return {
      ...this.task!,
      title: formValue.title,
      description: formValue.description,
      dueDate: this.parseDueDate(formValue.dueDate),
      priority: formValue.priority,
      assignedUsers: formValue.assignedUsers,
      subtasks: formValue.subtasks,
    };
  }

  /**
   * Parses due date from form value
   * @param {string} dateValue - Date value from form
   * @returns {Date | undefined} Parsed date or undefined
   */
  private parseDueDate(dateValue: string): Date | undefined {
    return dateValue ? new Date(dateValue) : undefined;
  }

  /**
   * Handles cancel button click
   */
  onCancelClick(): void {
    this.cancelClicked.emit();
  }

  /**
   * Sets task priority
   * @param {string} priority - Priority level to set
   */
  setPriority(priority: string): void {
    this.editForm.patchValue({ priority });
  }

  /**
   * Adds subtask from input element
   * @param {HTMLInputElement} inputElement - Input element
   */
  addSubtaskFromInput(inputElement: HTMLInputElement): void {
    const title = inputElement.value.trim();

    if (title) {
      this.createAndAddSubtask(title);
      inputElement.value = '';
    }
  }

  /**
   * Toggles contacts list visibility
   */
  toggleContactsList(): void {
    this.showContactsList = !this.showContactsList;
  }

  /**
   * Handles subtask input change
   * @param {Event} event - Input change event
   */
  onSubtaskInputChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.editingSubtaskText = target.value;
  }

  /**
   * Starts editing subtask at specified index
   * @param {number} index - Index of subtask to edit
   */
  startEditSubtask(index: number): void {
    const subtask = this.getSubtaskAtIndex(index);

    if (subtask) {
      this.setEditingState(index, subtask.title);
      this.focusEditInput();
    }
  }

  /**
   * Gets subtask at specified index
   * @param {number} index - Subtask index
   * @returns {Subtask | undefined} Subtask at index
   */
  private getSubtaskAtIndex(index: number): Subtask | undefined {
    const currentSubtasks = this.getCurrentSubtasks();
    return currentSubtasks[index];
  }

  /**
   * Sets editing state for subtask
   * @param {number} index - Subtask index
   * @param {string} title - Subtask title
   */
  private setEditingState(index: number, title: string): void {
    this.editingSubtaskIndex = index;
    this.editingSubtaskText = title;
  }

  /**
   * Focuses the edit input field
   */
  private focusEditInput(): void {
    setTimeout(() => {
      this.selectEditInput();
    }, this.EDIT_INPUT_FOCUS_DELAY);
  }

  /**
   * Selects text in edit input field
   */
  private selectEditInput(): void {
    const editInput = document.querySelector('.subtask-edit-input') as HTMLInputElement;
    if (editInput) {
      editInput.focus();
      editInput.select();
    }
  }

  /**
   * Saves subtask edit changes
   * @param {number} index - Index of subtask to save
   */
  saveSubtaskEdit(index: number): void {
    if (this.editingSubtaskText.trim()) {
      this.updateSubtaskTitle(index);
    }
    this.cancelSubtaskEdit();
  }

  /**
   * Updates subtask title at index
   * @param {number} index - Subtask index
   */
  private updateSubtaskTitle(index: number): void {
    const currentSubtasks = this.getCurrentSubtasks();
    currentSubtasks[index] = {
      ...currentSubtasks[index],
      title: this.editingSubtaskText.trim(),
    };
    this.updateSubtasksInForm(currentSubtasks);
  }

  /**
   * Cancels subtask editing
   */
  cancelSubtaskEdit(): void {
    this.editingSubtaskIndex = null;
    this.editingSubtaskText = '';
  }
}
