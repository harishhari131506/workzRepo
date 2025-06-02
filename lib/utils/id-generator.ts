
export function generateXid(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substr(2);
  return `${timestamp}${random}`;
}
