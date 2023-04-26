import { ProductPK } from "./product";

export interface IStoreProductOutput {
    storeProductId: StoreProductPK;
    baseStoreProductId: StoreProductPK | null;
    upc: ProductPK;
    price: number;
    quantity: number;
    // joined for proper display
    productName: string;
    manufacturer: string;
}

export interface IStoreProductInput {
    upc: ProductPK;
    price: number;
    quantity: number;
    // baseStoreProduct is not actually needed in input from frontend, since it is either null for non-promotional products or known from endpoint's route for promotional products
    // so, it is filled out by the backend
    baseStoreProductId?: StoreProductPK | null;
}

/**
 * The server can figure out everything except for the quantity, which is the only really defining property of a promotional store product.
 */
export interface IPromotionalStoreProductInsert {
    quantity: number;
}

/**
 * This has a flag that allows to enable or disable total quantity control.
 * Enabled control is needed for warehouse adjustments, such as adding more products to the already existing discount.
 * Disabled control is needed for, for example, tasks that actually involve fully removing products, like writing off expired ones or ones that were sold.
 */
export interface IPromotionalStoreProductPatch {
    quantity: number;
    controlTotalQuantity: boolean;
}

export type StoreProductPK = number;
