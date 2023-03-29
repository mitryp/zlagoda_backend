import {Database} from "sqlite3";
import {Repository} from "./repository";
import {ProductCategory} from "../data_types/productCategory";
import {QueryStrategy} from "../queryStrategy";

const productCategoryQueryStrategy: QueryStrategy = {
    selectStrategy: {
        baseClause:
            'SELECT category_number, category_name ' +
            'FROM Category',
        filteringStrategy: {
            filteringClause:
                'WHERE category_name = ?',
        },
        singleRowFilterClause:
            'WHERE category_id = ?',
        sortingClause:
            'ORDER BY category_name ASC'
    },
    updateStrategy:
        'UPDATE Category SET category_name = ? ' +
        'WHERE category_number = ?',
    insertStrategy:
        'INSERT INTO Category (category_name) ' +
        'VALUES (?)',
    deleteStrategy:
        'DELETE FROM Category ' +
        'WHERE category_number = ?'
};

export class ProductCategoryRepository extends Repository<ProductCategory> {
    constructor(db: Database) {
        super(db, productCategoryQueryStrategy);
    }

    protected castToModel(row: unknown[]): ProductCategory {
        return new ProductCategory(Object.values(row) as [number, string]);
    }
}