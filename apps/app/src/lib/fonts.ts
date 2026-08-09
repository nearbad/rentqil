// the web pulls Inter and Raleway from a stylesheet link in the root layout,
// so there is nothing to wait for. the native copy of this file loads the
// bundled ttf files instead.
export function useAppFonts(): boolean {
  return true;
}
