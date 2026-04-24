/**
 * Detects the user's browser and OS from the User Agent string.
 * Returns an object with browser name, os name, and a generated device name.
 */
export function getDeviceInfo() {
  const ua = navigator.userAgent;

  // Detect browser
  let browser = 'Unknown Browser';
  if (ua.includes('Firefox')) {
    browser = 'Firefox';
  } else if (ua.includes('Edg/')) {
    browser = 'Edge';
  } else if (ua.includes('Chrome') && !ua.includes('Edg/')) {
    browser = 'Chrome';
  } else if (ua.includes('Safari') && !ua.includes('Chrome')) {
    browser = 'Safari';
  } else if (ua.includes('Opera') || ua.includes('OPR')) {
    browser = 'Opera';
  }

  // Detect OS
  let os = 'Unknown OS';
  if (ua.includes('Windows')) {
    os = 'Windows';
  } else if (ua.includes('Mac OS X') || ua.includes('Macintosh')) {
    os = 'macOS';
  } else if (ua.includes('Linux') && !ua.includes('Android')) {
    os = 'Linux';
  } else if (ua.includes('Android')) {
    os = 'Android';
  } else if (ua.includes('iPhone') || ua.includes('iPad')) {
    os = 'iOS';
  } else if (ua.includes('CrOS')) {
    os = 'ChromeOS';
  }

  // Generate a human-friendly device name
  const deviceName = `${os} · ${browser}`;

  return { browser, os, deviceName };
}

/**
 * Returns an icon/emoji for the detected OS
 */
export function getOsIcon(os) {
  const icons = {
    'Windows': '💻',
    'macOS': '🍎',
    'Linux': '🐧',
    'Android': '📱',
    'iOS': '📱',
    'ChromeOS': '💻',
  };
  return icons[os] || '🖥️';
}

/**
 * Returns an icon/emoji for the detected browser
 */
export function getBrowserIcon(browser) {
  const icons = {
    'Chrome': '🌐',
    'Firefox': '🦊',
    'Safari': '🧭',
    'Edge': '🔷',
    'Opera': '⭕',
  };
  return icons[browser] || '🌐';
}
