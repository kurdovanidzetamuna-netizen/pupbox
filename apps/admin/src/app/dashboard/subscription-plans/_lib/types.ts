export type PlanItem = { productId: string; name: string; price: number; qty: number };
export type BoxConfig = { items: PlanItem[] };
export type GiftBox = { id: string; label: string; description: string; items: PlanItem[] };
