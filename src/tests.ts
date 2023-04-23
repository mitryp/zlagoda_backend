import { Database, OPEN_READWRITE } from "sqlite3";
import { DbHelpers } from "./model/dbHelpers";
import { CategoryRepository } from "./model/repositories/categoryRepository";
import { EmployeeRepository } from "./model/repositories/employeeRepository";
import { hashPassword } from "./services/auth/auth_utils";
import { IEmployeeInput, IUser } from "./model/data_types/employee";
import { initDbIfNotExists } from "./model/dataSchema";
import * as fs from "fs";

async function testCategories(db: Database): Promise<void> {
    // create categories repository
    // db should be in READWRITE mode to use modifying queries
    const repo = new CategoryRepository(db);

    // insert new category
    await repo.insert({ categoryName: "Dairy" });
    await repo.insert({ categoryName: "Vegetables" });

    // select all categories
    console.log("after insertion:", await repo.select());

    // search for a category name
    const category = await repo.selectFirst([{ key: "nameFilter", param: "Dairy" }]);
    console.log("found category", category);

    await repo.update(category.categoryNumber, { categoryName: "Not Dairy Anymore" });
    console.log("after updating:", await repo.select());

    // delete the inserted category
    await repo.delete(category.categoryNumber);
    console.log("after deletion", await repo.select());
}

async function testProducts(db: Database): Promise<void> {}

async function testStoreProducts(db: Database): Promise<void> {}

async function testEmployees(db: Database): Promise<void> {
    const repo = new EmployeeRepository(db);

    let cashier: IEmployeeInput = {
        employeeId: "myid",
        name: {
            firstName: "Петро",
            middleName: null,
            lastName: "Петренко",
        },
        position: "cashier",
        salary: 555,
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
    };
    await repo.insert(cashier);

    // select all employees
    console.log("after insertion:", await repo.select());

    // search for an employee surname
    const employee = await repo.selectFirst([{ key: "surnameFilter", param: "енко" }]);
    console.log("found employee", employee);

    // console.log("validating passwords");
    // console.log("valid password:", await validateCredentials("cashier", "cashier"));
    // console.log("invalid password to valid login:", await validateCredentials("cashier", "not cashier"));
    // console.log("invalid login:", await validateCredentials("someone else", "cashier"));

    cashier.name.firstName = "Іван";
    await repo.update("myid", cashier);
    console.log("after updating:", await repo.select());

    console.log("cashier's user:", await repo.selectUser("cashier"));

    // delete the inserted employee
    await repo.delete("myid");
    console.log("after deletion:", await repo.select());
}

async function testCustomerCards(db: Database): Promise<void> {}

async function testReceipts(db: Database): Promise<void> {}

async function testAll() {
    process.env.DB_PATH = "./testData.sqlite";
    await initDbIfNotExists();
    const db: Database = await DbHelpers.openDB("", OPEN_READWRITE);
    try {
        await testCategories(db);
        await testProducts(db);
        await testStoreProducts(db);
        await testEmployees(db);
        await testCustomerCards(db);
        await testReceipts(db);
    } catch (err) {
        console.error(err);
    }
    await DbHelpers.closeDB(db);
    fs.unlinkSync(process.env.DB_PATH);
}

testAll();
