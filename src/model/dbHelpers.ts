import * as sqlite from "better-sqlite3";
import { strictEqual } from "assert";

/**
 * Class encapsulating common functionality for accessing the database.
 */
export class DbHelpers {
    /**
     * Establishes a new database connection, logging success or failure.
     * @param {string} successMsg - Message to log in console on success.
     * @param {boolean} write - Whether to open only for reading, or writing too.
     * @returns {Promise<sqlite.Database>} Promise that resolves with the newly established connection.
     */
    static async openDB(successMsg: string = "Establish database connection", write: boolean = false): Promise<sqlite.Database> {
        try {
            const db = new sqlite(process.env.DB_PATH, { readonly: !write });
            db.prepare("PRAGMA foreign_keys = ON").run();
            // register custom lower function to add case support for unicode (particularly cyrillic), because sqlite does not provide that by default
            db.function("lower", (str: string) => { return str.toLocaleLowerCase(); });
            console.log(successMsg);
            return db;
        }
        catch (err) {
            console.error(err);
            throw err; // this method only logs that the error did, in fact, occur
        }
    }

    /**
     * Closes an existing database connection, logging success or failure.
     * @param {sqlite.Database} db - Database connection to be closed.
     * @param {string} successMsg - Message to log in console on success.
     */
    static async closeDB(db: sqlite.Database, successMsg: string = "Close database connection"): Promise<void> {
        try {
            db.close();
            console.log(successMsg);
        }
        catch (err) {
            console.error(err);
            throw err; // this method only logs that the error did, in fact, occur
        }
    }

    /**
     * Runs a query with no returns.
     * @param {Database} db - Connection to the database.
     * @param {string} query - DDL or DML-write query.
     * @param {string} successMsg - Message to log in console on success.
     * @param {Array} params - What question marks will be substituted with in a query (protecting from SQL injection).
     * @returns {Promise<void>} Void Promise.
     */
    static async run(db: sqlite.Database, query: string, successMsg: string, params: unknown[] = []): Promise<void> {
        try {
            db.prepare(query).run(params);
            console.log(successMsg);
        }
        catch (err) {
            console.error(err);
            throw err; // this method only logs that the error did, in fact, occur
        }
    }

    /**
     * Runs a SELECT query.
     * @param {sqlite.Database} db - Connection to the database.
     * @param {string} query - Query.
     * @param {string} successMsg - Message to log in console on success.
     * @param {Array} params - What question marks will be substituted with in a query (protecting from SQL injection).
     * @returns {Promise<Object[]>} Promise that resolves with the resulting array of rows.
     */
    static async select(db: sqlite.Database, query: string, successMsg: string, params: unknown[] = []): Promise<Object[]> {
        try {
            const res = db.prepare(query).all(params);
            console.log(successMsg);
            return res;
        }
        catch (err) {
            console.error(err);
            throw err; // this method only logs that the error did, in fact, occur
        }
    }

    /**
     * Runs a SELECT query, returns first match or undefined instead of an array.
     * @param {sqlite.Database} db - Connection to the database.
     * @param {string} query - Query.
     * @param {string} successMsg - Message to log in console on success.
     * @param {Array} params - What question marks will be substituted with in a query (protecting from SQL injection).
     * @returns {Promise<Object | null>} Promise that resolves with the resulting row, or null if none are found.
     */
    static async selectFirst(db: sqlite.Database, query: string, successMsg: string, params: unknown[] = []): Promise<Object | null> {
        try {
            const res = db.prepare(query).get(params);
            console.log(successMsg);
            return res;
        }
        catch (err) {
            console.error(err);
            throw err; // this method only logs that the error did, in fact, occur
        }
    }
}

/**
 * Custom tag function used to remove extra spaces and newlines from the SQL query text.
 * This allows to specify queries at any indentation level in an easily readable way, using template literals,
 * while removing the extra indentation and working with properly formatted query strings in the database and logs.
 * The parameters do not include an array of values, since template interpolation (e.g. `SELECT * FROM ${tableName}`) will never be used.
 * For example, template literal
 * `
 *     SELECT *
 *     FROM Category`
 * turns into a string "SELECT *\nFROM Category"
 *
 * @param strings
 * @returns SQL query or query fragment without extra indentation.
 */
export function sql(strings: TemplateStringsArray): string {
    strictEqual(strings.length, 1); // debug-mode check that no queries are trying to use template interpolation (with template interpolation length would be > 1)
    let query: string = strings[0];
    query = query.replace(/^\n/, ""); // remove leading newline, which is used in code purely for readability
    const leadingSpaces = query.match(/^\s*/)[0]; // extract the full string of leading spaces in the first line
    query = query.replace(new RegExp(`^${leadingSpaces}`), ""); // remove the leading spaces in the first line
    query = query.replaceAll(new RegExp(`\n${leadingSpaces}`, "g"), "\n"); // remove the leading spaces for every line after the first
    return query;
}
