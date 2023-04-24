import { Database } from "sqlite3";
import { Repository } from "./repository";
import { IStoreProductInput, IStoreProductOutput, StoreProductPK } from "../data_types/storeProduct";
import { QueryStrategy } from "../queryStrategy";
import { sql } from "../dbHelpers";
import { IShort } from "../data_types/general";
import { ProductPK } from "../data_types/product";

const STORE_PRODUCT_QUERY_STRATEGY: QueryStrategy = {
    selectStrategy: {
        baseClause: sql`
            SELECT id_store_product, id_store_product_base, Store_Product.UPC AS UPC, selling_price, products_number, product_name, manufacturer 
            FROM Store_Product INNER JOIN Product ON Store_Product.UPC = Product.UPC
            WHERE TRUE`,
        filteringStrategy: {
            primaryKeyFilter: sql`
                AND id_store_product = ?`,
            upcFilter: sql`
                AND UPC = ?`,
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
            quantityOrder: {
                asc: sql`
                    ORDER BY products_number ASC`,
                desc: sql`
                    ORDER BY products_number DESC`,
            },
        },
        pagination: sql`
            LIMIT ? OFFSET ?`,
    },
    updateStrategy: sql`
        UPDATE Store_Product
        SET id_store_product_base = ?,
            UPC = ?,
            selling_price = ?,
            products_number = ?
        WHERE id_store_product = ?
        RETURNING id_store_product`,
    insertStrategy: sql`
        INSERT INTO Store_Product (id_store_product_base, UPC, selling_price, products_number)
        VALUES (?, ?, ?, ?)
        RETURNING id_store_product`,
    deleteStrategy: sql`
        DELETE FROM Store_Product
        WHERE id_store_product = ?`,

    shortSelectQueryStrategy: sql`
        SELECT id_store_product, (Store_Product.UPC || ' ' || product_name || (CASE promotional_product WHEN TRUE THEN ' Акція' ELSE '' END)) AS desc
        FROM Store_Product JOIN Product ON Store_Product.UPC = Product.UPC`,
};

export class StoreProductRepository extends Repository<StoreProductPK, IStoreProductInput, IStoreProductOutput> {
    constructor(db: Database) {
        super(db, STORE_PRODUCT_QUERY_STRATEGY);
    }

    public async allInShort(): Promise<IShort[]> {
        const rows = await this.specializedSelect("shortSelectQueryStrategy");
        return rows.map((row) => {
            return { primaryKey: row["id_store_product"], descriptiveAttr: row["desc"] };
        });
    }

    protected castToOutput(row: Object): IStoreProductOutput {
        return {
            storeProductId: row["id_store_product"],
            baseStoreProductId: row["id_store_product_base"],
            upc: row["UPC"],
            price: row["selling_price"],
            quantity: row["products_number"],
            productName: row["product_name"],
            manufacturer: row["manufacturer"],
        };
    }

    protected castToParamsArray(dto: IStoreProductInput): [StoreProductPK, ProductPK, number, number] {
        return [dto.baseStoreProductId, dto.upc, dto.price, dto.quantity];
    }
}
