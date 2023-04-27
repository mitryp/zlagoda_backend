import { CategoryPK } from "./category";

export interface IProductOutput {
    upc: ProductPK;
    productName: string;
    manufacturer: string;
    specs: string;
    categoryId: CategoryPK;
    // joined for proper display
    categoryName: string;
}

export interface IProductInput {
    upc: ProductPK;
    productName: string;
    manufacturer: string;
    specs: string;
    categoryId: CategoryPK;
}

export interface ISoldQuantityOutput {
    quantity: number;
}

// Novak grouping
export interface ISoldForOutput {
    upc: ProductPK;
    productName: string;
    categoryName: string;
    soldFor: number;
}
// Novak division
export interface IPurchasedByAllClientsOutput {
    upc: ProductPK;
    productName: string;
    categoryName: string;
}

export type ProductPK = string;
