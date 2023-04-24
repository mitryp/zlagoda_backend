/**
 * Sinсe category number is autoincrement, it is not part of the interface for objects that are being inserted.
 */
export interface ICategoryInput {
    categoryName: string;
}

export interface ICategoryOutput {
    categoryId: CategoryPK;
    categoryName: string;
}

export type CategoryPK = number;
