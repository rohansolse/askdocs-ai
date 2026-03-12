const { performance } = require('perf_hooks');

const formatDuration = (durationMs) => {
  if (durationMs >= 1000) {
    return `${(durationMs / 1000).toFixed(2)}s`;
  }

  return `${durationMs.toFixed(1)}ms`;
};

const formatMetadataValue = (value) => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  if (Array.isArray(value)) {
    return value.join(',');
  }

  return String(value).replace(/\s+/g, '_');
};

const formatMetadata = (metadata = {}) => {
  const entries = Object.entries(metadata)
    .map(([key, value]) => {
      const normalizedValue = formatMetadataValue(value);
      return normalizedValue === null ? null : `${key}=${normalizedValue}`;
    })
    .filter(Boolean);

  return entries.length ? ` ${entries.join(' ')}` : '';
};

const logTiming = (step, durationMs, metadata = {}) => {
  console.info(`[timing] ${step} duration=${formatDuration(durationMs)}${formatMetadata(metadata)}`);
};

const measureAsync = async (step, operation, metadata = {}) => {
  const start = performance.now();

  try {
    return await operation();
  } finally {
    logTiming(step, performance.now() - start, metadata);
  }
};

const measureSync = (step, operation, metadata = {}) => {
  const start = performance.now();

  try {
    return operation();
  } finally {
    logTiming(step, performance.now() - start, metadata);
  }
};

const yieldToEventLoop = () => new Promise((resolve) => setImmediate(resolve));

module.exports = {
  logTiming,
  measureAsync,
  measureSync,
  yieldToEventLoop
};
