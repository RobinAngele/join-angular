import { Auth } from '@angular/fire/auth';
import { FieldValue, serverTimestamp } from '@angular/fire/firestore';

/**
 * Fields added to every contact and task created by a visitor.
 * They let DemoDataService delete visitor data on logout (`createdBy`) and after it expires (`createdAt`).
 * Demo records never carry these fields, so they are never deleted.
 */
export interface VisitorMetadata {
  /** UID of the user who created the record */
  createdBy: string | null;
  /** Server time at which the record was created */
  createdAt: FieldValue;
}

/**
 * Builds the visitor metadata for a record created by the currently signed-in user
 * @param {Auth} auth - Firebase Auth instance
 * @returns {VisitorMetadata} Metadata to store alongside the new record
 */
export function getVisitorMetadata(auth: Auth): VisitorMetadata {
  return {
    createdBy: auth.currentUser?.uid ?? null,
    createdAt: serverTimestamp(),
  };
}
