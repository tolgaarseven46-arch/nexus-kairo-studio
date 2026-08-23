import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteField,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import {
  DroitExpressionId,
  DroitExpressionAsset,
  DroitAvatarSettings,
} from '../types/nexus';

const CHARACTERS_COLLECTION = 'characters';
const DEFAULT_CHARACTER_ID = 'kairo';

export const EXPRESSION_LIST: {
  id: DroitExpressionId;
  name: string;
  description: string;
  order: number;
}[] = [
  { id: 'NEUTRAL', name: 'NEUTRAL', description: 'Nötr / Standart duruş', order: 1 },
  { id: 'HAPPY', name: 'HAPPY', description: 'Mutlu / Gülümseyen', order: 2 },
  { id: 'PLAYFUL', name: 'PLAYFUL', description: 'Oyuncu / Esprili', order: 3 },
  { id: 'SAD', name: 'SAD', description: 'Üzgün / Durgun', order: 4 },
  { id: 'ANGRY', name: 'ANGRY', description: 'Öfkeli / Ciddi tepki', order: 5 },
  { id: 'SURPRISED', name: 'SURPRISED', description: 'Şaşkın / Beklenmedik', order: 6 },
  { id: 'THINKING', name: 'THINKING', description: 'Düşünceli / Analitik', order: 7 },
  { id: 'CONFUSED', name: 'CONFUSED', description: 'Kafası Karışık / Belirsiz', order: 8 },
];

/**
 * Optimizes an avatar/expression image on client-side using Canvas:
 * 1. Resizes with aspect-ratio preservation to max 256x256 pixels
 * 2. Converts to WebP format (0.7 quality)
 * 3. Returns lightweight Data URL (~10-25 KB) to store safely in Firestore.
 */
function optimizeExpressionImage(
  file: File,
  maxDimension = 256,
  quality = 0.7
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (readerEvent) => {
      const src = readerEvent.target?.result as string;
      if (!src) {
        reject(new Error('Dosya okunamadı.'));
        return;
      }

      const img = new Image();
      img.onload = () => {
        try {
          let width = img.width || maxDimension;
          let height = img.height || maxDimension;

          // Scale proportionally to fit within maxDimension x maxDimension
          if (width > maxDimension || height > maxDimension) {
            if (width >= height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, width);
          canvas.height = Math.max(1, height);

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(src);
            return;
          }

          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, width, height);

          // Try WebP first; fallback to JPEG if WebP not supported
          let dataUrl = canvas.toDataURL('image/webp', quality);
          if (!dataUrl.startsWith('data:image/webp')) {
            dataUrl = canvas.toDataURL('image/jpeg', quality);
          }

          // Safety check: Firestore 1MB document limit guard (~300KB safety limit for single image)
          if (dataUrl.length > 400 * 1024) {
            reject(
              new Error('Optimize edilen görsel boyutu Firestore bellek sınırını aşıyor.')
            );
            return;
          }

          resolve(dataUrl);
        } catch (canvasErr) {
          console.warn('[optimizeExpressionImage] Canvas error, falling back to original:', canvasErr);
          resolve(src);
        }
      };

      img.onerror = () => {
        reject(new Error('Seçilen görsel işlenemedi. Lütfen geçerli bir resim dosyası seçin.'));
      };

      img.src = src;
    };

    reader.onerror = (readErr) => {
      reject(readErr);
    };

    reader.readAsDataURL(file);
  });
}

