import { Router } from "express";
import { Authorizer } from "../middleware/authoriser";
import { setupDbRoute, parseCollectionQueryParams, parseExpectedFilters } from "./routeUtils";
import { StoreProductRepository } from "../model/repositories/storeProductRepository";
import { IStoreProductInput } from "../model/data_types/storeProduct";


export function storeProductRouter(auth: Authorizer): Router {
    const router = Router();

    // this must come first so that "short" route is registered over generic parametrized ":id" route
    setupDbRoute(router, "get", "/short", auth.requirePosition(), false, async (_req, _res, db) => {
        const repo = new StoreProductRepository(db);
        return repo.allInShort();
    });

    setupDbRoute(router, "get", "", auth.requirePosition(), false, async (req, res, db) => {
        const repo = new StoreProductRepository(db);
        const { order, pagination } = parseCollectionQueryParams(req.query);
        let filters = parseExpectedFilters(["upcFilter"], req.query);
        if (req.query["isPromFilter"]) filters.push({key: "isPromFilter", param: req.query["isPromFilter"] === "true" ? 1 : 0}); // manually parse true/false filter because automatically it parses as a string, which is problematic
        const output = await repo.select(filters, order, pagination);
        res.setHeader("X-Total-Count", output.baseLength); // second element in the resulting tuple is a total length of the paginated results array, which is sent via header
        return output.rows; // will be sent via body
    });

    setupDbRoute(router, "post", "", auth.requirePosition("manager"), true, async (req, _res, db) => {
        const repo = new StoreProductRepository(db);
        return repo.insertAndReturn(req.body); // insert regular store product
    });

    setupDbRoute(router, "get", "/:id", auth.requirePosition(), false, async (req, _res, db) => {
        const repo = new StoreProductRepository(db);
        return repo.selectByPK(parseInt(req.params.id));
    });

    setupDbRoute(router, "put", "/:id", auth.requirePosition("manager"), true, async (req, _res, db) => {
        const repo = new StoreProductRepository(db);
        return repo.updateAndReturn(parseInt(req.params.id), req.body);
    });

    setupDbRoute(router, "delete", "/:id", auth.requirePosition("manager"), true, async (req, _res, db) => {
        const repo = new StoreProductRepository(db);
        await repo.delete(parseInt(req.params.id));
    });

    setupDbRoute(router, "post", "/:id/prom", auth.requirePosition("manager"), true, async (req, _res, db) => {
        const repo = new StoreProductRepository(db);
        await repo.insertPromotionalAndReturn(parseInt(req.params.id), req.body);
    });

    setupDbRoute(router, "patch", "/:id/prom", auth.requirePosition("manager"), true, async (req, _res, db) => {
        const repo = new StoreProductRepository(db);
        await repo.patchPromotionalQuantityAndReturn(parseInt(req.params.id), req.body);
    });

    setupDbRoute(router, "delete", "/:id/prom", auth.requirePosition("manager"), true, async (req, _res, db) => {
        const repo = new StoreProductRepository(db);
        await repo.deletePromotional(parseInt(req.params.id));
    });

    return router;
}
