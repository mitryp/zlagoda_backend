import * as crypto from "crypto";
import * as bcrypt from "bcrypt";
import {promisify} from "util";
import {Request} from "express";
import {AuthorizationScheme} from "../../common/types";
import {AuthenticationService} from "./authenticationService";
import {DbHelpers} from "../../model/dbHelpers";
import {TokenStorage} from "./tokenStorage";
import {Authorizer} from "../../middleware/authoriser";

const randomBytesAsync: (arg1: number) => Promise<Buffer> = promisify(crypto.randomBytes);
const tokenByteLength: number = parseInt(process.env.TOKEN_BYTE_LENGTH);
const hashSaltRounds: number = parseInt(process.env.HASH_SALT_ROUNDS);

/**
 * @returns a random hexadecimal string of length that is to be used as a session token.
 */
export async function generateSessionToken(): Promise<string> {
    const buffer: Buffer = await randomBytesAsync(tokenByteLength);
    return buffer.toString("hex");
}

export async function hashPassword(password: string): Promise<string> {
    const salt: string = await bcrypt.genSalt(hashSaltRounds);
    return bcrypt.hash(password, salt);
}

export function validatePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
}

export function newExpireDate(): number {
    return new Date().getTime() + +process.env.AUTH_SESSION_TIMEOUT;
}

type AuthData = {
    schema: AuthorizationScheme,
    content: string,
}

export function authDataOf(req: Request): AuthData | null {
    const authHeader = req.header('Authorization');
    if (!authHeader || !/((Basic)|(Bearer)) /.test(authHeader)) return null;
    const [schema, content] = authHeader.split(' ');

    return {
        schema: schema as AuthorizationScheme,
        content: content,
    };
}

export function decodeBasicCredentials(encoded: string): [string, string] {
    const decoded = Buffer.from(encoded, 'base64').toString();
    const [login, password] = decoded.split(':');

    return [login, password];
}

export async function initAuth(): Promise<[AuthenticationService, Authorizer]> {
    const authService = new AuthenticationService(
        await DbHelpers.openDB('Opened db connection for authorization service'),
        new TokenStorage(),
    );
    const authorizer = new Authorizer(authService);

    return [authService, authorizer];
}

