export interface IProductOutput {
    upc: string;
    productName: string;
    manufacturer: string;
    specs: string;
    categoryId: number;
    categoryName: string; // required for general-purpose viewing
}

export interface IProductInput {
    upc: string;
    productName: string;
    manufacturer: string;
    specs: string;
    categoryId: number;
}

export type ProductPK = string;
