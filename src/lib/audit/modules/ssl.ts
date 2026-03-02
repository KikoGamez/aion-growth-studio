import * as tls from 'node:tls';
import type { SSLResult } from '../types';

export async function runSSL(url: string): Promise<SSLResult> {
  let hostname: string;
  try {
    const parsed = new URL(url);
    hostname = parsed.hostname;
    if (parsed.protocol !== 'https:') {
      return { valid: false, error: 'Not using HTTPS' };
    }
  } catch {
    return { valid: false, error: 'Invalid URL' };
  }

  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      socket.destroy();
      resolve({ valid: false, error: 'Connection timeout' });
    }, 8000);

    const socket = tls.connect(
      {
        host: hostname,
        port: 443,
        servername: hostname,
        rejectUnauthorized: false,
      },
      () => {
        clearTimeout(timer);
        try {
          const cert = socket.getPeerCertificate();
          const protocol = socket.getProtocol() || undefined;
          const authorized = socket.authorized;
          socket.destroy();

          if (!cert || !cert.valid_to) {
            resolve({ valid: authorized, protocol });
            return;
          }

          const expiresAt = cert.valid_to;
          const expiryDate = new Date(expiresAt);
          const daysUntilExpiry = Math.floor(
            (expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
          );
          const issuer =
            ((cert.issuer as any)?.O || (cert.issuer as any)?.CN || 'Unknown')
              .toString()
              .slice(0, 80);

          resolve({
            valid: daysUntilExpiry > 0 && authorized,
            issuer,
            expiresAt,
            daysUntilExpiry,
            protocol,
          });
        } catch (err: any) {
          resolve({ valid: false, error: err.message?.slice(0, 100) });
        }
      },
    );

    socket.on('error', (err) => {
      clearTimeout(timer);
      socket.destroy();
      resolve({ valid: false, error: err.message?.slice(0, 100) });
    });
  });
}
