import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider } from 'react-redux';
import { store } from '@/store';
import { RootNavigator } from '@/navigation/RootNavigator';
import { logEnvironmentValidation } from '@/utils/validateEnv';

// Validate environment configuration on app startup
logEnvironmentValidation();

export default function App() {
  return (
    <Provider store={store}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <RootNavigator />
      </SafeAreaProvider>
    </Provider>
  );
}
