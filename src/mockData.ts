import { OPEN_READWRITE } from "sqlite3";
import { initDbIfNotExists } from "./model/dataSchema";
import { DbHelpers } from "./model/dbHelpers";
import { CategoryRepository } from "./model/repositories/categoryRepository";
import { ProductRepository } from "./model/repositories/productRepository";
import { EmployeeRepository } from "./model/repositories/employeeRepository";
import { IEmployeeInput } from "./model/data_types/employee";
import { hashPassword } from "./services/auth/auth_utils";

/**
 * Inserts example data into the database.
 */
async function generate(): Promise<void> {
    await initDbIfNotExists();
    const db = await DbHelpers.openDB("Opened db for mock data generation", OPEN_READWRITE);

    const categoryRepo = new CategoryRepository(db);
    const dairyPk = await categoryRepo.insert({ categoryName: "Dairy" });
    const vegetablesPk = await categoryRepo.insert({ categoryName: "Vegetables" });

    const productRepo = new ProductRepository(db);
    await productRepo.insert({
        upc: "523555",
        productName: "Молоко",
        manufacturer: 'ТОВ "Корова"',
        specs: "-1% жиру",
        categoryId: dairyPk,
    });
    await productRepo.insert({
        upc: "123678",
        productName: "Картопля",
        manufacturer: "Ireland and Co.",
        specs: "Сира",
        categoryId: vegetablesPk,
    });

    const employeeRepo = new EmployeeRepository(db);

    await employeeRepo.insert({
        employeeId: "01927830912",
        name: {
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

    await DbHelpers.closeDB(db, "Closed db after mock data generation");
}

generate();