export const droitExpressionAssetService = {
  /**
   * Loads all 8 expression asset bindings for the character from Firestore
   */
  async loadExpressionAssets(
    characterId: string = DEFAULT_CHARACTER_ID
  ): Promise<Record<DroitExpressionId, DroitExpressionAsset | null>> {
    const defaultRecord: Record<DroitExpressionId, DroitExpressionAsset | null> = {
      NEUTRAL: null,
      HAPPY: null,
      PLAYFUL: null,
      SAD: null,
      ANGRY: null,
      SURPRISED: null,
      THINKING: null,
      CONFUSED: null,
    };

    try {
      const charRef = doc(db, CHARACTERS_COLLECTION, characterId);
      const snap = await getDoc(charRef);

      if (snap.exists()) {
        const data = snap.data();
        const savedExpressions = data?.expressions as Record<string, any> | undefined;

        for (const exp of EXPRESSION_LIST) {
          const raw =
            savedExpressions?.[exp.id] ||
            savedExpressions?.[exp.id.toLowerCase()] ||
            savedExpressions?.[exp.id.toUpperCase()] ||
            (data as any)?.[`expressions.${exp.id}`] ||
            (data as any)?.[`expressions.${exp.id.toLowerCase()}`];

          if (raw) {
            const imageUrl =
              raw.imageDataUrl ||
              raw.downloadURL ||
              raw.downloadUrl ||
              raw.url ||
              raw.src ||
              '';
            const storagePath =
              raw.storagePath || raw.storage_path || raw.path || '';

            if (imageUrl) {
              const formattedName =
                raw.name || exp.name || (exp.id.charAt(0).toUpperCase() + exp.id.slice(1).toLowerCase());

              const avatarSettings: DroitAvatarSettings = {
                zoom: typeof raw.avatarSettings?.zoom === 'number' ? raw.avatarSettings.zoom : 1,
                positionX: typeof raw.avatarSettings?.positionX === 'number' ? raw.avatarSettings.positionX : 0,
                positionY: typeof raw.avatarSettings?.positionY === 'number' ? raw.avatarSettings.positionY : 0,
              };

              defaultRecord[exp.id] = {
                characterId: raw.characterId || characterId,
                expressionId: exp.id,
                name: formattedName,
                storagePath: storagePath,
                downloadURL: imageUrl,
                imageDataUrl: imageUrl,
                avatarSettings: avatarSettings,
                uploaded: raw.uploaded !== undefined ? Boolean(raw.uploaded) : true,
                fileType: raw.fileType || 'image/webp',
                fileSize: raw.fileSize || Math.round((imageUrl.length * 3) / 4),
                updatedAt: raw.updatedAt || new Date().toISOString(),
              };
            }
          }
        }
      }

      console.log('[ExpressionAssetService] Loaded expressions from Firestore:', defaultRecord);
      return defaultRecord;
    } catch (error) {
      console.warn('Error loading expression assets from Firestore:', error);
      return defaultRecord;
    }
  },

  /**
   * Optimizes the expression image to max 256x256 WebP Data URL
   * and saves it directly to Firestore without Firebase Storage dependency.
   */
  async uploadExpressionAsset(params: {
    file: File;
    expressionId: DroitExpressionId;
    characterId?: string;
  }): Promise<DroitExpressionAsset> {
    const characterId = params.characterId || DEFAULT_CHARACTER_ID;
    const expressionId = params.expressionId;

    console.log('[1] OPTIMIZING_EXPRESSION_IMAGE');
    console.log('- expressionId:', expressionId);
    console.log('- original file:', params.file.name, `(${Math.round(params.file.size / 1024)} KB)`);

    // 1. Client-side canvas optimization (max 256x256, webp, quality 0.7)
    const dataUrl = await optimizeExpressionImage(params.file, 256, 0.7);
    const approximateBytes = Math.round((dataUrl.length * 3) / 4);

    console.log('[2] OPTIMIZATION_COMPLETE');
    console.log('- format: WebP (256x256)');
    console.log('- dataUrl length:', dataUrl.length, `(~${Math.round(approximateBytes / 1024)} KB)`);

    // 2. Prepare payload
    const formattedName =
      expressionId.charAt(0).toUpperCase() + expressionId.slice(1).toLowerCase();

    const expressionAssetPayload: DroitExpressionAsset = {
      expressionId: expressionId,
      name: formattedName,
      storagePath: '',
      downloadURL: dataUrl,
      imageDataUrl: dataUrl,
      avatarSettings: {
        zoom: 1,
        positionX: 0,
        positionY: 0,
      },
      uploaded: true,
      fileType: 'image/webp',
      fileSize: approximateBytes,
      updatedAt: new Date().toISOString(),
      characterId: characterId,
    };

    const documentPath = `${CHARACTERS_COLLECTION}/${characterId}`;
    console.log('[3] FIRESTORE_WRITE_START');
    console.log('- document path:', documentPath);
    console.log(`- expressions.${expressionId} saving...`);

    // 3. Save to Firestore under character doc without modifying personality or other expressions
    const charRef = doc(db, CHARACTERS_COLLECTION, characterId);
    await setDoc(
      charRef,
      {
        expressions: {
          [expressionId]: expressionAssetPayload,
        },
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );

    console.log('[4] FIRESTORE_WRITE_SUCCESS');
    return expressionAssetPayload;
  },

  /**
   * Saves ONLY avatarSettings (zoom, positionX, positionY) for an expression
   * without re-uploading the image.
   */
  async saveAvatarSettings(params: {
    expressionId: DroitExpressionId;
    avatarSettings: DroitAvatarSettings;
    characterId?: string;
  }): Promise<void> {
    const characterId = params.characterId || DEFAULT_CHARACTER_ID;
    const expressionId = params.expressionId;

    console.log('[AVATAR_SETTINGS_SAVE_START]', expressionId, params.avatarSettings);
    const charRef = doc(db, CHARACTERS_COLLECTION, characterId);
    await updateDoc(charRef, {
      [`expressions.${expressionId}.avatarSettings`]: params.avatarSettings,
      updatedAt: new Date().toISOString(),
    });
    console.log('[AVATAR_SETTINGS_SAVE_SUCCESS]', expressionId);
  },

  /**
   * Deletes an expression asset from Firestore
   */
  async deleteExpressionAsset(
    expressionId: DroitExpressionId,
    _existingAsset?: DroitExpressionAsset | null,
    characterId: string = DEFAULT_CHARACTER_ID
  ): Promise<void> {
    try {
      // Remove from Firestore
      const charRef = doc(db, CHARACTERS_COLLECTION, characterId);
      await updateDoc(charRef, {
        [`expressions.${expressionId}`]: deleteField(),
        updatedAt: new Date().toISOString(),
      });
      console.log('[FIRESTORE_DELETE_SUCCESS] Expression removed:', expressionId);
    } catch (error) {
      console.error('Error deleting expression asset:', error);
      throw error;
    }
  },
};
