import { useEffect } from 'react';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';

// hold the splash until the brand faces are in memory, otherwise the first
// frame paints in the system font and every screen visibly reflows
void SplashScreen.preventAutoHideAsync();

export function useAppFonts(): boolean {
  const [loaded, error] = useFonts({
    Inter_400Regular: require('../../assets/fonts/Inter_400Regular.ttf'),
    Inter_500Medium: require('../../assets/fonts/Inter_500Medium.ttf'),
    Inter_600SemiBold: require('../../assets/fonts/Inter_600SemiBold.ttf'),
    Inter_700Bold: require('../../assets/fonts/Inter_700Bold.ttf'),
    Inter_800ExtraBold: require('../../assets/fonts/Inter_800ExtraBold.ttf'),
    Raleway_700Bold: require('../../assets/fonts/Raleway_700Bold.ttf'),
    Raleway_800ExtraBold: require('../../assets/fonts/Raleway_800ExtraBold.ttf'),
  });

  // a broken font file must not leave the user staring at the splash
  const ready = loaded || error !== null;

  useEffect(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);

  return ready;
}
