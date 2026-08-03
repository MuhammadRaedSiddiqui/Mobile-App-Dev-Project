// Mock for @react-navigation/native
export const NavigationContainer = ({ children }: { children: React.ReactNode }) => children;

export const useNavigation = () => ({
  navigate: jest.fn(),
  goBack: jest.fn(),
  replace: jest.fn(),
  push: jest.fn(),
  pop: jest.fn(),
  reset: jest.fn(),
  setParams: jest.fn(),
  dispatch: jest.fn(),
  isFocused: jest.fn(() => true),
  canGoBack: jest.fn(() => false),
  addListener: jest.fn(),
  removeListener: jest.fn(),
});

export const useRoute = () => ({
  key: 'test-route',
  name: 'Test',
  params: {},
});

export const useFocusEffect = (callback: () => void) => {
  callback();
};

export const useIsFocused = () => true;
