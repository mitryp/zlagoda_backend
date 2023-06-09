import { Router } from "express";
import { Authorizer } from "../middleware/authoriser";
import { setupDbRoute, parseCollectionQueryParams, parseExpectedFilters } from "./routeUtils";
import { ProductRepository } from "../model/repositories/productRepository";

export function productRouter(auth: Authorizer): Router {
    const router = Router();

    setupDbRoute(router, "get", "/sold_for", auth.requirePosition("manager"), false, async (req, _res, db) => {
        const repo = new ProductRepository(db);
        const minTotal: number = req.query.minTotalFilter ? parseInt(req.query.minTotalFilter as string) : 0; // without specification, the filter is for total sold price to be >= 0, which is all products
        return repo.soldFor(minTotal);
    });

    setupDbRoute(router, "get", "/purchased_by_all_clients", auth.requirePosition("manager"), false, async (req, _res, db) => {
        const repo = new ProductRepository(db);
        const surnameSearchPart = req.query.clientSurnameFilter ? req.query.clientSurnameFilter as string : "";
        return repo.purchasedByAllClients(surnameSearchPart);
    });

    setupDbRoute(router, "get", "/sold_by_all_cashiers", auth.requirePosition("manager"), false, async (req, _res, db) => {
        const repo = new ProductRepository(db);
        return repo.soldByAllCashiers();
    });

    setupDbRoute(router, "get", "/:id/total_sold", auth.requirePosition("manager"), false, async (req, _res, db) => {
        const repo = new ProductRepository(db);
        const filters = parseExpectedFilters(["dateMinFilter", "dateMaxFilter"], req.query);
        return repo.quantitySold(req.params.id, filters);
    });

    // this must come first so that "short" route is registered over generic parametrized ":id" route
    setupDbRoute(router, "get", "/short", auth.requirePosition(), false, async (_req, _res, db) => {
        const repo = new ProductRepository(db);
        return repo.allInShort();
    });

    setupDbRoute(router, "get", "", auth.requirePosition(), false, async (req, res, db) => {
        const repo = new ProductRepository(db);
        const { order, pagination } = parseCollectionQueryParams(req.query);
        const filters = parseExpectedFilters(["categoryIdFilter", "productNameFilter"], req.query);
        const output = await repo.select(filters, order, pagination);
        res.setHeader("X-Total-Count", output.baseLength); // second element in the resulting tuple is a total length of the paginated results array, which is sent via header
        return output.rows; // will be sent via body
    });

    setupDbRoute(router, "post", "", auth.requirePosition("manager"), true, async (req, _res, db) => {
        const repo = new ProductRepository(db);
        return repo.insertAndReturn(req.body);
    });

    setupDbRoute(router, "get", "/:id", auth.requirePosition(), false, async (req, _res, db) => {
        const repo = new ProductRepository(db);
        return repo.selectByPK(req.params.id);
    });

    setupDbRoute(router, "put", "/:id", auth.requirePosition("manager"), true, async (req, _res, db) => {
        const repo = new ProductRepository(db);
        return repo.updateAndReturn(req.params.id, req.body);
    });

    setupDbRoute(router, "delete", "/:id", auth.requirePosition("manager"), true, async (req, _res, db) => {
        const repo = new ProductRepository(db);
        await repo.delete(req.params.id);
    });

    return router;
}
