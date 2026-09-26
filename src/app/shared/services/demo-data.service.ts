import { EnvironmentInjector, Injectable, inject, runInInjectionContext } from '@angular/core';
import {
  Firestore,
  QueryConstraint,
  Timestamp,
  collection,
  doc,
  getDocs,
  query,
  where,
  writeBatch,
} from '@angular/fire/firestore';
import { Contacts } from '../../main-pages/contacts-interface';
import { Task } from '../../main-pages/shared-data/task.interface';
import { TaskDataService } from '../../main-pages/shared-data/task-data.service';

/**
 * Service that restores the demo contacts and tasks shown to visitors.
 *
 * Every demo record is written under a fixed document ID with a single batch of `set` operations.
 * Seeding is therefore idempotent: no matter how often or how many visitors at once trigger it,
 * the database always holds exactly one copy of each demo record, reset to its original state.
 * Records created by visitors are tagged with `createdBy` and `createdAt` (see visitor-data.ts) and deleted
 * when their creator logs out, or 24 hours after creation for visitors who never log out.
 */
@Injectable({
  providedIn: 'root',
})
export class DemoDataService {
  /** Firebase Firestore instance */
  private readonly firestore = inject(Firestore);

  /** Angular environment injector for dependency injection context */
  private readonly injector = inject(EnvironmentInjector);

  /** Task service, used to convert tasks to their Firestore format */
  private readonly taskDataService = inject(TaskDataService);

  /** Collections that hold visitor data */
  private readonly visitorCollections = ['contacts', 'tasks'];

  /** How long records created by visitors are kept at most */
  private readonly visitorDataLifetimeMs = 24 * 60 * 60 * 1000;

  /**
   * Prepares the demo after sign-in: restores the demo records and deletes expired visitor data
   * @returns {Promise<void>} Promise that resolves when the demo is ready
   */
  async prepareDemo(): Promise<void> {
    await this.seedDemoData();
    await this.deleteExpiredVisitorData();
  }

  /**
   * Deletes all contacts and tasks created by the given user. Called on logout.
   * Errors are logged and not rethrown, so a failed cleanup never blocks the logout.
   * @param {string} userId - UID of the user whose records are deleted
   * @returns {Promise<void>} Promise that resolves when the records have been deleted
   */
  async deleteVisitorData(userId: string): Promise<void> {
    await this.deleteMatchingRecords(where('createdBy', '==', userId));
  }

  /**
   * Deletes contacts and tasks created by visitors more than 24 hours ago,
   * which covers visitors who closed the tab without logging out.
   * @returns {Promise<void>} Promise that resolves when the records have been deleted
   */
  async deleteExpiredVisitorData(): Promise<void> {
    const cutoff = Timestamp.fromMillis(Date.now() - this.visitorDataLifetimeMs);
    await this.deleteMatchingRecords(where('createdAt', '<', cutoff));
  }

  /**
   * Deletes every contact and task matching the given constraint in a single batch
   * @param {QueryConstraint} constraint - Filter selecting the records to delete
   * @returns {Promise<void>} Promise that resolves when the records have been deleted
   */
  private async deleteMatchingRecords(constraint: QueryConstraint): Promise<void> {
    try {
      const batch = runInInjectionContext(this.injector, () => writeBatch(this.firestore));
      let count = 0;
      for (const collectionName of this.visitorCollections) {
        const snapshot = await runInInjectionContext(this.injector, () =>
          getDocs(query(collection(this.firestore, collectionName), constraint)),
        );
        snapshot.forEach((record) => batch.delete(record.ref));
        count += snapshot.size;
      }
      if (count > 0) {
        await batch.commit();
      }
    } catch (error: unknown) {
      console.error('Error deleting visitor data:', error);
    }
  }

  /**
   * Writes all demo contacts and tasks under their fixed IDs, overwriting any previous version.
   * Errors are logged and not rethrown, so a failed seed never blocks the login.
   * @returns {Promise<void>} Promise that resolves when the demo data has been written
   */
  async seedDemoData(): Promise<void> {
    try {
      await runInInjectionContext(this.injector, () => {
        const batch = writeBatch(this.firestore);
        for (const [id, contact] of Object.entries(this.getDemoContacts())) {
          batch.set(doc(this.firestore, 'contacts', id), contact);
        }
        for (const [id, task] of Object.entries(this.getDemoTasks())) {
          batch.set(doc(this.firestore, 'tasks', id), this.taskDataService.translateTaskToFirestoreTask(task));
        }
        return batch.commit();
      });
    } catch (error: unknown) {
      console.error('Error seeding demo data:', error);
    }
  }

