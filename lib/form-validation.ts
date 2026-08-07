export const BOARD_OPTIONS = [
  'CBSE',
  'CISCE / ICSE / ISC',
  'State Board',
  'IB',
  'Cambridge / IGCSE',
  'NIOS',
  'Other'
] as const;

const BLOCKED_EMAIL_TLDS = new Set(['cim']);

export function isValidEmailAddress(value: string) {
  const email = value.trim();
  if (!email) return true;
  if (!/^[^\s@]+@[^\s@]+\.[A-Za-z]{2,63}$/.test(email)) return false;
  const domain = email.split('@')[1]?.toLowerCase() || '';
  if (!domain || domain.includes('..')) return false;
  const tld = domain.split('.').pop() || '';
  return !BLOCKED_EMAIL_TLDS.has(tld);
}

export function emailValidationMessage(value: string) {
  return isValidEmailAddress(value)
    ? ''
    : 'Enter a valid email address. Please check the domain carefully (for example, .com rather than .cim).';
}

export function normalisePhoneNumber(value: string) {
  return value.replace(/\D/g, '').slice(0, 13);
}

export function isValidPhoneNumber(value: string) {
  return /^\d{10,13}$/.test(value.trim());
}

export function phoneValidationMessage(value: string) {
  return isValidPhoneNumber(value)
    ? ''
    : 'Enter a phone number containing only 10 to 13 digits.';
}

export function schoolYearValidationMessage(yearXValue: string, yearXiiValue: string) {
  const yearX = yearXValue.trim();
  const yearXii = yearXiiValue.trim();
  if (!yearX && !yearXii) return '';
  if (!yearX || !yearXii) return 'Enter both Class X and Class XII passing years.';
  const x = Number(yearX);
  const xii = Number(yearXii);
  if (!Number.isInteger(x) || !Number.isInteger(xii)) return 'Enter valid passing years.';
  return xii === x + 2
    ? ''
    : 'Class XII passing year must be exactly 2 years after the Class X passing year.';
}

export function isAllowedBoard(value: string) {
  const board = value.trim();
  return !board || BOARD_OPTIONS.includes(board as (typeof BOARD_OPTIONS)[number]);
}
