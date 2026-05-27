/**
 * Matriz de costos por acción para las desktop apps (TrustInsta + TrustFace).
 * Modelo premium: refleja el valor real de cada acción asumiendo granja real.
 *
 * Server-side ONLY — el client no debe poder modificar estos valores.
 */

export type DesktopApp = "trustinsta" | "trustface";

export type ActionType =
  // Instagram (TrustInsta)
  | "like"
  | "follow"
  | "unfollow"
  | "comment"
  | "story_view"
  | "dm"
  | "visit"
  | "reels_view"
  | "save"
  | "extract_followers"
  // Facebook (TrustFace)
  | "fb_like"
  | "fb_comment"
  | "fb_share"
  | "fb_dm"
  | "fb_friend_request"
  | "fb_friend_accept"
  | "fb_group_join"
  | "fb_group_post"
  | "fb_page_like"
  | "fb_marketplace_post"
  | "fb_marketplace_message";

export const ACTION_COSTS: Record<ActionType, number> = {
  // Instagram — TrustInsta
  like: 0.01,
  follow: 0.05,
  unfollow: 0.01,
  comment: 0.10,
  story_view: 0.005,
  dm: 0.20,
  visit: 0.005,
  reels_view: 0.005,
  save: 0.02,
  extract_followers: 0.0001, // por seguidor extraído
  // Facebook — TrustFace
  fb_like: 0.01,
  fb_comment: 0.10,
  fb_share: 0.10,
  fb_dm: 0.20,
  fb_friend_request: 0.05,
  fb_friend_accept: 0.05,
  fb_group_join: 0.10,
  fb_group_post: 0.50,
  fb_page_like: 0.02,
  fb_marketplace_post: 0.50,
  fb_marketplace_message: 0.20,
};

/**
 * Devuelve costo total para una cantidad de acciones de cierto tipo.
 */
export function calculateCost(action: ActionType, count: number): number {
  const unit = ACTION_COSTS[action];
  if (unit === undefined) throw new Error(`Unknown action type: ${action}`);
  if (count < 0 || !Number.isFinite(count)) throw new Error(`Invalid count: ${count}`);
  return Math.round(unit * count * 10000) / 10000; // 4 decimales precisión
}

export function isValidAction(action: string): action is ActionType {
  return action in ACTION_COSTS;
}
