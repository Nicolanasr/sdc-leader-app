/**
 * Central Feature Configuration for Scouts des Cèdres Leader Portal.
 * Modify these flags to instantly enable or hide modules across the application.
 */
export const FEATURES = {
  // Session Planner (Canevas) - /group/dashboard/planner
  sessionPlanner: false,

  // Scout Progression & Badges - /group/dashboard/progression
  scoutProgression: false,

  // Equipment Loans & Activity Folders in /group/dashboard/inventory (Catalog + Jard + Writeoffs remain active)
  equipmentLoans: false,

  // Approval loop between Event Logistics and Central Depot (when false, gear is assigned directly without pending state)
  depotApprovalFlows: false,

  // Camp Daily Meal Planner, Recipes, and Grocery Checklist in Event Workspace
  campMealPlanner: false,

  // Parent permission slip tracking in event participants (fees collection & attendance remain active)
  eventPermissionSlips: false,

  // Scout youth member login portal (when false, system is strictly leader-only)
  scoutMemberLogin: false,
} as const

export type FeatureKey = keyof typeof FEATURES
