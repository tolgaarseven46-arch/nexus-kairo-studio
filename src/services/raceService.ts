import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Race, RaceStatus } from '../types';

const COLLECTION_NAME = 'races';

export const raceService = {
  // Real-time subscription to all races
  subscribeRaces(
    onUpdate: (races: Race[]) => void,
    onError?: (error: Error) => void
  ): () => void {
    const racesRef = collection(db, COLLECTION_NAME);
    const q = query(racesRef, orderBy('createdAt', 'desc'));

    return onSnapshot(
      q,
      (snapshot) => {
        const races: Race[] = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            name: data.name || '',
            description: data.description || '',
            status: (data.status as RaceStatus) || 'Active',
            createdAt: data.createdAt?.toDate
              ? data.createdAt.toDate().toISOString()
              : data.createdAt || new Date().toISOString(),
            updatedAt: data.updatedAt?.toDate
              ? data.updatedAt.toDate().toISOString()
              : data.updatedAt || new Date().toISOString(),
          };
        });
        onUpdate(races);
      },
      (error) => {
        console.error('Error subscribing to races:', error);
        if (onError) onError(error);
      }
    );
  },

  // Get all races once
  async getRaces(): Promise<Race[]> {
    const racesRef = collection(db, COLLECTION_NAME);
    const q = query(racesRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);

    return snapshot.docs.map((docSnap) => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        name: data.name || '',
        description: data.description || '',
        status: (data.status as RaceStatus) || 'Active',
        createdAt: data.createdAt?.toDate
          ? data.createdAt.toDate().toISOString()
          : data.createdAt || new Date().toISOString(),
        updatedAt: data.updatedAt?.toDate
          ? data.updatedAt.toDate().toISOString()
          : data.updatedAt || new Date().toISOString(),
      };
    });
  },

  // Get a single race
  async getRaceById(id: string): Promise<Race | null> {
    const docRef = doc(db, COLLECTION_NAME, id);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) return null;

    const data = docSnap.data();
    return {
      id: docSnap.id,
      name: data.name || '',
      description: data.description || '',
      status: (data.status as RaceStatus) || 'Active',
      createdAt: data.createdAt?.toDate
        ? data.createdAt.toDate().toISOString()
        : data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt?.toDate
        ? data.updatedAt.toDate().toISOString()
        : data.updatedAt || new Date().toISOString(),
    };
  },

  // Create a new race
  async createRace(raceData: {
    name: string;
    description: string;
    status: RaceStatus;
  }): Promise<string> {
    const racesRef = collection(db, COLLECTION_NAME);
    const now = new Date().toISOString();
    const docRef = await addDoc(racesRef, {
      name: raceData.name.trim(),
      description: raceData.description.trim(),
      status: raceData.status,
      createdAt: now,
      updatedAt: now,
    });
    return docRef.id;
  },

  // Update an existing race
  async updateRace(
    id: string,
    raceData: {
      name?: string;
      description?: string;
      status?: RaceStatus;
    }
  ): Promise<void> {
    const docRef = doc(db, COLLECTION_NAME, id);
    const updatePayload: Record<string, any> = {
      updatedAt: new Date().toISOString(),
    };

    if (raceData.name !== undefined) updatePayload.name = raceData.name.trim();
    if (raceData.description !== undefined)
      updatePayload.description = raceData.description.trim();
    if (raceData.status !== undefined) updatePayload.status = raceData.status;

    await updateDoc(docRef, updatePayload);
  },

  // Delete a race
  async deleteRace(id: string): Promise<void> {
    const docRef = doc(db, COLLECTION_NAME, id);
    await deleteDoc(docRef);
  },
};
