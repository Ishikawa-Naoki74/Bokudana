import { ConfigContext, ExpoConfig } from 'expo/config';

const APP_VARIANT = process.env.APP_VARIANT ?? 'development';
const IS_DEV = APP_VARIANT === 'development';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: IS_DEV ? 'Bokudana (Dev)' : 'Bokudana',
  slug: 'bokudana',
  ios: {
    ...config.ios,
    bundleIdentifier: IS_DEV
      ? 'com.bokudana.app.dev'
      : 'com.bokudana.app',
  },
  android: {
    ...config.android,
    package: IS_DEV
      ? 'com.bokudana.app.dev'
      : 'com.bokudana.app',
  },
  scheme: 'bokudana',
  plugins: [
    'expo-router',
    'expo-font',
  ],
  extra: {
    appVariant: APP_VARIANT,
  },
});
