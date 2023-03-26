const sqlite3 = require("sqlite3").verbose();
const dotenv = require("dotenv");
dotenv.config();

/**
 * Class encapsulating common functionality for accessing the database.
 */
class Repository {
    /**
     * Establishes a new database connection, logging success or failure.
     * @param {string} successMsg - Message to log in console on success.
     * @param {number} sqliteFlags - Flags to open the table with (opens in readonly mode by default).
     * @returns {Promise<Database>} Promise that resolves with the newly established connection.
     */
    static async openDB(
        successMsg = "Establish database connection",
        sqliteFlags = sqlite3.OPEN_READONLY
    ) {
        return new Promise((resolve, reject) => {
            const db = new sqlite3.Database(process.env.DB_PATH, sqliteFlags, (err) => {
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
     * @param {Database} - Database connection to be closed.
     * @param {string} successMsg - Message to log in console on success.
     * @returns {Promise<null>} Promise that resolves with a null.
     */
    static async closeDB(db, successMsg = "Close database connection") {
        return new Promise((resolve, reject) => {
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
     * @returns {Promise<null>} Promise that resolves with a null.
     */
    static async run(db, query, successMsg, params = []) {
        return new Promise((resolve, reject) => {
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
    static async select(db, query, successMsg, params = []) {
        return new Promise((resolve, reject) => {
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

module.exports = Repository;
