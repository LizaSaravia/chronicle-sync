// Mock chrome API
global.chrome = {
  runtime: {
    onInstalled: {
      addListener: jest.fn(),
    },
  },
};