import { Router } from "express";
import { Authorizer } from "../middleware/authoriser";
import { setupDbRoute, parseCollectionQueryParams, parseExpectedFilters } from "./routeUtils";
import { ProductRepository } from "../model/repositories/productRepository";

export function productRouter(auth: Authorizer): Router {
    const router = Router();

    setupDbRoute(router, "get", "", auth.requirePosition(), false, async (req, res, db) => {
        const repo = new ProductRepository(db);
        const { order, pagination } = parseCollectionQueryParams(req.query);
        const filters = parseExpectedFilters(["productNameFilter"], req.query);
        const output = await repo.select(filters, order, pagination);
        res.setHeader("X-Total-Count", output.baseLength); // second element in the resulting tuple is a total length of the paginated results array, which is sent via header
        return output.rows; // will be sent via body
    });

    setupDbRoute(router, "post", "", auth.requirePosition("manager"), true, async (req, _, db) => {
        const repo = new ProductRepository(db);
        return repo.insert(req.body);
    });

    setupDbRoute(router, "get", "/:id", auth.requirePosition(), false, async (req, _, db) => {
        const repo = new ProductRepository(db);
        return repo.selectByPK(req.params.id);
    });

    setupDbRoute(router, "put", "/:id", auth.requirePosition("manager"), true, async (req, _, db) => {
        const repo = new ProductRepository(db);
        return repo.update(req.params.id, req.body);
    });

    setupDbRoute(router, "delete", "/:id", auth.requirePosition("manager"), true, async (req, _, db) => {
        const repo = new ProductRepository(db);
        return repo.delete(req.params.id);
    });

    setupDbRoute(router, "get", "/short", auth.requirePosition(), false, async (req, _, db) => {
        const repo = new ProductRepository(db);
        return repo.allInShort();
    });

    return router;
}
