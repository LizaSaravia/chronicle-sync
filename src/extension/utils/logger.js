const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
};

class Logger {
  constructor(module) {
    this.module = module;
    this.logLevel = LOG_LEVELS.INFO; // Default log level
  }

  setLogLevel(level) {
    if (level in LOG_LEVELS) {
      this.logLevel = LOG_LEVELS[level];
    }
  }

  formatMessage(level, message, data = {}) {
    const timestamp = new Date().toISOString();
    return {
      timestamp,
      level,
      module: this.module,
      message,
      data,
    };
  }

  async persistLog(logEntry) {
    try {
      // Get existing logs
      const result = await chrome.storage.local.get("debug_logs");
      const logs = result.debug_logs || [];

      // Add new log, keeping only last 1000 entries
      logs.push(logEntry);
      if (logs.length > 1000) {
        logs.shift();
      }

      // Save back to storage
      await chrome.storage.local.set({ debug_logs: logs });
    } catch (error) {
      console.error("Failed to persist log:", error);
    }
  }

  log(level, message, data = {}) {
    if (LOG_LEVELS[level] >= this.logLevel) {
      const logEntry = this.formatMessage(level, message, data);

      // Format for console
      const consoleMessage = `[${logEntry.timestamp}] [${level}] [${this.module}] ${message}`;

      // Log to console with appropriate level
      switch (level) {
        case "DEBUG":
          console.debug(consoleMessage, data);
          break;
        case "INFO":
          console.info(consoleMessage, data);
          break;
        case "WARN":
          console.warn(consoleMessage, data);
          break;
        case "ERROR":
          console.error(consoleMessage, data);
          break;
      }

      // Persist log entry
      this.persistLog(logEntry);

      return logEntry;
    }
  }

  debug(message, data = {}) {
    return this.log("DEBUG", message, data);
  }

  info(message, data = {}) {
    return this.log("INFO", message, data);
  }

  warn(message, data = {}) {
    return this.log("WARN", message, data);
  }

  error(message, data = {}) {
    return this.log("ERROR", message, data);
  }

  static async getLogs() {
    try {
      const result = await chrome.storage.local.get("debug_logs");
      return result.debug_logs || [];
    } catch (error) {
      console.error("Failed to get logs:", error);
      return [];
    }
  }

  static async clearLogs() {
    try {
      await chrome.storage.local.remove("debug_logs");
    } catch (error) {
      console.error("Failed to clear logs:", error);
    }
  }
}

export { Logger, LOG_LEVELS };
