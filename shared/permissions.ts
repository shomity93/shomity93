export type CooperativeRole = "admin" | "moderator" | "member";
export type CooperativeAction = "view" | "create" | "edit" | "delete" | "manageSettings" | "manageMembers";

const permissions: Record<CooperativeRole, readonly CooperativeAction[]> = {
  admin: ["view", "create", "edit", "delete", "manageSettings", "manageMembers"],
  moderator: ["view", "create", "edit"],
  member: ["view"],
};

export function can(role: CooperativeRole, action: CooperativeAction) {
  return permissions[role].includes(action);
}

export const roleLabels: Record<CooperativeRole, string> = {
  admin: "প্রশাসক",
  moderator: "পরিচালক",
  member: "সদস্য",
};
