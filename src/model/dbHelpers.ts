import { Database, OPEN_READONLY } from "sqlite3";
import { strictEqual } from "assert";

/**
 * Class encapsulating common functionality for accessing the database.
 */
export class DbHelpers {
    /**
     * Establishes a new database connection, logging success or failure.
     * @param {string} successMsg - Message to log in console on success.
     * @param {number} sqliteFlags - Flags to open the table with (opens in readonly mode by default).
     * @returns {Promise<Database>} Promise that resolves with the newly established connection.
     */
    static async openDB(successMsg: string = "Establish database connection", sqliteFlags: number = OPEN_READONLY): Promise<Database> {
        return new Promise<Database>((resolve, reject) => {
            const db = new Database(process.env.DB_PATH, sqliteFlags, (err) => {
                if (err) {
                    console.error(err);
                    reject(err);
                } else {
                    console.log(successMsg);
                    this.run(db, "PRAGMA foreign_keys = ON", "Enable foreign keys for new connection") // foreign keys have to be explicitly enabled for each new connection to sqlite database
                        .then(() => resolve(db));
                }
            });
        });
    }

    /**
     * Closes an existing database connection, logging success or failure.
     * @param {Database} db - Database connection to be closed.
     * @param {string} successMsg - Message to log in console on success.
     * @returns {Promise<void>} Void Promise.
     */
    static async closeDB(db: Database, successMsg: string = "Close database connection"): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            db.close((err) => {
                if (err) {
                    console.error(err);
                    reject(err);
                } else {
                    console.log(successMsg);
                    resolve(); // no useful information to resolve with on success
                }
            });
        });
    }

    /**
     * Runs a query with no returns.
     * @param {Database} db - Connection to the database.
     * @param {string} query - DDL or DML-write query.
     * @param {string} successMsg - Message to log in console on success.
     * @param {Array} params - What question marks will be substituted with in a query (protecting from SQL injection).
     * @returns {Promise<void>} Void Promise.
     */
    static async run(db: Database, query: string, successMsg: string, params: unknown[] = []): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            db.run(query, params, (err) => {
                if (err) {
                    console.error(err);
                    reject(err);
                } else {
                    console.log(successMsg);
                    resolve();
                }
            });
        });
    }

    /**
     * Runs a SELECT query.
     * @param {Database} db - Connection to the database.
     * @param {string} query - Query.
     * @param {string} successMsg - Message to log in console on success.
     * @param {Array} params - What question marks will be substituted with in a query (protecting from SQL injection).
     * @returns {Promise<Array<Object>>} Promise that resolves with the resulting array of rows.
     */
    static async select(db: Database, query: string, successMsg: string, params: unknown[] = []): Promise<Object[]> {
        return new Promise<Object[]>((resolve, reject) => {
            db.all(query, params, (err, rows) => {
                if (err) {
                    console.error(err);
                    reject(err);
                } else {
                    console.log(successMsg);
                    resolve(rows);
                }
            });
        });
    }

    /**
     * Runs a SELECT query, returns first match or undefined instead of an array.
     * @param {Database} db - Connection to the database.
     * @param {string} query - Query.
     * @param {string} successMsg - Message to log in console on success.
     * @param {Array} params - What question marks will be substituted with in a query (protecting from SQL injection).
     * @returns {Promise<Object | null>} Promise that resolves with the resulting row, or null if none are found.
     */
    static async selectFirst(db: Database, query: string, successMsg: string, params: unknown[] = []): Promise<Object | null> {
        return new Promise<Object | null>((resolve, reject) => {
            db.get(query, params, (err, row) => {
                if (err) {
                    console.error(err);
                    reject(err);
                } else {
                    console.log(successMsg);
                    resolve(row ? row : null); // replace undefined with null for clarity
                }
            });
        });
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
