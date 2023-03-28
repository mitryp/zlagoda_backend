import {Database, OPEN_READONLY} from 'sqlite3';
import * as dotenv from 'dotenv';

dotenv.config();


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
    static async openDB(
        successMsg: string = "Establish database connection",
        sqliteFlags: number = OPEN_READONLY
    ): Promise<Database> {
        return new Promise<Database>((resolve, reject) => {
            const db = new Database(process.env.DB_PATH, sqliteFlags, (err) => {
                if (err) {
                    console.error(err);
                    reject(err);
                } else {
                    console.log(successMsg);
                    resolve(db);
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
                    resolve(null); // no useful information to resolve with on success
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
                    resolve(null);
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
}
