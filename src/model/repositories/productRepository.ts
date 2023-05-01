import { Database } from "better-sqlite3";
import { FilterParam, Repository } from "./repository";
import { IProductInput, IProductOutput, IPurchasedByAllClientsOutput, ISoldForOutput, ISoldQuantityOutput, ProductPK } from "../data_types/product";
import { QueryStrategy } from "../queryStrategy";
import { sql } from "../dbHelpers";
import { IShort } from "../data_types/general";
import { CategoryPK } from "../data_types/category";

const PRODUCT_QUERY_STRATEGY: QueryStrategy = {
    selectStrategy: {
        baseClause: sql`
            SELECT UPC, Product.category_number, category_name, product_name, manufacturer, characteristics 
            FROM Product
                INNER JOIN Category ON Product.category_number = Category.category_number
            WHERE TRUE`,
        filteringStrategy: {
            primaryKeyFilter: sql`
                AND UPC = ?`,
            categoryIdFilter: sql`
                AND Product.category_number = ?`,
            productNameFilter: sql`
                AND lower(product_name) LIKE '%' || lower(?) || '%'`,
        },
        sortingStrategy: {
            productNameOrder: {
                asc: sql`
                    ORDER BY product_name ASC`,
                desc: sql`
                    ORDER BY product_name DESC`,
            },
        },
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
        SELECT UPC, (product_name || ' ' || manufacturer) AS desc
        FROM Product`,
    // manager requirement 21
    soldQuantityFilteredSelectStrategy: {
        baseClause: sql`
            SELECT COALESCE(SUM(product_number), 0) AS number
            FROM Product
                INNER JOIN Store_Product ON Product.UPC = Store_Product.UPC
                INNER JOIN Sale ON Store_Product.id_store_product = Sale.id_store_product
                INNER JOIN Receipt ON Sale.receipt_number = Receipt.receipt_number
            WHERE TRUE`,
        filteringStrategy: {
            upcFilter: sql`
                AND Product.UPC = ?`, // actually always present
            dateMinFilter: sql`
                AND print_date >= ?`,
            dateMaxFilter: sql`
                AND print_date <= ?`,
        },
        sortingStrategy: {},
    },
    // Novak group by
    soldForQueryStrategy: sql`
        SELECT Product.UPC, product_name, Product.category_number, category_name, SUM(COALESCE(Sale.selling_price * (100 - percent) * Sale.product_number / 100, 0)) AS sold_for
        FROM Product
            INNER JOIN Category ON Product.category_number = Category.category_number
            LEFT OUTER JOIN Store_Product ON Product.UPC = Store_Product.UPC
            LEFT OUTER JOIN Sale ON Store_Product.id_store_product = Sale.id_store_product
            LEFT OUTER JOIN Receipt ON Receipt.receipt_number = Sale.receipt_number
        GROUP BY Product.UPC, product_name, Product.category_number, category_name
        HAVING sold_for >= ?
        ORDER BY sold_for DESC`,
    // Novak division
    purchasedByAllClientsQueryStrategy: sql`
        SELECT UPC, product_name, Product.category_number, category_name
        FROM Product
            INNER JOIN Category ON Product.category_number = Category.category_number
        WHERE EXISTS (
            SELECT *
            FROM Customer_Card
            WHERE lower(cust_surname) LIKE '%' || lower(?) || '%'
        )
        AND NOT EXISTS (
            SELECT *
            FROM Customer_Card
            WHERE lower(cust_surname) LIKE '%' || lower(?) || '%'
            AND card_number NOT IN (
                SELECT card_number
                FROM Receipt
                WHERE card_number IS NOT NULL AND receipt_number IN (
                    SELECT receipt_number
                    FROM Sale
                    WHERE id_store_product IN (
                        SELECT id_store_product
                        FROM Store_Product
                        WHERE UPC = Product.UPC
                    )
                )
            )
        )
        ORDER BY product_name ASC`,
    
    // Popov division
    soldByAllCashiersQueryStrategy: sql`
        SELECT UPC, product_name, category_number, category_name, characteristics
        FROM Product
        INNER JOIN Category ON Product.category_number = Category.category_number
        WHERE UPC in (
            SELECT UPC
            FROM Sale
            INNER JOIN Store_Product ON Store_Product.id_product = Sale.id_product
            INNER JOIN Receipt on Receipt.receipt_number = Sale.receipt_number
            WHERE NOT EXISTS (
                SELECT id_employee
                FROM Receipt
                INNER JOIN Sale ON Sale.receipt_number = Receipt.receipt_number
                WHERE UPC NOT IN (
                SELECT UPC
                FROM Sale
                INNER JOIN Store_Product ON Store_Product.id_product = Sale.id_product
                WHERE Receipt.receipt_number = Sale.receipt_number
                )
            )
        )`
};

export class ProductRepository extends Repository<ProductPK, IProductInput, IProductOutput> {
    constructor(db: Database) {
        super(db, PRODUCT_QUERY_STRATEGY);
    }

    public async soldFor(minTotal: number): Promise<ISoldForOutput[]> {
        const rows = await this.specializedSelect("soldForQueryStrategy", [minTotal]);
        return rows.map((row): ISoldForOutput => {
            return {
                upc: row["UPC"],
                productName: row["product_name"],
                categoryName: row["category_name"],
                soldFor: row["sold_for"],
            };
        });
    }

    public async purchasedByAllClients(clientSurname: string): Promise<IPurchasedByAllClientsOutput[]> {
        const rows = await this.specializedSelect("purchasedByAllClientsQueryStrategy", [clientSurname, clientSurname]);
        return rows.map((row): IPurchasedByAllClientsOutput => {
            return {
                upc: row["UPC"],
                productName: row["product_name"],
                categoryName: row["category_name"],
            };
        });
    }

    public async soldByAllCashiers(): Promise<Object[]> {
        return this.specializedSelect("soldByAllCashiersQueryStrategy");
    }

    public async quantitySold(pk: ProductPK, filters: FilterParam[] = []): Promise<ISoldQuantityOutput> {
        filters.push({ key: "upcFilter", param: pk });
        const row = await this.specializedFilteredSelectFirst("soldQuantityFilteredSelectStrategy", filters);
        return { quantity: row["number"] };
    }

    public async allInShort(): Promise<IShort[]> {
        const rows = await this.specializedSelect("shortSelectQueryStrategy");
        return rows.map((row) => {
            return { primaryKey: row["UPC"], descriptiveAttr: row["desc"] };
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
