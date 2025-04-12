/**
 * Simple logger utility
 */

// Log levels
export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
}

// Convert string to LogLevel
const parseLogLevel = (level: string): LogLevel => {
  switch (level.toLowerCase()) {
    case 'error': return LogLevel.ERROR;
    case 'warn': return LogLevel.WARN;
    case 'info': return LogLevel.INFO;
    case 'debug': return LogLevel.DEBUG;
    default: return LogLevel.INFO;
  }
};

// Get log level from environment or default to INFO
const currentLogLevel = parseLogLevel(process.env.LOG_LEVEL || 'info');

export const logger = {
  error: (message: string, data?: any) => {
    if (currentLogLevel >= LogLevel.ERROR) {
      console.error(`[ERROR] ${new Date().toISOString()} - ${message}`, data || '');
    }
  },
  
  warn: (message: string, data?: any) => {
    if (currentLogLevel >= LogLevel.WARN) {
      console.warn(`[WARN] ${new Date().toISOString()} - ${message}`, data || '');
    }
  },
  
  info: (message: string, data?: any) => {
    if (currentLogLevel >= LogLevel.INFO) {
      console.log(`[INFO] ${new Date().toISOString()} - ${message}`, data || '');
    }
  },
  
  debug: (message: string, data?: any) => {
    if (currentLogLevel >= LogLevel.DEBUG) {
      console.log(`[DEBUG] ${new Date().toISOString()} - ${message}`, data || '');
    }
  }
};
