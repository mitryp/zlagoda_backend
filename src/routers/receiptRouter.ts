import { Router } from "express";
import { Authorizer } from "../middleware/authoriser";
import { parseExpectedFilters, parseCollectionQueryParams, setupDbRoute } from "./routeUtils";
import { ReceiptRepository } from "../model/repositories/receiptRepository";
import { authDataOf } from "../services/auth/auth_utils";
import { AuthenticationService } from "../services/auth/authenticationService";
import { IReceiptInput } from "../model/data_types/receipt";

export function receiptRouter(authService: AuthenticationService, auth: Authorizer): Router {
    const router = Router();

    setupDbRoute(router, "get", "/me", auth.requirePosition("cashier"), false, async (req, res, db) => {
        const token = authDataOf(req).content; // parse bearer token from auth header
        const user = await authService.validateToken(token); // get user by that token; user has employee id
        const { order, pagination } = parseCollectionQueryParams(req.query);
        const filters = parseExpectedFilters(["dateMinFilter", "dateMaxFilter"], req.query);
        filters.push({ key: "employeeIdFilter", param: user.userId });
        const repo = new ReceiptRepository(db);
        const output = await repo.select(filters, order, pagination);
        res.setHeader("X-Total-Count", output.baseLength); // second element in the resulting tuple is a total length of the paginated results array, which is sent via header
        return output.rows; // will be sent via body
    });

    setupDbRoute(router, "get", "", auth.requirePosition(), false, async (req, res, db) => {
        const repo = new ReceiptRepository(db);
        const { order, pagination } = parseCollectionQueryParams(req.query);
        const filters = parseExpectedFilters(["dateMinFilter", "dateMaxFilter", "employeeIdFilter"], req.query);
        const output = await repo.select(filters, order, pagination);
        res.setHeader("X-Total-Count", output.baseLength); // second element in the resulting tuple is a total length of the paginated results array, which is sent via header
        return output.rows; // will be sent via body
    });

    // only cashier has the right to create receipts
    setupDbRoute(router, "post", "", auth.requirePosition("cashier"), true, async (req, _res, db) => {
        const token = authDataOf(req).content; // parse bearer token from auth header
        const user = await authService.validateToken(token); // get user (employee) who made the request, using their token
        let dto = req.body as IReceiptInput;
        dto.employeeId = user.userId; // put employee id as id of the employee that made the request
        const repo = new ReceiptRepository(db);
        return repo.insertAndReturn(dto);
    });

    setupDbRoute(router, "get", "/:id", auth.requirePosition(), false, async (req, _res, db) => {
        const repo = new ReceiptRepository(db);
        return repo.selectByPK(parseInt(req.params.id));
    });

    // no put route because receipts are not to be updated

    setupDbRoute(router, "delete", "/:id", auth.requirePosition("manager"), true, async (req, _res, db) => {
        const repo = new ReceiptRepository(db);
        await repo.delete(parseInt(req.params.id));
    });

    return router;
}
