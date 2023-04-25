import { ClientPK } from "./client";
import { EmployeePK } from "./employee";
import { Name } from "./general";
import { ProductPK } from "./product";
import { StoreProductPK } from "./storeProduct";

export interface IReceiptOutput {
    receiptId: ReceiptPK;
    date: number;
    cost: number;
    tax: number;
    discount: number;
    clientId: null | ClientPK;
    clientName: null | Name;
    employeeId: EmployeePK;
    employeeName: Name;
    sales: ISaleOutput[];
}

export interface ISaleOutput {
    storeProductId: StoreProductPK;
    price: number;
    quantity: number;
    upc: ProductPK;
    productName: string;
    isProm: boolean;
}

export interface IReceiptInput {
    // receipt id is autoincrement
    clientId: null | ClientPK;
    sales: ISaleInput[];
    // required for insertion, but not from the client: filled out automatically by the server
    employeeId?: EmployeePK; // inserting cashier's id, fetched via their bearer token
    date?: number; // insertion timestamp
    discount?: number; // client's current discount
}

export interface ISaleInput {
    storeProductId: StoreProductPK;
    quantity: number;
}

export type ReceiptPK = number;
