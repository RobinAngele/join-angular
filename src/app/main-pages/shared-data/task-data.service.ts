import { EnvironmentInjector, Injectable, inject, runInInjectionContext } from '@angular/core';
import { BehaviorSubject, map, Observable } from 'rxjs';
import {
  Firestore,
  collection,
  doc,
  addDoc,
  deleteDoc,
  updateDoc,
  DocumentData,
  CollectionReference,
  Timestamp,
  collectionData,
} from '@angular/fire/firestore';
import { Auth, onAuthStateChanged } from '@angular/fire/auth';
import { Task, BoardColumn, FirestoreTask } from './task.interface';
import { getVisitorMetadata } from '../../shared/services/visitor-data';

/**
 * Service for managing tasks in Firestore.
 * Handles real-time updates, CRUD operations, and conversions between Firestore and internal task format.
 *
 * @class TaskDataService
 */
@Injectable({
  providedIn: 'root',
})
export class TaskDataService {
  // #region Properties
  /**
   * Holds the current list of Task objects as a reactive data stream.
   */
  private tasksSubject: BehaviorSubject<Task[]> = new BehaviorSubject<Task[]>([]);

  /**
   * Observable stream of all Task objects, updated in real time.
   */
  public tasks$: Observable<Task[]> = this.tasksSubject.asObservable();

  /**
   * Stores the unsubscribe function for the tasks observable.
   * Used for cleanup to avoid memory leaks.
   */
  private unsubscribeFromTasks?: () => void;

  /**
   * Static board columns with status mapping for Kanban UI.
   */
  private columns: BoardColumn[] = [
    {
      id: '1',
      title: 'ToDo',
      status: 'todo',
      tasks: [],
      connectedStatuses: ['inprogress', 'awaiting', 'done'],
    },
    {
      id: '2',
      title: 'In Progress',
      status: 'inprogress',
      tasks: [],
      connectedStatuses: ['todo', 'awaiting', 'done'],
    },
    {
      id: '3',
      title: 'Awaiting Feedback',
      status: 'awaiting',
      tasks: [],
      connectedStatuses: ['todo', 'inprogress', 'done'],
    },
    {
      id: '4',
      title: 'Done',
      status: 'done',
      tasks: [],
      connectedStatuses: ['todo', 'inprogress', 'awaiting'],
    },
  ];

  /**
   * AngularFire Firestore instance for database access (injected).
   */
  private readonly firestore = inject(Firestore);

  /**
   * Angular EnvironmentInjector for running code in the correct injection context.
   */
  private readonly injector = inject(EnvironmentInjector);

  /**
   * Firebase Auth instance, used to start the tasks listener only once a user is signed in.
   */
  private readonly auth = inject(Auth);
  // #endregion

  /**
   * Initializes the TaskDataService and starts the tasks listener whenever a user signs in.
   * Firestore rules require authentication, so a listener started before sign-in would be rejected.
   */
  constructor() {
    onAuthStateChanged(this.auth, (user) => {
      this.cleanUp();
      if (user) {
        this.initTasks();
      } else {
        this.tasksSubject.next([]);
      }
    });
  }

  // #region Lifecycle
  /**
   * Initializes the task listener and sets up the tasks stream.
   *
   * - Subscribes to the Firestore 'tasks' collection as an observable stream.
   * - Uses the RxJS `map` operator to transform the emitted list of tasks.
   * - Inside the RxJS `map`, uses JavaScript’s `Array.map` to convert each FirestoreTask object:
   *   - Transforms Firestore Timestamp fields (e.g., createdDate, dueDate) into native JavaScript Date objects
   *     using `translateTimestampToDate`.
   * - Updates the `tasksSubject` with the converted Task array for reactive use in the UI.
   * - Stores the unsubscribe function to allow proper cleanup later.
   */
  initTasks(): void {
    const taskSubStream = runInInjectionContext(this.injector, () =>
      collectionData(this.getTasksRef(), {
        idField: 'id',
      })
    )
      .pipe(map((tasks) => (tasks as FirestoreTask[]).map((task) => this.translateTimestampToDate(task))))
      .subscribe({
        next: (tasks) => this.tasksSubject.next(tasks as Task[]),
        error: (error) => console.error('Tasks listener error:', error),
      });
    this.unsubscribeFromTasks = () => taskSubStream.unsubscribe();
  }

  /**
   * Unsubscribes from the tasks observable stream to prevent memory leaks.
   */
  cleanUp(): void {
    this.unsubscribeFromTasks?.();
    this.unsubscribeFromTasks = undefined;
  }
  // #endregion

  // #region Getters
  /**
   * Returns a reference to the Firestore 'tasks' collection.
   * @returns {CollectionReference<DocumentData, DocumentData>} Firestore collection reference for tasks.
   */
  getTasksRef(): CollectionReference<DocumentData, DocumentData> {
    return collection(this.firestore, 'tasks');
  }

  /**
   * Returns an observable of board columns, each containing the tasks filtered by their status.
   * @returns {Observable<BoardColumn[]>} Observable stream of board columns with grouped tasks.
   */
  getBoardColumns(): Observable<BoardColumn[]> {
    return this.tasks$.pipe(
      map((tasks) => {
        return this.columns.map((column) => ({
          ...column,
          tasks: tasks.filter((task) => task.status === column.status),
        }));
      })
    );
  }
  // #endregion

  // #region CRUD-Methods
  /**
   * Adds a new task to the Firestore 'tasks' collection.
   * Runs inside the Angular injection context to avoid zone errors.
   * @param {FirestoreTask} task - The task object to add.
   * @returns {Promise<void>} Promise that resolves when the task is added.
   */
  async addTask(task: Task): Promise<void> {
    const taskToAdd: FirestoreTask = this.translateTaskToFirestoreTask(task);

    try {
      await runInInjectionContext(this.injector, () =>
        addDoc(this.getTasksRef(), { ...taskToAdd, ...getVisitorMetadata(this.auth) })
      );
    } catch (error: unknown) {
      console.error('Error adding task:', error);
      throw error;
    }
  }

