// src/__mocks__/contentfulAppSDK.mock.js

export const mockSdk = {
  app: {
    setReady: jest.fn(),
    getParameters: jest.fn().mockResolvedValue({}), // Default to resolve with empty object
    notifier: {
      success: jest.fn(),
      error: jest.fn(),
      info: jest.fn(),
    },
    getCurrentState: jest.fn().mockResolvedValue(null), // Or some default state
  },
  space: {
    getEntries: jest.fn().mockResolvedValue({ items: [], total: 0, skip: 0, limit: 100 }),
    createEntry: jest.fn().mockImplementation((contentType, data) => Promise.resolve({
      sys: { id: `mockEntryId-${Date.now()}`, contentType: { sys: { id: contentType } } },
      fields: data.fields,
      // Add other relevant sys properties if needed by components
    })),
    getEntry: jest.fn().mockResolvedValue({}),
    // Add other space methods if used, e.g., updateEntry, deleteEntry
  },
  ids: {
    space: 'mockSpaceId',
    environment: 'mockEnvironmentId',
    user: 'mockUserId',
    app: 'mockAppId',
    defaultLocale: 'en-US', // Default mock locale
  },
  locales: {
    default: 'en-US',
    available: ['en-US', 'de-DE'], // Example available locales
  },
  location: {
    is: jest.fn(locationType => locationType === 'app-config'), // Default or make configurable
    onIsVisible: jest.fn(),
    onNavigate: jest.fn(),
    // Add other location properties/methods if used
  },
  user: {
    firstName: 'MockUser',
    lastName: 'Test',
    email: 'mockuser@example.com',
    sys: { id: 'mockUserId' },
  },
  // Add other top-level SDK parts if your components use them, e.g., dialogs, navigator
  parameters: {
    instance: {},
    installation: {},
  },
  window: {
    startAutoResizer: jest.fn(),
    stopAutoResizer: jest.fn(),
  },
  // Utility to reset all mock functions in the SDK mock
  reset: function() {
    this.app.setReady.mockClear();
    this.app.getParameters.mockClear().mockResolvedValue({});
    this.app.notifier.success.mockClear();
    this.app.notifier.error.mockClear();
    this.app.notifier.info.mockClear();
    this.app.getCurrentState.mockClear().mockResolvedValue(null);

    this.space.getEntries.mockClear().mockResolvedValue({ items: [], total: 0, skip: 0, limit: 100 });
    this.space.createEntry.mockClear().mockImplementation((contentType, data) => Promise.resolve({
      sys: { id: `mockEntryId-${Date.now()}`, contentType: { sys: { id: contentType } } },
      fields: data.fields,
    }));
    this.space.getEntry.mockClear().mockResolvedValue({});

    this.location.is.mockClear().mockImplementation(locationType => locationType === 'app-config');
    this.location.onIsVisible.mockClear();
    this.location.onNavigate.mockClear();

    this.window.startAutoResizer.mockClear();
    this.window.stopAutoResizer.mockClear();
  }
};

// To be used in tests:
// import { mockSdk } from '../__mocks__/contentfulAppSDK.mock';
// jest.mock('@contentful/app-sdk', () => ({
//   __esModule: true,
//   useSDK: () => mockSdk,
//   SDKProvider: ({ children }) => children, // Simple pass-through for provider
// }));
//
// Before each test or in a beforeEach: mockSdk.reset();
// To customize behavior for a test: mockSdk.space.getEntries.mockResolvedValueOnce(...);
// To assert calls: expect(mockSdk.app.notifier.success).toHaveBeenCalledWith(...);
