import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  updateDoc,
} from 'firebase/firestore';
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage';
import { db, storage } from '../lib/firebase';
import {
  DroitAssetCategory,
  DroitPhysicalAsset,
  DroitAppearanceBinding,
} from '../types/nexus';

const ASSETS_COLLECTION = 'physical_assets';
const CHARACTERS_COLLECTION = 'characters';
const DEFAULT_CHARACTER_ID = 'kairo';

/**
 * Helper to convert file to data URL in case of offline/storage fallback
 */
function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export const droitPhysicalAssetService = {
  /**
   * Uploads a physical asset file (PNG, WEBP, JPG) to Firebase Storage
   * and saves metadata to Firestore.
   */
  async uploadPhysicalAsset(params: {
    file: File;
    characterId?: string;
    category: DroitAssetCategory;
    name?: string;
  }): Promise<DroitPhysicalAsset> {
    const characterId = params.characterId || DEFAULT_CHARACTER_ID;
    const category = params.category;
    const cleanFileName = params.file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const timestamp = Date.now();
    const assetId = `asset_${category}_${timestamp}_${Math.random().toString(36).substring(2, 7)}`;
    const storagePath = `characters/${characterId}/assets/${category}/${timestamp}_${cleanFileName}`;

    let downloadURL = '';

    // 1. Try uploading to Firebase Storage
    try {
      if (storage) {
        const storageRef = ref(storage, storagePath);
        const metadata = {
          contentType: params.file.type || 'image/png',
          customMetadata: {
            characterId,
            category,
            uploadedVia: 'NexusStudio',
          },
        };

        const snapshot = await uploadBytes(storageRef, params.file, metadata);
        downloadURL = await getDownloadURL(snapshot.ref);
      }
    } catch (storageError) {
      console.warn('Firebase Storage upload warning, attempting fallback:', storageError);
    }

    // 2. Fallback if storage URL could not be resolved (e.g. offline or CORS in sandbox)
    if (!downloadURL) {
      try {
        downloadURL = await readFileAsDataUrl(params.file);
      } catch (readError) {
        console.error('Failed to read file as data url fallback:', readError);
        throw new Error('Dosya okunamadı veya yüklenemedi.');
      }
    }

    const displayName =
      params.name?.trim() ||
      params.file.name.replace(/\.[^/.]+$/, '').trim() ||
      `Asset_${category}_${timestamp}`;

    const newAsset: DroitPhysicalAsset = {
      id: assetId,
      characterId,
      category,
      name: displayName,
      storagePath,
      downloadURL,
      createdAt: new Date().toISOString(),
      isActive: true,
      fileType: params.file.type,
      fileSize: params.file.size,
    };

    // 3. Save metadata to Firestore
    try {
      const docRef = doc(db, ASSETS_COLLECTION, assetId);
      await setDoc(docRef, newAsset);
    } catch (firestoreError) {
      console.warn('Could not save asset metadata to Firestore:', firestoreError);
    }

    return newAsset;
  },

  /**
   * Fetches all uploaded assets for a specific character (or optionally filtered by category)
   */
  async getCharacterAssets(
    characterId: string = DEFAULT_CHARACTER_ID,
    category?: DroitAssetCategory
  ): Promise<DroitPhysicalAsset[]> {
    try {
      const assetsRef = collection(db, ASSETS_COLLECTION);
      let q;

      if (category) {
        q = query(
          assetsRef,
          where('characterId', '==', characterId),
          where('category', '==', category)
        );
      } else {
        q = query(assetsRef, where('characterId', '==', characterId));
      }

      const snapshot = await getDocs(q);
      const list: DroitPhysicalAsset[] = [];

      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as DroitPhysicalAsset;
        list.push({
          ...data,
          id: docSnap.id,
        });
      });

      // Sort by creation date descending
      return list.sort(
        (a, b) =>
          new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
      );
    } catch (error) {
      console.warn('Error fetching assets from Firestore:', error);
      return [];
    }
  },

  /**
   * Loads character's current active asset bindings
   */
  async loadPhysicalBindings(
    characterId: string = DEFAULT_CHARACTER_ID
  ): Promise<DroitAppearanceBinding> {
    try {
      const charRef = doc(db, CHARACTERS_COLLECTION, characterId);
      const snap = await getDoc(charRef);

      if (snap.exists()) {
        const data = snap.data();
        return (
          data?.physicalBindings || {
            faceAssetId: null,
            eyesAssetId: null,
            hairAssetId: null,
            clothingAssetId: null,
            accessoryAssetId: null,
          }
        );
      }

      return {
        faceAssetId: null,
        eyesAssetId: null,
        hairAssetId: null,
        clothingAssetId: null,
        accessoryAssetId: null,
      };
    } catch (error) {
      console.warn('Error loading physical bindings:', error);
      return {
        faceAssetId: null,
        eyesAssetId: null,
        hairAssetId: null,
        clothingAssetId: null,
        accessoryAssetId: null,
      };
    }
  },

  /**
   * Saves / binds active physical assets to character in Firestore
   */
  async savePhysicalBindings(
    bindings: DroitAppearanceBinding,
    characterId: string = DEFAULT_CHARACTER_ID
  ): Promise<void> {
    try {
      const charRef = doc(db, CHARACTERS_COLLECTION, characterId);
      await setDoc(
        charRef,
        {
          physicalBindings: bindings,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    } catch (error) {
      console.error('Error saving physical bindings to Firestore:', error);
      throw error;
    }
  },

  /**
   * Deletes an asset from Firestore and Storage
   */
  async deleteAsset(asset: DroitPhysicalAsset): Promise<void> {
    try {
      // 1. Delete Firestore doc
      const docRef = doc(db, ASSETS_COLLECTION, asset.id);
      await deleteDoc(docRef);

      // 2. Delete from Storage if path exists
      if (asset.storagePath && storage) {
        try {
          const storageRef = ref(storage, asset.storagePath);
          await deleteObject(storageRef);
        } catch (storageErr) {
          console.warn('Could not delete file from Firebase Storage:', storageErr);
        }
      }
    } catch (error) {
      console.error('Error deleting asset:', error);
      throw error;
    }
  },
};
