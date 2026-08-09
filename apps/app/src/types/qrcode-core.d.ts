// the qrcode package entry point pulls in node canvas and fs, which metro
// cannot bundle. the matrix generator underneath is plain javascript.
declare module 'qrcode/lib/core/qrcode.js' {
  export function create(
    data: string,
    options?: { errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H' }
  ): { modules: { size: number; data: Uint8Array } };
}
