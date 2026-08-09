import * as ImagePicker from 'expo-image-picker';
import type { UploadFile } from './api';

export interface PickedPhoto {
  file: UploadFile;
  name: string;
}

const LIMIT = 10;

// the system photo library. both platforms hand back a file uri, which is
// exactly what the react native FormData wants.
export async function pickPhotos(): Promise<PickedPhoto[]> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: true,
    selectionLimit: LIMIT,
    quality: 0.85,
  });
  if (result.canceled) return [];

  return result.assets.map((asset, i) => {
    const name = asset.fileName ?? `photo-${Date.now()}-${i}.jpg`;
    return {
      file: { uri: asset.uri, name, type: asset.mimeType ?? 'image/jpeg' },
      name,
    };
  });
}
