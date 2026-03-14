// Offline detection and utility functions

export function isOnline(): boolean {
  // Check if we're in browser environment
  if (typeof navigator === 'undefined') {
    return true; // Assume online for SSR
  }
  return navigator.onLine;
}

export const setupOfflineDetection = (callback?: (isOnline: boolean) => void) => {
  // Check if we're in browser environment
  if (typeof window === 'undefined') {
    return () => {}; // Return empty cleanup function for SSR
  }

  const handleOnline = () => {
    console.log('Network connection restored');
    callback?.(true);
  };

  const handleOffline = () => {
    console.log('Network connection lost');
    callback?.(false);
  };

  // Add event listeners
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  // Return cleanup function
  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
};

export async function checkInternetConnection(): Promise<boolean> {
  // Check if we're in browser environment
  if (typeof window === 'undefined' || typeof fetch === 'undefined') {
    return true; // Assume online for SSR
  }
  
  try {
    // Try to fetch a small request to check connectivity
    const response = await fetch('https://httpbin.org/get', {
      method: 'HEAD',
      mode: 'no-cors',
      cache: 'no-cache',
      signal: AbortSignal.timeout(5000), // 5 second timeout
    });
    return true;
  } catch (error) {
    return false;
  }
}

export function waitForConnection(timeoutMs = 30000): Promise<boolean> {
  // Check if we're in browser environment
  if (typeof window === 'undefined') {
    return Promise.resolve(true); // Assume online for SSR
  }
  
  return new Promise((resolve) => {
    if (isOnline()) {
      resolve(true);
      return;
    }

    const timeout = setTimeout(() => {
      cleanup();
      resolve(false);
    }, timeoutMs);

    const cleanup = setupOfflineDetection((isOnline: boolean) => {
      if (isOnline) {
        clearTimeout(timeout);
        resolve(true);
      }
      // Continue waiting for connection if offline
    });
  });
}
