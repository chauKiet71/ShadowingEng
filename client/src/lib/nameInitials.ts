export function getNameInitials(fullName: string): string {
  const chars = fullName.trim().replace(/\s+/g, '');
  return chars.slice(0, 2).toUpperCase() || '?';
}
