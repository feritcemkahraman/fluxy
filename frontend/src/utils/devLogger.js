// Development logger - only logs in development mode
// Production-safe logging with zero CPU overhead

const isDevelopment = process.env.NODE_ENV === 'development';
const isVerbose = process.env.REACT_APP_VERBOSE_LOGS === 'true';

// Noop functions for production (zero overhead)
const noop = () => {};

export const devLog = {
  // Regular logs (only in development)
  log: isDevelopment ? console.log.bind(console) : noop,
  
  // Errors (always show, critical for debugging)
  error: console.error.bind(console),
  
  // Warnings (always show, important)
  warn: console.warn.bind(console),
  
  // Verbose logs (only if explicitly enabled)
  verbose: (isDevelopment && isVerbose) ? console.log.bind(console) : noop,
  
  // Performance logs (only in development)
  perf: isDevelopment ? console.log.bind(console) : noop,
  
  // Group logs (only in development)
  group: isDevelopment ? console.group.bind(console) : noop,
  groupEnd: isDevelopment ? console.groupEnd.bind(console) : noop,
  
  // Table logs (only in development)
  table: isDevelopment ? console.table.bind(console) : noop
};

// Export as default for convenience
export default devLog;