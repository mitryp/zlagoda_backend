import { Database } from "better-sqlite3";
import { Repository } from "./repository";
import { IPromotionalStoreProductInsert, IPromotionalStoreProductPatch, IStoreProductInput, IStoreProductOutput, StoreProductPK } from "../data_types/storeProduct";
import { QueryStrategy } from "../queryStrategy";
import { sql } from "../dbHelpers";
import { IShort } from "../data_types/general";
import { ProductPK } from "../data_types/product";

const discountQuotient = parseFloat(process.env.DISCOUNT_QUOTIENT);

const STORE_PRODUCT_QUERY_STRATEGY: QueryStrategy = {
    selectStrategy: {
        baseClause: sql`
            SELECT id_store_product, id_store_product_base, Store_Product.UPC, selling_price, products_number, product_name, manufacturer 
            FROM Store_Product
                INNER JOIN Product ON Store_Product.UPC = Product.UPC
            WHERE TRUE`,
        filteringStrategy: {
            primaryKeyFilter: sql`
                AND id_store_product = ?`,
            upcFilter: sql`
                AND Store_Product.UPC = ?`,
            isPromFilter: sql`
                AND promotional_product = ?`,
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

    public async insert(dto: IStoreProductInput): Promise<StoreProductPK> {
        dto.baseStoreProductId = null; // insert is considered to be for a non-promotional product; promotional handling is separated into its own method
        return super.insert(dto);
    }

    // insertAndReturn is automatically correct because it relies on insert

    public async update(pk: StoreProductPK, dto: IStoreProductInput): Promise<StoreProductPK> {
        dto.baseStoreProductId = null; // again, this is considered non-promotional
        const storeProduct = await this.selectByPK(pk);
        if (!storeProduct) return null;
        if (storeProduct.baseStoreProductId !== null) throw Error("CORPORATE_INTEGRITY_CONSTRAINT", { cause: "Спроба оновити акційний товар у магазині неакційним методом" });
        return await super.update(pk, dto);
    }

    public async delete(pk: StoreProductPK): Promise<void> {
        const storeProduct = await this.selectByPK(pk);
        if (!storeProduct) return;
        if (storeProduct.baseStoreProductId !== null) throw Error("CORPORATE_INTEGRITY_CONSTRAINT", { cause: "Спроба видалити акційний товар у магазині неакційним методом" });
    }

    // updateAndReturn also automatically works

    /**
     * Inserts a new promotional store product row (or updates existing one to serve as a newly created promotion).
     */
    public async insertPromotional(basePK: StoreProductPK, dto: IPromotionalStoreProductInsert): Promise<StoreProductPK> {
        let base = await this.selectByPK(basePK);
        if (!base) return null;
        if (base.baseStoreProductId !== null) throw Error("CORPORATE_INTEGRITY_CONSTRAINT", { cause: "Спроба створити акційний товар на базі іншого акційного товару" });
        const storeProductDto: IStoreProductInput = {
            baseStoreProductId: basePK, // if this is invalid, a proper error will be generated upon trying to insert / update the object
            upc: base.upc,
            price: Math.floor(base.price * discountQuotient),
            quantity: dto.quantity,
        };
        let prom = await this.selectPromotionalFor(storeProductDto.upc); // fetch the current promotional product for the product with incoming UPC (if there is one)
        let pk: StoreProductPK;
        if (prom) {
            if (prom.quantity !== 0) throw Error("CORPORATE_INTEGRITY_CONSTRAINT", { cause: "Спроба оголосити нову акцію, коли в попередній ще не закінчилися товари" });
            pk = await super.update(prom.storeProductId, storeProductDto); // since there is at most one promotional product and it cannot be deleted due to integrity limitations, it is updated with new values instead
        } else pk = await super.insert(storeProductDto); // plain old insert
        base.quantity -= dto.quantity; // creating a promotional product is not meant to affect the total quantity of the product in the warehouse, so subtract from base product's
        await this.update(basePK, base); // might create an integrity error if quantity became negative; this is the intended way of handling underflow
        return pk;
    }

    public async insertPromotionalAndReturn(basePK: StoreProductPK, dto: IPromotionalStoreProductInsert): Promise<IStoreProductOutput> {
        const pk = await this.insertPromotional(basePK, dto);
        return this.selectByPK(pk);
    }

    public async patchPromotionalQuantity(basePK: StoreProductPK, dto: IPromotionalStoreProductPatch): Promise<StoreProductPK> {
        let base = await this.selectByPK(basePK);
        if (!base) return null; // a null will be interpreted by the endpoint setup as a 404 NOT FOUND
        let promo = await this.selectPromotionalFor(base.upc);
        if (!promo) return null;
        const delta = promo.quantity - dto.quantity;
        promo.quantity -= delta;
        const pk = await super.update(promo.storeProductId, promo);
        // only update base's quantity if enabled
        if (dto.controlTotalQuantity) {
            base.quantity += delta;
            await this.update(basePK, base);
        }
        return pk;
    }

    public async patchPromotionalQuantityAndReturn(basePK: StoreProductPK, dto: IPromotionalStoreProductPatch): Promise<IStoreProductOutput> {
        const pk = await this.patchPromotionalQuantity(basePK, dto);
        return this.selectByPK(pk);
    }

    public async deletePromotional(basePK: StoreProductPK): Promise<void> {
        let base = await this.selectByPK(basePK);
        if (!base) return;
        const prom = await this.selectPromotionalFor(base.upc);
        if (!prom) return;
        await super.delete(prom.storeProductId);
        base.quantity += prom.quantity; // reclaim the quantity, mirroring behaviour of promotional insert
        await super.update(base.storeProductId, base);
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

    private async selectPromotionalFor(upc: ProductPK) {
        return this.selectFirst([
            { key: "upcFilter", param: upc },
            { key: "isPromFilter", param: 1 },
        ]);
    }
}
