import { Database } from "sqlite3";
import { Repository } from "./repository";
import { IProductInput, IProductOutput, ProductPK } from "../data_types/product";
import { QueryStrategy } from "../queryStrategy";
import { sql } from "../dbHelpers";
import { IShort } from "../data_types/general";
import { CategoryPK } from "../data_types/category";

const PRODUCT_QUERY_STRATEGY: QueryStrategy = {
    selectStrategy: {
        baseClause: sql`
            SELECT UPC, Product.category_number, category_name, product_name, manufacturer, characteristics 
            FROM Product INNER JOIN Category ON Product.category_number = Category.category_number
            WHERE TRUE`,
        filteringStrategy: {
            primaryKeyFilter: sql`
                AND UPC = ?`,
            categoryIdFilter: sql`
                AND Product.category_number = ?`,
            productNameFilter: sql`
                AND product_name LIKE '%' || ? || '%'`,
        },
        sortingStrategy: {
            productNameOrder: {
                asc: sql`
                    ORDER BY product_name ASC`,
                desc: sql`
                    ORDER BY product_name DESC`,
            },
        },
        pagination: sql`
            LIMIT ? OFFSET ?`,
    },
    updateStrategy: sql`
        UPDATE Product
        SET UPC = ?,
            category_number = ?,
            product_name = ?,
            manufacturer = ?,
            characteristics = ?
        WHERE UPC = ?
        RETURNING UPC`,
    insertStrategy: sql`
        INSERT INTO Product (UPC, category_number, product_name, manufacturer, characteristics)
        VALUES (?, ?, ?, ?, ?)
        RETURNING UPC`,
    deleteStrategy: sql`
        DELETE FROM Product
        WHERE UPC = ?`,

    shortSelectQueryStrategy: sql`
        SELECT UPC, product_name
        FROM Product`,
};

export class ProductRepository extends Repository<ProductPK, IProductInput, IProductOutput> {
    constructor(db: Database) {
        super(db, PRODUCT_QUERY_STRATEGY);
    }

    public async allInShort(): Promise<IShort[]> {
        const rows = await this.specializedSelect("shortSelectQueryStrategy");
        return rows.map((row) => {
            return { primaryKey: row["UPC"], descriptiveAttr: row["product_name"] };
        });
    }

    protected castToOutput(row: Object): IProductOutput {
        return {
            upc: row["UPC"],
            productName: row["product_name"],
            manufacturer: row["manufacturer"],
            specs: row["characteristics"],
            categoryId: row["category_number"],
            categoryName: row["category_name"],
        };
    }

    protected castToParamsArray(dto: IProductInput): [ProductPK, CategoryPK, string, string, string] {
        return [dto.upc, dto.categoryId, dto.productName, dto.manufacturer, dto.specs];
    }
}
