import { Fils } from '../../common/types/money';
import { Grams } from '../../common/types/weight';

export interface CartItem {
  id: string;
  variantId: string;
  storeId: string;
  weightGrams?: Grams;
  quantity?: number;
  prepOptionId?: string;
  addedAt: string;
}

export interface PricedCartItem extends CartItem {
  estimatedPriceFils: Fils;
}

export interface CartView {
  cartId: string;
  items: PricedCartItem[];
  subtotalFils: Fils;
}
