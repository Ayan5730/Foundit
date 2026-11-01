import { API_VERSION, CATEGORIES, EVENT, LIMITS, LOCATIONS, type Bootstrap } from "../../shared/api.ts";

export type Identity = { userId: string; displayName: string };
export function isStaff(user: Identity | null, configuredIds: string | undefined): boolean {
  return Boolean(user && configuredIds?.split(",").map(id=>id.trim()).filter(Boolean).includes(user.userId));
}
export function makeBootstrap(user: Identity | null, staffIds?: string): Bootstrap {
  return {
    api_version: API_VERSION, event: EVENT,
    user: user ? { id:user.userId, display_name:user.displayName } : null,
    capabilities: { can_report:Boolean(user), can_review:isStaff(user,staffIds) },
    choices: { categories:CATEGORIES, locations:LOCATIONS }, limits:LIMITS,
    recovery_organizations:[{id:"rapid_metro",name:"Rapid Metro"}],
  };
}
