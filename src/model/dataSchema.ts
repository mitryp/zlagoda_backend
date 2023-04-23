import { OPEN_CREATE, OPEN_READWRITE } from "sqlite3";
import * as fs from "fs";
import * as dotenv from "dotenv";

import { DbHelpers, sql } from "./dbHelpers";
import { IEmployeeInput } from "./data_types/employee";
import { hashPassword } from "../services/auth/auth_utils";
import { EmployeeRepository } from "./repositories/employeeRepository";

dotenv.config();

async function generateDb(): Promise<void> {
    console.log("Generating database schema");
    const db = await DbHelpers.openDB("Open database connection", OPEN_READWRITE | OPEN_CREATE);

    // Category
    let query = sql`
        CREATE TABLE IF NOT EXISTS Category (
            category_number INTEGER PRIMARY KEY,
            category_name TEXT UNIQUE NOT NULL CHECK (LENGTH(category_name) <= 50)
        )
    `; // category_name is made UNIQUE because users should be able to deterministically identify a category from its name, as the number is internal to the database and not shown
    await DbHelpers.run(db, query, "Create table Category");

    // Product
    query = sql`
        CREATE TABLE IF NOT EXISTS Product (
            UPC TEXT PRIMARY KEY CHECK (LENGTH(UPC) <= 12),
            category_number INTEGER NOT NULL,
            product_name TEXT NOT NULL CHECK (LENGTH(product_name) <= 50),
            manufacturer TEXT NOT NULL CHECK (LENGTH(manufacturer) <= 50),
            characteristics TEXT NOT NULL CHECK (LENGTH(characteristics) <= 100),
            FOREIGN KEY (category_number)
                REFERENCES Category (category_number)
                ON UPDATE CASCADE
                ON DELETE RESTRICT
        ) WITHOUT ROWID
    `;
    await DbHelpers.run(db, query, "Create table Product");

    // Store_Product
    query = sql`
        CREATE TABLE IF NOT EXISTS Store_Product (
            id_store_product INTEGER PRIMARY KEY,
            id_store_product_base INTEGER,
            UPC TEXT NOT NULL,
            selling_price INTEGER NOT NULL CHECK (selling_price BETWEEN 0 AND 99999999999),
            products_number INTEGER NOT NULL CHECK (products_number >= 0),
            promotional_product BOOLEAN NOT NULL GENERATED ALWAYS
                AS (id_store_product_base IS NOT NULL) STORED,
            FOREIGN KEY (id_store_product_base)
                REFERENCES Store_Product (id_store_product)
                ON UPDATE CASCADE
                ON DELETE CASCADE,
            FOREIGN KEY (UPC)
                REFERENCES Product (UPC)
                ON UPDATE CASCADE
                ON DELETE RESTRICT
        )
    `;
    await DbHelpers.run(db, query, "Create table Store_Product");

    // empl_fullname TEXT NOT NULL GENERATED ALWAYS
    // AS (empl_surname || ' ' || empl_name || CASE WHEN empl_patronymic IS NOT NULL THEN ' ' || empl_patronymic ELSE '' END) STORED,

    // Employee
    query = sql`
        CREATE TABLE IF NOT EXISTS Employee (
            id_employee TEXT PRIMARY KEY CHECK (LENGTH(id_employee) <= 10),
            empl_surname TEXT NOT NULL CHECK (LENGTH(empl_surname) <= 50),
            empl_name TEXT NOT NULL CHECK (LENGTH(empl_name) <= 50),
            empl_patronymic TEXT CHECK (LENGTH(empl_patronymic) <= 50),
            empl_role TEXT NOT NULL CHECK (empl_role IN ('cashier', 'manager')),
            salary INTEGER NOT NULL CHECK (salary BETWEEN 0 AND 99999999999),
            date_of_birth INTEGER NOT NULL,
            date_of_start INTEGER NOT NULL,
            phone_number TEXT NOT NULL CHECK (LENGTH(phone_number) <= 13),
            city TEXT NOT NULL CHECK (LENGTH(city) <= 50),
            street TEXT NOT NULL CHECK (LENGTH(street) <= 50),
            zip_code TEXT NOT NULL CHECK (LENGTH(zip_code) <= 9),
            login TEXT UNIQUE CHECK(LENGTH(login) <= 15),
            password_hash TEXT CHECK (LENGTH(password_hash) <= 60),
            CHECK (
                date(date_of_start, 'unixepoch') >= date(date_of_birth, 'unixepoch', '+18 years')
            )
        ) WITHOUT ROWID
    `;
    await DbHelpers.run(db, query, "Create table Employee");

    // Customer_Card
    query = sql`
        CREATE TABLE IF NOT EXISTS Customer_Card (
            card_number TEXT PRIMARY KEY CHECK (LENGTH(card_number) <= 10),
            cust_surname TEXT NOT NULL CHECK (LENGTH(cust_surname) <= 50),
            cust_name NOT NULL CHECK (LENGTH(cust_name) <= 50),
            cust_patronymic TEXT CHECK (LENGTH(cust_patronymic) <= 50),
            phone_number TEXT NOT NULL CHECK (LENGTH(phone_number) <= 13),
            city TEXT CHECK (LENGTH(city) <= 50),
            street TEXT CHECK (LENGTH(street) <= 50),
            zip_code TEXT CHECK (LENGTH(zip_code) <= 9),
            percent INTEGER NOT NULL CHECK (percent >= 0),
            CHECK (
                (city IS NULL AND street IS NULL AND zip_code IS NULL)
                OR (city IS NOT NULL AND street IS NOT NULL AND zip_code IS NOT NULL)
            )
        ) WITHOUT ROWID
    `;
    await DbHelpers.run(db, query, "Create table Customer_Card");

    // Receipt (renamed from Check because Check causes a syntax error in SQLite)
    query = sql`
        CREATE TABLE IF NOT EXISTS Receipt (
            receipt_number TEXT PRIMARY KEY CHECK (LENGTH(receipt_number) <= 10),
            id_employee TEXT NOT NULL,
            card_number TEXT,
            print_date INTEGER NOT NULL,
            FOREIGN KEY (id_employee)
                REFERENCES Employee (id_employee)
                ON UPDATE CASCADE
                ON DELETE RESTRICT,
            FOREIGN KEY (card_number)
                REFERENCES Customer_Card (card_number)
                ON UPDATE CASCADE
                ON DELETE RESTRICT
        ) WITHOUT ROWID
    `;
    await DbHelpers.run(db, query, "Create table Receipt");

    // Sale
    query = sql`
        CREATE TABLE IF NOT EXISTS Sale (
            id_store_product INTEGER,
            receipt_number TEXT,
            product_number INTEGER NOT NULL,
            selling_price INTEGER NOT NULL CHECK (selling_price BETWEEN 0 AND 99999999999),
            PRIMARY KEY (id_store_product, receipt_number),
            FOREIGN KEY (id_store_product)
                REFERENCES Store_Product (id_store_product)
                ON UPDATE CASCADE
                ON DELETE RESTRICT,
            FOREIGN KEY (receipt_number)
                REFERENCES Receipt (receipt_number)
                ON UPDATE CASCADE
                ON DELETE CASCADE
        ) WITHOUT ROWID
    `;
    await DbHelpers.run(db, query, "Create table Sale");

    // a placeholder default account for initial setup of the system, after which it is heavily encouraged to either delete this manager or configure proper values
    // this is similar to the approach taken with default admin credentials on routers
    let defaultManager: IEmployeeInput = {
        employeeId: "0000000000",
        name: {
            firstName: "admin",
            middleName: null,
            lastName: "admin",
        },
        position: "manager",
        salary: 0,
        workStartDate: 946684800, // start of 2000, so that this "manager" does not violate work start age constraints
        birthDate: 0, // start of 1970
        phone: "+000000000000",
        address: {
            city: "none",
            street: "none",
            index: "000000000",
        },
        login: "admin",
        password: await hashPassword("admin"),
    };
    const employeeRepo: EmployeeRepository = new EmployeeRepository(db);
    await employeeRepo.insert(defaultManager);

    await DbHelpers.closeDB(db, "Close database connection");
    console.log("Finish generating database schema");
}

export async function initDbIfNotExists(): Promise<void> {
    try {
        const exists: boolean = fs.existsSync(process.env.DB_PATH);
        if (!exists) return generateDb();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
