// Mock for Expo modules
export const launchCameraAsync = jest.fn();
export const launchImageLibraryAsync = jest.fn();
export const requestCameraPermissionsAsync = jest.fn(() =>
  Promise.resolve({ status: 'granted', granted: true })
);
export const requestMediaLibraryPermissionsAsync = jest.fn(() =>
  Promise.resolve({ status: 'granted', granted: true })
);

export const MediaTypeOptions = {
  All: 'All',
  Videos: 'Videos',
  Images: 'Images',
};
