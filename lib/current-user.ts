// Auth is deferred for the MVP core-features push; every record is scoped to
// this single seeded user (see prisma/seed.ts) until real sessions come back.
export const DEFAULT_USER_ID = 'default-user'

export function getCurrentUserId(): string {
  return DEFAULT_USER_ID
}