  /**
   * Returns the demo contacts keyed by their fixed document ID
   * @returns {Record<string, Contacts>} Demo contacts
   */
  private getDemoContacts(): Record<string, Contacts> {
    return {
      'demo-contact-alice-johnson': {
        name: 'Alice Johnson',
        email: 'alice.johnson@demomail.com',
        phone: '+1 (555) 123-4567',
      },
      'demo-contact-bob-smith': { name: 'Bob Smith', email: 'bob.smith@demomail.com', phone: '+1 (555) 234-5678' },
      'demo-contact-carol-davis': {
        name: 'Carol Davis',
        email: 'carol.davis@demomail.com',
        phone: '+1 (555) 345-6789',
      },
      'demo-contact-david-wilson': {
        name: 'David Wilson',
        email: 'david.wilson@demomail.com',
        phone: '+1 (555) 456-7890',
      },
      'demo-contact-emma-brown': { name: 'Emma Brown', email: 'emma.brown@demomail.com', phone: '+1 (555) 567-8901' },
      'demo-contact-frank-miller': {
        name: 'Frank Miller',
        email: 'frank.miller@demomail.com',
        phone: '+1 (555) 678-9012',
      },
      'demo-contact-grace-lee': { name: 'Grace Lee', email: 'grace.lee@demomail.com', phone: '+1 (555) 789-0123' },
      'demo-contact-henry-taylor': {
        name: 'Henry Taylor',
        email: 'henry.taylor@demomail.com',
        phone: '+1 (555) 890-1234',
      },
      'demo-contact-isabella-martinez': {
        name: 'Isabella Martinez',
        email: 'isabella.martinez@demomail.com',
        phone: '+1 (555) 901-2345',
      },
      'demo-contact-jack-anderson': {
        name: 'Jack Anderson',
        email: 'jack.anderson@demomail.com',
        phone: '+1 (555) 012-3456',
      },
    };
  }

  /**
   * Returns the demo tasks keyed by their fixed document ID, one project spread over all board columns
   * @returns {Record<string, Task>} Demo tasks
   */
  private getDemoTasks(): Record<string, Task> {
    return {
      'demo-task-project-planning': {
        title: 'E-Commerce Platform - Project Planning',
        description:
          'Plan the complete e-commerce platform project including requirements analysis, technology stack selection, and timeline creation.',
        assignedUsers: ['Alice Johnson', 'Bob Smith', 'Carol Davis'],
        dueDate: this.getDateInDays(7),
        createdDate: new Date(),
        priority: 'urgent',
        category: 'User Story',
        subtasks: [
          { id: 'st1', title: 'Analyze business requirements', completed: false },
          { id: 'st2', title: 'Define technical specifications', completed: false },
          { id: 'st3', title: 'Create project timeline', completed: false },
          { id: 'st4', title: 'Set up development environment', completed: false },
        ],
        status: 'todo',
      },
      'demo-task-backend-development': {
        title: 'E-Commerce Platform - Backend Development',
        description:
          'Develop the core backend infrastructure including API design, database setup, and authentication system.',
        assignedUsers: ['David Wilson', 'Frank Miller', 'Grace Lee'],
        dueDate: this.getDateInDays(14),
        createdDate: new Date(),
        priority: 'urgent',
        category: 'Technical Task',
        subtasks: [
          { id: 'st5', title: 'Design REST API structure', completed: true },
          { id: 'st6', title: 'Set up database schema', completed: true },
          { id: 'st7', title: 'Implement user authentication', completed: false },
          { id: 'st8', title: 'Create product management APIs', completed: false },
        ],
        status: 'inprogress',
      },
      'demo-task-ui-ux-design': {
        title: 'E-Commerce Platform - UI/UX Design',
        description:
          'Complete user interface design for the e-commerce platform including wireframes, mockups, and user experience flow.',
        assignedUsers: ['Henry Taylor', 'Isabella Martinez', 'Emma Brown'],
        dueDate: this.getDateInDays(10),
        createdDate: new Date(),
        priority: 'medium',
        category: 'User Story',
        subtasks: [
          { id: 'st9', title: 'Create wireframes', completed: true },
          { id: 'st10', title: 'Design product catalog pages', completed: true },
          { id: 'st11', title: 'Design checkout process', completed: true },
          { id: 'st12', title: 'Submit for stakeholder review', completed: true },
        ],
        status: 'awaiting',
      },
      'demo-task-database-setup': {
        title: 'E-Commerce Platform - Database Setup',
        description:
          'Complete database architecture design and implementation with all necessary tables, relationships, and indexes.',
        assignedUsers: ['Jack Anderson', 'Alice Johnson'],
        dueDate: this.getDateInDays(-5),
        createdDate: new Date(),
        priority: 'urgent',
        category: 'Technical Task',
        subtasks: [
          { id: 'st13', title: 'Design database schema', completed: true },
          { id: 'st14', title: 'Create user and product tables', completed: true },
          { id: 'st15', title: 'Set up order management tables', completed: true },
          { id: 'st16', title: 'Configure database indexes', completed: true },
        ],
        status: 'done',
      },
    };
  }

  /**
   * Returns a date relative to today
   * @param {number} days - Number of days from today (negative for past dates)
   * @returns {Date} The resulting date
   */
  private getDateInDays(days: number): Date {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date;
  }
}
