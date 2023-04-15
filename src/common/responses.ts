import {Response} from "express";

export function unauthorized(res: Response, message?: string): void {
    res.status(401).send({
        message: `Unauthorized: ${message}`
    });
}

export function forbidden(res: Response, message?: string): void {
    res.status(403).send({
        message: `Forbidden: ${message}`
    });
}