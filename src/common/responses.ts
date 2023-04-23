import { Response } from "express";

export function success(res: Response, body: unknown) {
    res.status(200).send(body);
}

export function dbViolation(res: Response, message: string = "Request violates the data constraints"): void {
    res.status(400).send({
        message: `Bad Request: ${message}`,
    });
}

export function unauthorized(res: Response, message?: string): void {
    res.status(401).send({
        message: `Unauthorized` + (message ? `: ${message}` : ``),
    });
}

export function forbidden(res: Response, message?: string): void {
    res.status(403).send({
        message: `Forbidden` + (message ? `: ${message}` : ``),
    });
}

export function notFound(res: Response, message?: string): void {
    res.status(404).send({
        message: `Not Found` + (message ? `: ${message}` : ``),
    });
}

export function internalError(res: Response, message?: string): void {
    res.status(500).send({
        message: `Internal Server Error` + (message ? `: ${message}` : ``),
    });
}
