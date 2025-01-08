import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { Logger, LOG_LEVELS } from '../../src/extension/utils/logger';

describe('Logger', () => {
  let logger;
  let mockStorage;
  let consoleSpy;

  beforeEach(() => {
    // Mock chrome.storage.local
    mockStorage = {
      debug_logs: []
    };

    global.chrome = {
      storage: {
        local: {
          get: vi.fn().mockImplementation((key) => Promise.resolve({ [key]: mockStorage[key] })),
          set: vi.fn().mockImplementation((obj) => {
            Object.assign(mockStorage, obj);
            return Promise.resolve();
          }),
          remove: vi.fn().mockImplementation((key) => {
            delete mockStorage[key];
            return Promise.resolve();
          })
        }
      }
    };

    // Create logger instance
    logger = new Logger('TestModule');

    // Spy on console methods
    consoleSpy = {
      debug: vi.spyOn(console, 'debug').mockImplementation(() => {}),
      info: vi.spyOn(console, 'info').mockImplementation(() => {}),
      warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
      error: vi.spyOn(console, 'error').mockImplementation(() => {})
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should create a logger with default log level', () => {
    expect(logger.module).toBe('TestModule');
    expect(logger.logLevel).toBe(LOG_LEVELS.INFO);
  });

  it('should set log level correctly', () => {
    logger.setLogLevel('DEBUG');
    expect(logger.logLevel).toBe(LOG_LEVELS.DEBUG);
  });

  it('should format message correctly', () => {
    const message = 'Test message';
    const data = { foo: 'bar' };
    const formatted = logger.formatMessage('INFO', message, data);

    expect(formatted).toEqual({
      timestamp: expect.any(String),
      level: 'INFO',
      module: 'TestModule',
      message: message,
      data: data
    });
  });

  it('should log messages at different levels', async () => {
    const testCases = [
      { method: 'debug', level: 'DEBUG', console: consoleSpy.debug },
      { method: 'info', level: 'INFO', console: consoleSpy.info },
      { method: 'warn', level: 'WARN', console: consoleSpy.warn },
      { method: 'error', level: 'ERROR', console: consoleSpy.error }
    ];

    // Set to DEBUG to test all levels
    logger.setLogLevel('DEBUG');

    for (const { method, level, console } of testCases) {
      const message = `Test ${level} message`;
      const data = { level };

      const logEntry = await logger[method](message, data);

      // Verify log entry format
      expect(logEntry).toEqual({
        timestamp: expect.any(String),
        level: level,
        module: 'TestModule',
        message: message,
        data: data
      });

      // Verify console output
      expect(console).toHaveBeenCalledWith(
        expect.stringContaining(`[${level}] [TestModule] ${message}`),
        data
      );

      // Verify storage
      expect(chrome.storage.local.set).toHaveBeenCalled();
    }
  });

  it('should respect log level thresholds', async () => {
    logger.setLogLevel('WARN');

    // Debug and Info should not log
    await logger.debug('Debug message');
    await logger.info('Info message');
    expect(consoleSpy.debug).not.toHaveBeenCalled();
    expect(consoleSpy.info).not.toHaveBeenCalled();

    // Warn and Error should log
    await logger.warn('Warn message');
    await logger.error('Error message');
    expect(consoleSpy.warn).toHaveBeenCalled();
    expect(consoleSpy.error).toHaveBeenCalled();
  });

  it('should maintain max 1000 log entries', async () => {
    logger.setLogLevel('DEBUG');

    // Add 1001 log entries
    for (let i = 0; i < 1001; i++) {
      await logger.debug(`Log entry ${i}`);
    }

    const logs = await Logger.getLogs();
    expect(logs.length).toBe(1000);
    // First log should be entry 1, not 0
    expect(logs[0].message).toBe('Log entry 1');
  });

  it('should clear logs', async () => {
    // Add some logs
    await logger.info('Test log');
    expect(mockStorage.debug_logs.length).toBe(1);

    // Clear logs
    await Logger.clearLogs();
    expect(chrome.storage.local.remove).toHaveBeenCalledWith('debug_logs');
    
    const logs = await Logger.getLogs();
    expect(logs.length).toBe(0);
  });
});