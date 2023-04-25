import { NextFunction, Request, Response } from "express";
import { Database } from "better-sqlite3";

export type ExpressMiddleware = (req: Request, res: Response, next: NextFunction) => void;
export type ExpressController = (req: Request, res: Response) => void;
export type AuthorizationScheme = "Bearer" | "Basic";
export type RequestMethod = "get" | "post" | "put" | "delete";
/**
 * Abstract asynchronous handler that does the work with the database connection and does not concern itself with acquisition of the connection
 * or error handling or sending the result (just returns the result).
 * The handler is not expected to send responses, as all of them are handled by the controller; however, it may need to set custom headers like X-Total-Count.
 */
export type DatabaseRouteHandler<T> = (req: Request, res: Response, db: Database) => Promise<T>;
