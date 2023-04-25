import { Database } from "sqlite3";
import { FilterParam, Pagination, StaticRepository } from "./repository";
import { IReceiptInput, IReceiptOutput, ISaleInput, ISaleOutput, ReceiptPK } from "../data_types/receipt";
import { StaticQueryStrategy } from "../queryStrategy";
import { sql } from "../dbHelpers";
import { OrderParam } from "../sqlQueryBuilder";
import { ClientPK } from "../data_types/client";
import { EmployeePK } from "../data_types/employee";
import { ClientRepository } from "./clientRepository";
import { StoreProductRepository } from "./storeProductRepository";

// core crud, which works with base check table and singularly related tables,
// is augmented with additional queries for Sales
const RECEIPT_QUERY_STRATEGY: StaticQueryStrategy = {
    selectStrategy: {
        baseClause: sql`
            SELECT receipt_number, print_date, sum_total, vat, Receipt.card_number, cust_name, cust_patronymic, cust_surname, Receipt.id_employee, empl_name, empl_patronymic, empl_surname
            FROM Receipt
                INNER JOIN Employee ON Receipt.id_employee = Employee.id_employee
                LEFT OUTER JOIN Customer_Card ON Receipt.card_number = Customer_Card.card_number
            WHERE TRUE`,
        filteringStrategy: {
            primaryKeyFilter: sql`
                AND receipt_number = ?`,
            dateMinFilter: sql`
                AND print_date >= ?`,
            dateMaxFilter: sql`
                AND print_date <= ?`,
            employeeIdFilter: sql`
                AND Receipt.id_employee`,
        },
        sortingStrategy: {
            dateOrder: {
                asc: sql`
                    ORDER BY print_date ASC`,
                desc: sql`
                    ORDER BY print_date DESC`,
            },
        },
    },
    insertStrategy: sql`
        INSERT INTO Receipt (print_date, percent, card_number, id_employee)
        VALUES (?, ?, ?, ?)
        RETURNING receipt_number`,
    deleteStrategy: sql`
        DELETE FROM Receipt
        WHERE receipt_number = ?`,

    /**
     * Selects sales for a given receipt.
     */
    salesSelectQueryStrategy: sql`
        SELECT Sale.id_store_product, Sale.selling_price, product_number, Store_Product.UPC, product_name, promotional_product
        FROM Sale
            INNER JOIN Store_Product ON Sale.id_store_product = Store_Product.id_store_product
            INNER JOIN Product ON Product.UPC = Store_Product.UPC
        WHERE receipt_number = ?`,
    saleInsertQueryStrategy: sql`
        INSERT INTO Sale (receipt_number, id_store_product, product_number, selling_price)
        VALUES (?, ?, ?, ?)`,
};

// this repository is a special case in several ways:
// - it manages sales, which are considered an inherent part of a receipt; thus, it must override most inherited CRUD methods
// - it does not allow updating rows, since there is no such operation as "update receipt",
//   and thus extends directly from the root of the repository hierarchy, StaticRepository
export class ReceiptRepository extends StaticRepository<ReceiptPK, IReceiptInput, IReceiptOutput> {
    // repositories are required to fetch some relevant information for insertions
    private storeProductRepo: StoreProductRepository;
    private clientRepo: ClientRepository;

    constructor(db: Database) {
        super(db, RECEIPT_QUERY_STRATEGY);
        this.storeProductRepo = new StoreProductRepository(db);
        this.clientRepo = new ClientRepository(db);
    }

    public async select(filters: FilterParam[] = [], order: OrderParam = null, pagination: Pagination = { limit: 0, offset: 0 }): Promise<{ rows: IReceiptOutput[]; baseLength: number }> {
        let dtos = await super.select(filters, order, pagination);
        dtos.rows = await Promise.all(
            dtos.rows.map(async (row: IReceiptOutput): Promise<IReceiptOutput> => {
                row.sales = await this.selectSales(row.receiptId);
                return row;
            })
        );
        return dtos;
    }

    public async selectFirst(filters: FilterParam[] = []): Promise<IReceiptOutput | null> {
        let dto = await super.selectFirst(filters);
        if (dto) dto.sales = await this.selectSales(dto.receiptId);
        return dto;
    }

    // selectByPK relies on selectFirst, which is properly overloaded

    public async insert(dto: IReceiptInput): Promise<ReceiptPK> {
        dto.date = new Date().getTime() / 1000; // timestamp of insertion is queried from current time; since JavaScript's timestamp is in milliseconds, it is also divided by 1000
        // set discount, either from an attached client card, or 0% if no client card
        dto.discount = 0;
        if (dto.clientId) {
            const client = await this.clientRepo.selectByPK(dto.clientId);
            if (client) dto.discount = client.discount;
        }
        const pk = await super.insert(dto);
        for (const sale of dto.sales) {
            await this.insertSale(pk, sale);
            // update store product remaining quantity
            let storeProduct = await this.storeProductRepo.selectByPK(sale.storeProductId);
            storeProduct.quantity -= sale.quantity; // if this results in a negative number, there will be an attempt to update to it, which will cause a constraint error; this is the intended way of handling the situation, because constraint error will cause the entire transaction to be rolled back and result in an error response
            await this.storeProductRepo.update(sale.storeProductId, storeProduct);
        }
        return pk;
    }

    // insertAndReturn relies on insert and selectByPK and does not require separate overriding

    private async selectSales(pk: ReceiptPK): Promise<ISaleOutput[]> {
        const sales = await this.specializedSelect("salesSelectQueryStrategy", [pk]);
        return sales.map((sale) => {
            return {
                storeProductId: sale["id_store_product"],
                price: sale["selling_price"],
                quantity: sale["product_number"],
                upc: sale["UPC"],
                productName: sale["product_name"],
                isProm: sale["promotional_product"],
            };
        });
    }

    private async insertSale(pk: ReceiptPK, sale: ISaleInput): Promise<void> {
        const price = (await this.storeProductRepo.selectByPK(sale.storeProductId)).price; // fetching price at the moment of insertion
        await this.specializedCommand("saleInsertQueryStrategy", [pk, sale.storeProductId, sale.quantity, price]);
    }

    protected castToOutput(row: Object): IReceiptOutput {
        return {
            receiptId: row["receipt_number"],
            date: row["print_total"],
            cost: row["sum_total"],
            tax: row["vat"],
            discount: row["percent"],
            clientId: row["card_number"],
            clientName: row["card_number"] ? {
                firstName: row["cust_name"],
                middleName: row["cust_patronymic"],
                lastName: row["cust_surname"],
            } : null,
            employeeId: row["id_employee"],
            employeeName: {
                firstName: row["empl_name"],
                middleName: row["empl_patronymic"],
                lastName: row["empl_surname"],
            },
            sales: [], // sales are queried later in the overridden selects
        };
    }

    protected castToParamsArray(dto: IReceiptInput): [number, number, ClientPK, EmployeePK] {
        return [dto.date, dto.discount, dto.clientId, dto.employeeId];
    }
}