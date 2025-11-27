'use client';

import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  addDoc,
  serverTimestamp
} from 'firebase/firestore';
import { getFirestore } from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';
import type { Plant } from '@/types';

// Initialize Firebase and get Firestore instance
const { firestore } = initializeFirebase();

/**
 * Get all plants for a specific user.
 * @param userId - The ID of the user.
 * @param callback - The callback function to handle the data.
 * @returns An unsubscribe function.
 */
export const getPlanta = (userId: string, callback: (plants: Plant[]) => void) => {
  if (!userId) {
    console.error("User ID is not provided for getPlanta");
    return () => {}; // Return an empty unsubscribe function
  }
  const plantsCollection = collection(firestore, 'plants');
  const q = query(plantsCollection, where('ownerId', '==', userId));

  const unsubscribe = onSnapshot(
    q,
    (querySnapshot) => {
      const plants: Plant[] = [];
      querySnapshot.forEach((doc) => {
        plants.push({ id: doc.id, ...doc.data() } as Plant);
      });
      callback(plants);
    },
    (error) => {
      console.error('Error fetching plants:', error);
    }
  );

  return unsubscribe;
};


/**
 * Add a new plant for a specific user.
 * @param userId - The ID of the user.
 * @param plantData - The data for the new plant.
 * @returns A promise that resolves when the plant is added.
 */
export const addPlanta = async (userId: string, plantData: Omit<Plant, 'id' | 'ownerId' | 'createdAt'>) => {
  const plantsCollection = collection(firestore, 'plants');
  await addDoc(plantsCollection, {
    ...plantData,
    ownerId: userId,
    createdAt: serverTimestamp(),
  });
};


/**
 * Update an existing plant.
 * @param userId - The ID of the user (for security checks, though rules handle it).
 * @param plantId - The ID of the plant to update.
 * @param updatedData - The data to update.
 * @returns A promise that resolves when the plant is updated.
 */
export const updatePlanta = async (userId: string, plantId: string, updatedData: Partial<Plant>) => {
  const plantDocRef = doc(firestore, 'plants', plantId);
  await updateDoc(plantDocRef, updatedData);
};

/**
 * Delete a plant.
 * @param userId - The ID of the user (for security checks).
 * @param plantId - The ID of the plant to delete.
 * @returns A promise that resolves when the plant is deleted.
 */
export const deletePlanta = async (userId: string, plantId: string) => {
  const plantDocRef = doc(firestore, 'plants', plantId);
  await deleteDoc(plantDocRef);
};
