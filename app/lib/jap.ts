// JustAnotherPanel API client
const JAP_API_URL = "https://justanotherpanel.com/api/v2";

function getApiKey() {
  return process.env.JAP_API_KEY || "";
}

export interface JAPService {
  service: number;
  name: string;
  type: string;
  category: string;
  rate: string;
  min: string;
  max: string;
  description?: string;
  dripfeed?: boolean;
  refill?: boolean;
  cancel?: boolean;
}

export interface JAPOrder {
  order: number;
  charge: string;
  start_count: string;
  status: string;
  remains: string;
  currency: string;
}

export interface JAPBalance {
  balance: string;
  currency: string;
}

async function japRequest(params: Record<string, string | number>) {
  const body = new URLSearchParams({
    key: getApiKey(),
    ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])),
  });

  const res = await fetch(JAP_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  return res.json();
}

export async function getServices(): Promise<JAPService[]> {
  return japRequest({ action: "services" });
}

export async function getBalance(): Promise<JAPBalance> {
  return japRequest({ action: "balance" });
}

export async function addOrder(params: {
  service: number;
  link: string;
  quantity: number;
}): Promise<{ order: number; error?: string }> {
  return japRequest({
    action: "add",
    service: params.service,
    link: params.link,
    quantity: params.quantity,
  });
}

export async function getOrderStatus(orderId: number): Promise<JAPOrder> {
  return japRequest({ action: "status", order: orderId });
}

export async function getMultipleOrders(orderIds: number[]): Promise<Record<string, JAPOrder>> {
  return japRequest({ action: "status", orders: orderIds.join(",") });
}
