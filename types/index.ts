export type ProductBadge = {
  text: string;
  percent?: number | null;
};

export type ProductListItem = {
  name: string;
  key: string;
  items: ProductItem[];
  inputs: ProductInput[];
  badge?: ProductBadge | null;
};

export type ProductItem = {
  name: string;
  sku: string;
  price: string;
  originalPrice: string;
};

export type ProductInput = {
  key: string;
  title: string;
  regex: string;
  type: string;
  placeholder: string;
  options: { label: string; value: string }[];
};

export type OrderState =
  | 'pending'
  | 'completed'
  | 'refunded'
  | 'failed'
  | 'processing'
  | 'confirming';

export type OrderResultCode =
  | 'SUCCESS_DELIVERY_CONFIRMED'
  | 'ERR_UID_NOT_FOUND'
  | 'ERR_ORDER_QUOTA_EXCEEDED'
  | 'ERR_DELIVERY_FAILED'
  | 'ERR_PRODUCT_OUT_OF_AVAILABILITY'
  | 'ERR_REGION_MISMATCH'
  | 'ERR_ACCOUNT_LINKED_NOT_ALLOWED';

export type CreateOrderInput = {
  product_key: string;
  item_sku: string;
  input: {
    uid: string;
    server?: string;
  };
  webhookURL?: string;
};

export type OrderRecord = {
  transactionId: string;
  price: string;
  userId: number;
  state: OrderState;
  result_code?: OrderResultCode;
  input: { uid: string; server?: string };
  productMetadata: {
    id: number;
    name: string;
    key: string;
    price: number;
    itemId: number;
    itemName: string;
    itemSku: string;
  };
  createdAt: string;
  updatedAt: string;
  finishedAt: string;
  user: {
    id: number;
    username: string;
  };
};


