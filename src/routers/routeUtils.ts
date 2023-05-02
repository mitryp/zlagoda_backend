import { Database, SqliteError } from "better-sqlite3";
import { Router, Request, Response } from "express";
import { DbHelpers } from "../model/dbHelpers";
import { dbViolation, internalError, notFound, success } from "../common/responses";
import { DatabaseRouteHandler, ExpressMiddleware, RequestMethod } from "../common/types";
import { FilterParam, Pagination } from "../model/repositories/repository";
import { OrderParam } from "../model/sqlQueryBuilder";
import { authDataOf } from "../services/auth/auth_utils";
import { AuthenticationService } from "../services/auth/authenticationService";
import { IUser } from "../model/data_types/employee";

async function tryOpenDbForEndpoint(res: Response, write: boolean = false): Promise<Database> {
    try {
        const db = await DbHelpers.openDB("Opened database connection", write);
        await DbHelpers.run(db, "BEGIN TRANSACTION", "Begun endpoint transaction");
        return db;
    } catch {
        internalError(res, "Failed to open database");
    }
}

async function tryCloseDbForEndpoint(db: Database, res: Response, commit: boolean): Promise<void> {
    try {
        if (commit) await DbHelpers.run(db, "COMMIT", "Committed endpoint transaction");
        else await DbHelpers.run(db, "ROLLBACK", "Rolled back failed endpoint transaction");
        await DbHelpers.closeDB(db, "Closed database connection for endpoint");
    } catch (err) {
        if (res.headersSent) return; // might happen if the handler itself sends a response
        internalError(res, "Failed to close database");
    }
}

/**
 * Takes care of generic setup of a route handler.
 */
export function setupDbRoute<T>(router: Router, method: RequestMethod, route: string, auth: ExpressMiddleware, write: boolean, handler: DatabaseRouteHandler<T>): void {
    const controller = async (req: Request, res: Response) => {
        const db = await tryOpenDbForEndpoint(res, write);
        if (res.headersSent) return; // error with opening db happened and was sent
        try {
            const output: T = await handler(req, res, db);
            await tryCloseDbForEndpoint(db, res, true); // commits the transaction, closes connection
            if (res.headersSent) return; // if failure response was already sent from closing
            if (output === null) notFound(res); // even if handler's output type is void, value of the variable will be "undefined": "null" here represents absence of a valid result where there should be one, like when selecting a single item from a repository}
            else success(res, output); // send result (might even be void, depending on the handler)
        } catch (e) {
            await tryCloseDbForEndpoint(db, res, false); // rolls back the failed transaction, closes connection
            if (res.headersSent) return;
            if (e instanceof SqliteError) {
                const err = e;
                if (err.code.startsWith("SQLITE_CONSTRAINT")) dbViolation(res, "Операція не може бути безпечно виконана з підтримкою валідності інформації в базі даних");
                else if (err.code.startsWith("CORPORATE_INTEGRITY_CONSTRAINT")) dbViolation(res, err.message as string);
            }
            else internalError(res);
        }
    };
    switch (method) {
        case "get":
            router.get(route, auth, controller);
            break;
        case "post":
            router.post(route, auth, controller);
            break;
        case "put":
            router.put(route, auth, controller);
            break;
        case "patch":
            router.patch(route, auth, controller);
            break;
        case "delete":
            router.delete(route, auth, controller);
            break;
        default:
            console.error("Unknown method for db endpoint controller");
            break;
    }
}

/**
 * @param params the req.query parsed query parameters object
 * @returns object with query parameters common for many collection view endpoints (sort order (or null), pagination).
 */
export function parseCollectionQueryParams(params: Object): { order: OrderParam | null; pagination: Pagination } {
    return {
        order: params["sortBy"] ? { key: params["sortBy"] + "Order", asc: params["order"] === "asc" } : null,
        pagination: { limit: params["limit"] ? parseInt(params["limit"]) : 0, offset: params["offset"] ? parseInt(params["offset"]) : 0 },
    };
}

/**
 * @param expectedFilters array of filter names
 * @param params the req.query parsed query parameters object
 * @returns filter array with object pairs "name: parameter", e.g. [{key: "categoryNameFilter", param: "Dairy"}]
 */
export function parseExpectedFilters(expectedFilters: string[], params: Object): FilterParam[] {
    let res: FilterParam[] = [];
    expectedFilters.forEach((filter) => {
        if (params[filter]) res.push({ key: filter, param: params[filter] });
    });
    return res;
}

export async function fetchUser(req: Request, authService: AuthenticationService): Promise<IUser> {
    const token = authDataOf(req).content; // parse bearer token from auth header
    return authService.validateToken(token); // get user by that token; user has employee id
}
