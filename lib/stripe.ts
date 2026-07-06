import "server-only";

const STRIPE_BASE = "https://api.stripe.com/v1";
const TIMEOUT_MS = 12000;

export type StripeGrowthMetrics = {
  source: "stripe";
  activeSubscriptions: number | null;
  customers: number | null;
  mrr: number | null;
  currency: string | null;
};

export function hasStripeConfig(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

async function stripeGet(path: string): Promise<unknown | null> {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(`${STRIPE_BASE}${path}`, {
      signal: controller.signal,
      headers: {
        authorization: `Bearer ${key}`,
      },
    });

    if (!response.ok) return null;
    return response.json().catch(() => null);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

type StripeList<T> = {
  data?: T[];
  has_more?: boolean;
};

type StripeSubscription = {
  id: string;
  currency?: string;
  items?: {
    data?: {
      quantity?: number;
      price?: {
        unit_amount?: number | null;
        recurring?: { interval?: string | null } | null;
      } | null;
    }[];
  };
};

function monthlyAmount(subscription: StripeSubscription): number {
  return (
    subscription.items?.data?.reduce((total, item) => {
      const amount = item.price?.unit_amount ?? 0;
      const quantity = item.quantity ?? 1;
      const interval = item.price?.recurring?.interval;
      const monthlyMultiplier = interval === "year" ? 1 / 12 : interval === "week" ? 52 / 12 : 1;
      return total + amount * quantity * monthlyMultiplier;
    }, 0) ?? 0
  );
}

export async function getStripeGrowthMetrics(): Promise<StripeGrowthMetrics> {
  if (!hasStripeConfig()) {
    return {
      source: "stripe",
      activeSubscriptions: null,
      customers: null,
      mrr: null,
      currency: null,
    };
  }

  let activeSubscriptions = 0;
  let mrr = 0;
  let currency: string | null = null;
  let startingAfter: string | null = null;

  for (let page = 0; page < 10; page += 1) {
    const query = new URLSearchParams({
      status: "active",
      limit: "100",
      expand: "data.items.data.price",
    });
    if (startingAfter) query.set("starting_after", startingAfter);

    const body = (await stripeGet(`/subscriptions?${query.toString()}`)) as StripeList<StripeSubscription> | null;
    const subscriptions = body?.data ?? [];

    activeSubscriptions += subscriptions.length;
    for (const subscription of subscriptions) {
      currency ??= subscription.currency ?? null;
      mrr += monthlyAmount(subscription);
    }

    if (!body?.has_more || subscriptions.length === 0) break;
    startingAfter = subscriptions[subscriptions.length - 1]?.id ?? null;
    if (!startingAfter) break;
  }

  const customersBody = (await stripeGet("/customers?limit=1")) as StripeList<{ id: string }> | null;

  return {
    source: "stripe",
    activeSubscriptions,
    customers: customersBody?.has_more || customersBody?.data?.length ? null : customersBody?.data?.length ?? null,
    mrr: Math.round(mrr),
    currency,
  };
}

export function formatStripeMoney(amountInMinorUnits: number | null, currency: string | null): string {
  if (amountInMinorUnits === null) return "—";

  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: currency?.toUpperCase() ?? "GBP",
    maximumFractionDigits: 0,
  }).format(amountInMinorUnits / 100);
}
