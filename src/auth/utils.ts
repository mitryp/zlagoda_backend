import * as crypto from "crypto";
import * as bcrypt from "bcrypt";
import { promisify } from "util";
import { EmployeeRepository } from "../model/repositories/employeeRepository";
import { DbHelpers } from "../model/dbHelpers";
import { Database } from "sqlite3";

const randomBytesAsync: (arg1: number) => Promise<Buffer> = promisify(crypto.randomBytes);
const tokenByteLength: number = parseInt(process.env.TOKEN_BYTE_LENGTH);
const hashSaltRounds: number = parseInt(process.env.HASH_SALT_ROUNDS);

/**
 * @returns a random hexadecimal string of length that is to be used as a session token.
 */
export async function generateSessionToken(): Promise<string> {
    const buffer: Buffer = await randomBytesAsync(tokenByteLength);
    const sessionToken = buffer.toString("hex");
    return sessionToken;
}

export async function hashPassword(password: string): Promise<string> {
    const salt: string = await bcrypt.genSalt(hashSaltRounds);
    return bcrypt.hash(password, salt);
}

/**
 * @param login login of the user whose password is to be checked
 * @param password input password
 * @param db database connection to use (if not provided, function will open and close one)
 * @returns whether the input password is valid, based on the hash stored in the database
 */
export async function validateCredentials(login: string, password: string, db: Database = null): Promise<boolean> {
    let opened: boolean = false;
    if (!db) {
        opened = true;
        db = await DbHelpers.openDB("Open database connection to validate " + login + "'s password");
    }
    const repo: EmployeeRepository = new EmployeeRepository(db);
    const hash: string = await repo.selectUserPasswordHash(login);
    if (opened) DbHelpers.closeDB(db);
    return hash ? bcrypt.compare(password, hash) : false;
}
