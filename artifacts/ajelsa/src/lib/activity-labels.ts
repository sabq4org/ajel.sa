/**
 * Activity labels — re-export from `@workspace/shared/activity-labels`.
 *
 * Kept as a thin module so existing `@/lib/activity-labels` imports across
 * the admin UI keep working unchanged. New code can import directly from
 * `@workspace/shared`.
 */
export {
  ACTIVITY_LABELS_AR,
  type ActivityAction,
} from "@workspace/shared/activity-labels";
