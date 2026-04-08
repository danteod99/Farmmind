// BulkFollows API client — same SMM Panel API standard as JAP
const BULKFOLLOWS_API_URL = "https://bulkfollows.com/api/v2";

function getApiKey() {
  return process.env.BULKFOLLOWS_API_KEY || "";
}

export interface BFService {
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

export interface BFOrder {
  order: number;
  charge: string;
  start_count: string;
  status: string;
  remains: string;
  currency: string;
}

async function bfRequest(params: Record<string, string | number>) {
  const body = new URLSearchParams({
    key: getApiKey(),
    ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])),
  });

  const res = await fetch(BULKFOLLOWS_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  return res.json();
}

export async function getBFServices(): Promise<BFService[]> {
  return bfRequest({ action: "services" });
}

export async function getBFBalance(): Promise<{ balance: string; currency: string }> {
  return bfRequest({ action: "balance" });
}

export async function addBFOrder(params: {
  service: number;
  link: string;
  quantity: number;
}): Promise<{ order: number; error?: string }> {
  return bfRequest({
    action: "add",
    service: params.service,
    link: params.link,
    quantity: params.quantity,
  });
}

export async function getBFOrderStatus(orderId: number): Promise<BFOrder> {
  return bfRequest({ action: "status", order: orderId });
}