  /**
   * Deletes a task from the Firestore 'tasks' collection by ID.
   * Runs inside the Angular injection context to avoid zone errors.
   * @param {string} taskId - The ID of the task to delete.
   * @returns {Promise<void>} Promise that resolves when the task is deleted.
   */
  async deleteTask(taskId: string): Promise<void> {
    try {
      await runInInjectionContext(this.injector, () => {
        const docRef = doc(this.firestore, 'tasks', taskId);
        return deleteDoc(docRef);
      });
    } catch (error: unknown) {
      console.error('Error deleting task:', error);
      throw error;
    }
  }

  /**
   * Updates an existing task in the Firestore 'tasks' collection.
   * Runs inside the Angular injection context to avoid zone errors.
   * @param {string} taskId - The ID of the task to update.
   * @param {Partial<FirestoreTask>} updateData - The data to update (partial task object).
   * @returns {Promise<void>} Promise that resolves when the task is updated.
   */
  async updateTask(taskId: string, updateData: Partial<Task>): Promise<void> {
    const updateDataFirestore: Partial<FirestoreTask> = this.translatePartialTaskToPartialFirestoreTask(updateData);

    try {
      await runInInjectionContext(this.injector, () => {
        const docRef = doc(this.firestore, 'tasks', taskId);
        return updateDoc(docRef, updateDataFirestore);
      });
    } catch (error: unknown) {
      console.error('Error editing task:', error);
      throw error;
    }
  }
  // #endregion

  // #region Helpers
  /**
   * Extracts dueDate from the FirestoreTask object and creates a new object containing all other properties.
   * Converts Firestore Timestamp fields (createdDate, dueDate) to JavaScript Date objects.
   *
   * @param task - The FirestoreTask object as retrieved from Firestore (with Timestamp fields).
   * @returns A Task object where all Timestamps are converted to Date, and dueDate is only set if it exists.
   */
  translateTimestampToDate(task: FirestoreTask): Task {
    const { dueDate, ...taskWithoutDueDate } = task;

    return {
      ...taskWithoutDueDate,
      createdDate: task.createdDate instanceof Timestamp ? task.createdDate.toDate() : task.createdDate,
      ...(dueDate instanceof Timestamp ? { dueDate: dueDate.toDate() } : {}),
    };
  }

  /**
   * Converts a partial Task object with possible JavaScript Date fields to a partial FirestoreTask object,
   * where Date fields are converted to Firestore Timestamps if present, or set to null if not set (for dueDate).
   *
   * @param {Partial<Task>} task - The partial Task object with optional Date fields.
   * @returns {Partial<FirestoreTask>} A partial FirestoreTask object where date fields are Firestore Timestamps or null if not set.
   */
  translatePartialTaskToPartialFirestoreTask(task: Partial<Task>): Partial<FirestoreTask> {
    const result: Partial<FirestoreTask> = {};
    if (task.title) result.title = task.title;
    if (task.description) result.description = task.description;
    if (task.category) result.category = task.category;
    if (task.priority) result.priority = task.priority;
    if (task.status) result.status = task.status;
    if (task.assignedUsers) result.assignedUsers = task.assignedUsers;
    if (task.subtasks) result.subtasks = task.subtasks;

    if (task.createdDate) {
      result.createdDate = this.convertToTimestamp(task.createdDate);
    }
    if ('dueDate' in task) {
      result.dueDate = this.convertToTimestampOrNull(task.dueDate);
    }

    return result;
  }

  /**
   * Converts a Task object with JavaScript Date fields to a FirestoreTask object
   * where all date fields are converted to Firestore Timestamps, except fields that are not set,
   * which will be set to null (e.g., dueDate may be null).
   *
   * @param {Task} task - The Task object with JavaScript Date fields.
   * @returns {FirestoreTask} A FirestoreTask object where date fields are Firestore Timestamps or null if not set.
   */
  translateTaskToFirestoreTask(task: Task): FirestoreTask {
    return {
      title: task.title,
      description: task.description,
      category: task.category,
      priority: task.priority,
      status: task.status,
      assignedUsers: task.assignedUsers,
      createdDate: task.createdDate instanceof Date ? Timestamp.fromDate(task.createdDate) : task.createdDate,
      dueDate: task.dueDate ? Timestamp.fromDate(task.dueDate) : null,
      subtasks: task.subtasks,
    };
  }

  /**
   * Converts a JavaScript Date to a Firestore Timestamp.
   * If the input is already a Firestore Timestamp, it is returned unchanged.
   *
   * @param {Date | Timestamp} date - The value to convert.
   * @returns {Timestamp} The input as a Firestore Timestamp.
   */
  convertToTimestamp(date: Date | Timestamp): Timestamp {
    return date instanceof Date ? Timestamp.fromDate(date) : date;
  }

  /**
   * Converts a JavaScript Date to a Firestore Timestamp.
   * If the input is already a Firestore Timestamp, it is returned unchanged.
   * If the input is undefined or null, null is returned.
   * This function handles all cases using a conditional (ternary) expression.
   *
   * @param {Date | Timestamp | undefined | null} date - The value to convert.
   * @returns {Timestamp | null} A Firestore Timestamp if input is a Date or Timestamp, or null if input is undefined or null.
   */
  convertToTimestampOrNull(date: Date | undefined | null): Timestamp | null {
    return date instanceof Date ? Timestamp.fromDate(date) : date ?? null;
  }
  // #endregion
}
