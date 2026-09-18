/**
 * Utilities for validating and resolving document download URLs
 * for QR code generation and mobile device access.
 */

// Disallowed internal placeholder strings or static template identifiers
const FORBIDDEN_STATIC_IDENTIFIERS = new Set([
  'custom_pdf',
  'exam_timetable',
  'academic_calendar',
  'placement_drive',
  'conference_banner',
  'mech_auto_expo_banner',
  'custom_info',
  'custom_upload',
  'null',
  'undefined',
  '[object object]',
]);

// Patterns of fake, sample, or dummy URLs that lead to 404 Not Found
const FAKE_OR_SAMPLE_PATTERNS = [
  /nbkrist\.org\/circulars/i,
  /nbkrist\.org\/exams/i,
  /nbkrist\.org\/academic-calendar/i,
  /nbkrist\.org\/placements/i,
  /nbkrist\.org\/adhyayan/i,
  /nbkrist\.org\/mech-expo/i,
  /nbkrist\.org\/ece/i,
  /nbkrist\.org\/(downloads|files|docs|portal)\//i,
  /example\.com/i,
  /example\.org/i,
  /\$\{Date\.now\(\)\}/i,
  /date\.now\(\)/i,
];

/**
 * Validates whether a given URL string is a genuine, reachable public download/web URL.
 * Strictly rejects:
 * - Local file paths (file://, C:\, /path)
 * - Localhost or private IP loopbacks (localhost, 127.0.0.1, 0.0.0.0)
 * - Blob URLs (blob:...)
 * - Temporary browser object URLs or data URLs (data:...)
 * - Filename-only strings (e.g., 'circular.pdf')
 * - Static/sample internal identifiers
 * - Fake or sample URLs on non-existent paths (e.g. nbkrist.org/circulars/..., example.com)
 */
export function isValidPublicDocumentUrl(url?: string | null): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (!trimmed) return false;

  const lower = trimmed.toLowerCase();

  // Reject local schemes and temporary browser representations
  if (
    lower.startsWith('blob:') ||
    lower.startsWith('data:') ||
    lower.startsWith('file:') ||
    lower.startsWith('/') ||
    lower.startsWith('./') ||
    lower.startsWith('../')
  ) {
    return false;
  }

  // Reject localhost and loopback networks
  if (/^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?(\/|$)/i.test(trimmed)) {
    return false;
  }

  // Reject static internal sample keys
  if (FORBIDDEN_STATIC_IDENTIFIERS.has(lower)) {
    return false;
  }

  // Reject filename only (e.g. "document.pdf", "notice.docx")
  if (/^[a-zA-Z0-9_-]+\.[a-zA-Z0-9]{2,4}$/.test(trimmed)) {
    return false;
  }

  // Reject fake, sample, or dummy URLs that produce 404
  for (const pattern of FAKE_OR_SAMPLE_PATTERNS) {
    if (pattern.test(trimmed)) {
      return false;
    }
  }

  // Must begin with standard HTTP or HTTPS
  if (!lower.startsWith('http://') && !lower.startsWith('https://')) {
    return false;
  }

  // Validate URL syntax and verify it points to a real domain with top-level or sub-domain
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return false;
    }
    if (!parsed.hostname || !parsed.hostname.includes('.')) {
      return false;
    }
    // Reject localhost domain names like *.localhost
    if (parsed.hostname.endsWith('.localhost')) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Resolves the genuine, scannable public document/PDF download URL for a notice.
 * Prioritizes:
 * 1. notice.pdfUrl (explicit Firebase Storage or public PDF download URL)
 * 2. notice.url (when notice.url is a valid public HTTP/HTTPS URL)
 * 3. notice.qrCodeData (when qrCodeData is a valid public HTTP/HTTPS URL)
 * 
 * For PDF notices: If no genuine, reachable public download URL is present,
 * returns null so the UI can render the unavailable/unlinked state instead of
 * generating a misleading 404 QR code.
 */
export function resolveNoticeDocumentUrl(notice?: {
  pdfUrl?: string;
  url?: string;
  qrCodeData?: string;
  type?: string;
} | null): string | null {
  if (!notice) return null;

  // For PDF notices: strictly require a valid public download URL
  if (notice.type === 'pdf') {
    // 1. Check explicit pdfUrl
    if (isValidPublicDocumentUrl(notice.pdfUrl)) {
      return notice.pdfUrl!.trim();
    }

    // 2. Check notice.url
    if (isValidPublicDocumentUrl(notice.url)) {
      return notice.url!.trim();
    }

    // 3. Check notice.qrCodeData
    if (isValidPublicDocumentUrl(notice.qrCodeData)) {
      return notice.qrCodeData!.trim();
    }

    // Existing PDF notice has no valid public download URL -> return null (unavailable state)
    return null;
  }

  // For non-PDF notices (e.g. image notices with an actual destination link)
  if (isValidPublicDocumentUrl(notice.qrCodeData)) {
    return notice.qrCodeData!.trim();
  }

  if (isValidPublicDocumentUrl(notice.url)) {
    return notice.url!.trim();
  }

  return null;
}
