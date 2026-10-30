/** Returns 91XXXXXXXXXX for a valid Indian mobile number, else null. */
export function normalizeIndianMobile(input: string): string | null {
  let digits = input.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);
  else if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
  if (!/^[6-9]\d{9}$/.test(digits)) return null;
  return `91${digits}`;
}

/** Internal sign-in address for a phone account; never shown publicly. */
export function phoneAuthEmail(mobile: string) {
  return `${mobile}@phone.goodivo.online`;
}
