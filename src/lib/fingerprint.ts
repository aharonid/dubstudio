/**
 * Simple browser fingerprinting for anti-abuse
 * Generates a hash based on browser characteristics
 */

export async function generateFingerprint(): Promise<string> {
  const components: string[] = [];
  const navigatorWithMemory = navigator as Navigator & { deviceMemory?: number };

  // Screen resolution
  components.push(`${window.screen.width}x${window.screen.height}`);
  components.push(`${window.screen.colorDepth}`);

  // Timezone
  components.push(Intl.DateTimeFormat().resolvedOptions().timeZone);

  // Language
  components.push(navigator.language);

  // Platform
  components.push(navigator.platform);

  // Hardware concurrency (CPU cores)
  components.push(String(navigator.hardwareConcurrency || 'unknown'));

  // Device memory (if available)
  if (navigatorWithMemory.deviceMemory) {
    components.push(String(navigatorWithMemory.deviceMemory));
  }

  // Canvas fingerprint
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = '#f60';
      ctx.fillRect(125, 1, 62, 20);
      ctx.fillStyle = '#069';
      ctx.fillText('DubStudio', 2, 15);
      ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
      ctx.fillText('DubStudio', 4, 17);
      const canvasData = canvas.toDataURL();
      components.push(canvasData.slice(-50)); // Last 50 chars
    }
  } catch {
    components.push('canvas-error');
  }

  // WebGL fingerprint
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl');
    if (gl) {
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      if (debugInfo) {
        components.push(gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL));
        components.push(gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL));
      }
    }
  } catch {
    components.push('webgl-error');
  }

  // Combine all components
  const fingerprint = components.join('|');

  // Simple hash function
  return await simpleHash(fingerprint);
}

async function simpleHash(str: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function getClientIP(): Promise<string | null> {
  try {
    // Use a public IP API to get the client's real IP
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    return data.ip;
  } catch (e) {
    console.error('Failed to get client IP:', e);
    return null;
  }
}
