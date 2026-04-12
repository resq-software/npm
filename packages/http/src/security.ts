/**
 * Copyright 2026 ResQ
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * @file Security Middleware Utilities
 * @module @resq-sw/http/security
 * @author ResQ
 * @description Framework-agnostic security middleware logic.
 * @compliance NIST 800-53 SC-8 (Transmission Confidentiality), SC-23 (Session Authenticity)
 */

/**
 * Check if a request should be redirected to HTTPS
 */
export function shouldRedirectToHttps(
  protocol: string,
  url: string,
  headers: Record<string, string | undefined>,
  nodeEnv: string = process.env['NODE_ENV'] || 'development'
): string | null {
  // Skip in development/test environments
  if (nodeEnv === 'development' || nodeEnv === 'test') {
    return null;
  }

  // Check for HTTPS via various headers (handles proxies/load balancers)
  const forwardedProto = headers['x-forwarded-proto'];
  const forwardedSsl = headers['x-forwarded-ssl'];
  
  const isSecure =
    forwardedProto === 'https' ||
    forwardedSsl === 'on' ||
    protocol === 'https' ||
    url.startsWith('https://');

  if (!isSecure) {
    const httpsUrl = new URL(url);
    httpsUrl.protocol = 'https:';
    return httpsUrl.toString();
  }

  return null;
}

/**
 * Generate or retrieve a request ID
 */
export function getRequestId(existingId?: string): string {
  return existingId || crypto.randomUUID();
}
