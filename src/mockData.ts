import * as dotenv from "dotenv";
dotenv.config();
import { initDbIfNotExists } from "./model/dataSchema";
import { DbHelpers } from "./model/dbHelpers";
import { CategoryRepository } from "./model/repositories/categoryRepository";
import { ProductRepository } from "./model/repositories/productRepository";
import { EmployeeRepository } from "./model/repositories/employeeRepository";
import { IEmployeeInput } from "./model/data_types/employee";
import { hashPassword } from "./services/auth/auth_utils";
import { ReceiptRepository } from "./model/repositories/receiptRepository";
import { ClientRepository } from "./model/repositories/clientRepository";
import { StoreProductRepository } from "./model/repositories/storeProductRepository";

/**
 * Inserts example data into the database.
 */
async function generate(): Promise<void> {
    await initDbIfNotExists();
    const db = await DbHelpers.openDB("Opened db for mock data generation", true);
    const categoryRepo = new CategoryRepository(db);
    const productRepo = new ProductRepository(db);
    const storeProductRepo = new StoreProductRepository(db);
    const employeeRepo = new EmployeeRepository(db);
    const clientRepo = new ClientRepository(db);
    const receiptRepo = new ReceiptRepository(db);

    const dairyPk = await categoryRepo.insert({ categoryName: "Молочна продукція" });

    await productRepo.insert({
        upc: "123123123333",
        productName: "Молоко",
        manufacturer: 'ТОВ "Корова"',
        specs: "-1% жиру",
        categoryId: dairyPk,
    });
    await productRepo.insert({
        upc: "333321321321",
        productName: "Морозиво",
        manufacturer: 'ТОВ "Корова"',
        specs: "-7% жиру",
        categoryId: dairyPk,
    });

    const key1 = await storeProductRepo.insert({
        baseStoreProductId: null,
        upc: "123123123333",
        price: 15555,
        quantity: 1515,
    });
    const key2 = await storeProductRepo.insert({
        baseStoreProductId: null,
        upc: "333321321321",
        price: 50555,
        quantity: 300,
    });

    await employeeRepo.insert({
        employeeId: "0192783091",
        employeeName: {
            firstName: "Петро",
            middleName: null,
            lastName: "Петренко",
        },
        position: "cashier",
        salary: 5555,
        workStartDate: 946684800,
        birthDate: 0,
        phone: "+001001101010",
        address: {
            city: "London",
            street: "Street",
            index: "100111001",
        },
        login: "cashier",
        password: await hashPassword("cashier"),
    });

    await clientRepo.insert({
        clientId: "1231231233333",
        clientName: {
            firstName: "Степан",
            middleName: "",
            lastName: "Бандера"
        },
        phone: "+939393393939",
        discount: 15,
        address: {
            city: "Місто",
            street: "Вулиця",
            index: "Індекс"
        }
    });

    await receiptRepo.insert({
        clientId: null,
        employeeId: "0192783091",
        sales: [
            {
                storeProductId: key1,
                quantity: 15,
            },
            {
                storeProductId: key2,
                quantity: 30,
            },
        ],
    });

    await receiptRepo.insert({
        clientId: "1231231233333",
        employeeId: "0192783091",
        sales: [
            {
                storeProductId: key1,
                quantity: 37,
            },
        ],
    });

    await DbHelpers.closeDB(db, "Closed db after mock data generation");
}

generate();
