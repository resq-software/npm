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
 * Encodes every character in a string as a decimal HTML character reference.
 *
 * @param {string} str The string to encode.
 * @returns {string} The string with every character replaced by its HTML decimal entity.
 * @throws {TypeError} If the provided value is not a string.
 * @see https://developer.mozilla.org/en-US/docs/Glossary/Entity
 * @see https://dev.w3.org/html5/html-author/charref
 */
const toEntities = (str: string): string =>
  str
    .split('')
    .map((c) => `&#${c.codePointAt(0)};`)
    .join('');

/**
 * Obfuscates and encodes a contact hyperlink (such as mailto or tel) as HTML entities.
 *
 * @param {Object} opts Configuration options for link obfuscation.
 * @param {'mailto'|'tel'|string} opts.scheme The URI scheme (e.g., 'mailto', 'tel', or custom).
 * @param {string} opts.address The contact address (email or phone number).
 * @param {Record<string, string>} [opts.params] Optional query parameters (used for mailto links).
 * @param {string} [opts.text] Optional visible link text. Defaults to address.
 * @returns {{ encodedHref: string, encodedText: string }} Object containing the obfuscated/encoded href and visible text.
 * @throws {TypeError} If required fields are missing or invalid.
 * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/a#security_and_privacy
 * @see https://github.com/resq-software/resQ
 * @example
 * ```ts
 * const { encodedHref, encodedText } = obfuscateLink({
 *   scheme: 'mailto',
 *   address: 'jane.doe@example.com',
 *   text: 'Contact Jane'
 * });
 * ```
 */
export const obfuscateLink = (opts: {
  scheme: 'mailto' | 'tel';
  address: string;
  params?: Record<string, string>;
  text?: string;
}) => {
  const { scheme, address, params, text } = opts;

  let uri = `${scheme}:${address}`;

  if (params && Object.keys(params).length) {
    const qs = Object.entries(params)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join('&');
    uri += `?${qs}`;
  }

  const href = uri;
  const encodedText = toEntities(text ?? address);

  return { href, encodedText };
};
