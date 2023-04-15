import {NextFunction, Request, Response} from "express";

export type ExpressMiddleware = (req: Request, res: Response, next: NextFunction) => void;
export type ExpressController = (req: Request, res: Response) => void;
export type AuthorizationScheme = "Bearer" | "Basic";