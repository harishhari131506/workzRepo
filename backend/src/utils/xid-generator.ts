import { Xid } from 'xid-ts';

export function generateXid(): string {
  return new Xid().toString();
}

