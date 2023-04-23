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

export type ProductPK = string;
