import { Router } from "express";
import { Authorizer } from "../middleware/authoriser";
import { setupDbRoute, parseCollectionQueryParams, parseExpectedFilters } from "./routeUtils";
import { ClientRepository } from "../model/repositories/clientRepository";

export function clientRouter(auth: Authorizer): Router {
    const router = Router();

    setupDbRoute(router, "get", "/regular_clients", auth.requirePosition("manager"), false, async (req, _res, db) => {
        const repo = new ClientRepository(db);
        return repo.regularCustomers(parseInt(req.query.minPurchases as string));
    });

    setupDbRoute(router, "get", "/short", auth.requirePosition(), false, async (_req, _res, db) => {
        const repo = new ClientRepository(db);
        return repo.allInShort();
    });
    setupDbRoute(router, "get", "", auth.requirePosition(), false, async (req, res, db) => {
        const repo = new ClientRepository(db);
        const { order, pagination } = parseCollectionQueryParams(req.query);
        const filters = parseExpectedFilters(["clientSurnameFilter", "discountFilter"], req.query);
        const output = await repo.select(filters, order, pagination);
        res.setHeader("X-Total-Count", output.baseLength); // second element in the resulting tuple is a total length of the paginated results array, which is sent via header
        return output.rows; // will be sent via body
    });

    setupDbRoute(router, "post", "", auth.requirePosition("manager"), true, async (req, _res, db) => {
        const repo = new ClientRepository(db);
        return repo.insertAndReturn(req.body);
    });

    setupDbRoute(router, "get", "/:id", auth.requirePosition(), false, async (req, _res, db) => {
        const repo = new ClientRepository(db);
        return repo.selectByPK(req.params.id);
    });

    // both managers and cashiers have the rights to update card data
    setupDbRoute(router, "put", "/:id", auth.requirePosition(), true, async (req, _res, db) => {
        const repo = new ClientRepository(db);
        return repo.updateAndReturn(req.params.id, req.body);
    });

    setupDbRoute(router, "delete", "/:id", auth.requirePosition("manager"), true, async (req, _res, db) => {
        const repo = new ClientRepository(db);
        await repo.delete(req.params.id);
    });

    return router;
}
