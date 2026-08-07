import { parsePhoneNumberFromString, type CountryCode } from 'libphonenumber-js';

export const BOARD_OPTIONS = [
  'CBSE',
  'CISCE / ICSE / ISC',
  'State Board',
  'IB',
  'Cambridge / IGCSE',
  'NIOS',
  'Other'
] as const;

export const PHONE_COUNTRIES = [
  { code: 'IN', callingCode: '+91', label: 'India (+91)' },
  { code: 'SG', callingCode: '+65', label: 'Singapore (+65)' },
  { code: 'US', callingCode: '+1', label: 'United States (+1)' },
  { code: 'CA', callingCode: '+1', label: 'Canada (+1)' },
  { code: 'GB', callingCode: '+44', label: 'United Kingdom (+44)' },
  { code: 'AU', callingCode: '+61', label: 'Australia (+61)' },
  { code: 'AE', callingCode: '+971', label: 'UAE (+971)' },
  { code: 'NZ', callingCode: '+64', label: 'New Zealand (+64)' },
  { code: 'MY', callingCode: '+60', label: 'Malaysia (+60)' }
] as const;

const BLOCKED_EMAIL_TLDS = new Set(['cim', 'con', 'cmo', 'comm', 'vom']);

export function isValidEmailAddress(value: string) {
  const email = value.trim();
  if (!email) return true;
  if (email.length > 254 || email.includes('..')) return false;
  const at = email.lastIndexOf('@');
  if (at <= 0 || at === email.length - 1) return false;
  const local = email.slice(0, at);
  const domain = email.slice(at + 1).toLowerCase();
  if (local.length > 64 || local.startsWith('.') || local.endsWith('.')) return false;
  if (!/^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+$/.test(local)) return false;
  if (!/^[a-z0-9.-]+$/.test(domain) || domain.length > 253 || !domain.includes('.')) return false;
  const labels = domain.split('.');
  if (labels.some((label) => !label || label.length > 63 || label.startsWith('-') || label.endsWith('-'))) return false;
  const tld = labels.at(-1) || '';
  if (!/^[a-z]{2,63}$/.test(tld) || BLOCKED_EMAIL_TLDS.has(tld)) return false;
  return true;
}

export function emailValidationMessage(value: string) {
  return isValidEmailAddress(value)
    ? ''
    : 'Enter a valid email address and domain. Check the @ sign, domain spelling and suffix (for example .com, not .cim).';
}

export function normalisePhoneNumber(value: string) {
  return value.replace(/\D/g, '').slice(0, 15);
}

export function isValidPhoneNumber(value: string, country: string = 'IN') {
  const national = normalisePhoneNumber(value);
  if (!national) return false;
  try {
    const parsed = parsePhoneNumberFromString(national, country as CountryCode);
    return Boolean(parsed?.isValid());
  } catch {
    return false;
  }
}

export function phoneValidationMessage(value: string, country: string = 'IN') {
  if (isValidPhoneNumber(value, country)) return '';
  const selected = PHONE_COUNTRIES.find((item) => item.code === country);
  const example = country === 'SG'
    ? 'Singapore numbers must contain 8 national digits.'
    : country === 'IN'
      ? 'India mobile numbers must contain a valid 10-digit national number.'
      : 'Enter a valid national number for the selected country code.';
  return `${example}${selected ? ` Selected: ${selected.label}.` : ''}`;
}

export function formatInternationalPhone(value: string, country: string = 'IN') {
  const national = normalisePhoneNumber(value);
  try {
    const parsed = parsePhoneNumberFromString(national, country as CountryCode);
    return parsed?.isValid() ? parsed.number : '';
  } catch {
    return '';
  }
}

export function splitInternationalPhone(value: string | null | undefined) {
  if (!value) return { country: 'IN', national: '' };
  try {
    const parsed = parsePhoneNumberFromString(value);
    if (parsed?.country) return { country: parsed.country, national: parsed.nationalNumber };
  } catch {
    // Fall back for historical records without a country code.
  }
  return { country: 'IN', national: normalisePhoneNumber(value) };
}

export function schoolYearValidationMessage(yearXValue: string, yearXiiValue: string) {
  const yearX = yearXValue.trim();
  const yearXii = yearXiiValue.trim();
  if (!yearX && !yearXii) return '';
  if (!yearX || !yearXii) return 'Enter both Class X and Class XII passing years.';
  const x = Number(yearX);
  const xii = Number(yearXii);
  if (!Number.isInteger(x) || !Number.isInteger(xii)) return 'Enter valid passing years.';
  if (xii <= x) return 'Class XII passing year must be later than Class X.';
  return xii === x + 2
    ? ''
    : 'Class XII passing year must be exactly 2 years after the Class X passing year.';
}

export function isAllowedBoard(value: string) {
  const board = value.trim();
  return !board || BOARD_OPTIONS.includes(board as (typeof BOARD_OPTIONS)[number]);
}
