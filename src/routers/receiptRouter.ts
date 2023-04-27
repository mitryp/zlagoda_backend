import { Router } from "express";
import { Authorizer } from "../middleware/authoriser";
import { parseExpectedFilters, parseCollectionQueryParams, setupDbRoute, fetchUser } from "./routeUtils";
import { ReceiptRepository } from "../model/repositories/receiptRepository";
import { authDataOf } from "../services/auth/auth_utils";
import { AuthenticationService } from "../services/auth/authenticationService";
import { IReceiptInput } from "../model/data_types/receipt";
import { forbidden } from "../common/responses";

export function receiptRouter(authService: AuthenticationService, auth: Authorizer): Router {
    const router = Router();

    setupDbRoute(router, "get", "/total_sum", auth.requirePosition("manager"), false, async (req, _res, db) => {
        const repo = new ReceiptRepository(db);
        const filters = parseExpectedFilters(["employeeIdFilter", "dateMinFilter", "dateMaxFilter"], req.query);
        return repo.getCount(filters);
    });

    setupDbRoute(router, "get", "/me", auth.requirePosition("cashier"), false, async (req, res, db) => {
        const user = await fetchUser(req, authService);
        const { order, pagination } = parseCollectionQueryParams(req.query);
        const filters = parseExpectedFilters(["dateMinFilter", "dateMaxFilter"], req.query);
        filters.push({ key: "employeeIdFilter", param: user.userId });
        const repo = new ReceiptRepository(db);
        const output = await repo.select(filters, order, pagination);
        res.setHeader("X-Total-Count", output.baseLength); // second element in the resulting tuple is a total length of the paginated results array, which is sent via header
        return output.rows; // will be sent via body
    });

    // only manager is authorized to see all receipts
    setupDbRoute(router, "get", "", auth.requirePosition("manager"), false, async (req, res, db) => {
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

    // here the check is more complex: technically both manager and cashier can make this get request, and validation for cashier (whether it is a receipt written by them) is required separately
    setupDbRoute(router, "get", "/:id", auth.requirePosition(), false, async (req, res, db) => {
        const user = await fetchUser(req, authService);
        const repo = new ReceiptRepository(db);
        const receipt = await repo.selectByPK(parseInt(req.params.id));
        if (!receipt) return null;
        if (user.role === "cashier" && receipt.employeeId !== user.userId) forbidden(res, "Ви не маєте права переглядати чеки інших касирів");
        return receipt;
    });

    // no put route because receipts are not to be updated

    setupDbRoute(router, "delete", "/:id", auth.requirePosition("manager"), true, async (req, _res, db) => {
        const repo = new ReceiptRepository(db);
        await repo.delete(parseInt(req.params.id));
    });

    return router;
}
