export const DEFAULT_PRODUCT_KEY = "pam";

export type PortalProduct = {
  key: string;
  name: string;
  audience: string | null;
  lifecycleModel: "trial" | "subscription" | "marketplace";
};

export const DEFAULT_PRODUCT: PortalProduct = {
  key: DEFAULT_PRODUCT_KEY,
  name: "PAM",
  audience: "UK landlords",
  lifecycleModel: "trial",
};

export function productLabel(productKey: string | null | undefined): string {
  if (!productKey || productKey === DEFAULT_PRODUCT.key) {
    return DEFAULT_PRODUCT.name;
  }

  return productKey.toUpperCase();
}
