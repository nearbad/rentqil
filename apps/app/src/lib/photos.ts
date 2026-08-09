import type { UploadFile } from './api';

export interface PickedPhoto {
  file: UploadFile;
  name: string;
}

const ACCEPT = 'image/jpeg,image/png,image/webp';
const LIMIT = 10;

// browser file picker. the native copy of this file opens the photo library.
export function pickPhotos(): Promise<PickedPhoto[]> {
  if (typeof document === 'undefined') return Promise.resolve([]);
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = ACCEPT;
    input.multiple = true;
    input.onchange = () => {
      const files = Array.from(input.files ?? ([] as unknown as FileList)).slice(0, LIMIT);
      resolve(files.map((file) => ({ file, name: file.name })));
    };
    input.oncancel = () => resolve([]);
    input.click();
  });
}
