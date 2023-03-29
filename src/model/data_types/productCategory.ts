import {Model} from "./model";

export class ProductCategory extends Model {
    public readonly categoryNumber: number;
    public readonly categoryName: string;

    constructor(values: [number, string]) {
        super(values);
        [this.categoryNumber, this.categoryName] = values;
    }

    primaryKey(): unknown {
        return this.categoryNumber;
    }

    insertValues(): unknown[] {
        return [this.categoryName];
    }
}