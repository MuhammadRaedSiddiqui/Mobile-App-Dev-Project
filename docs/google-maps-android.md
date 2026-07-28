# Prototype map configuration

The map screen is rendered with Google Maps JavaScript API inside a WebView. This
works with a no-billing Maps Demo Key, unlike the native Android Maps SDK used by
`react-native-maps`.

Set the demo key in the ignored `.env` file:

```text
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your_demo_key
```

Because `react-native-webview` is a native module, rebuild the Android app after
pulling this change:

```powershell
npx expo run:android
```

For a production map, use a billed, restricted standard key and a production
Google Maps Platform project.
