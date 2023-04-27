import { Router } from "express";
import { Authorizer } from "../middleware/authoriser";
import { parseExpectedFilters, parseCollectionQueryParams, setupDbRoute } from "./routeUtils";
import { CategoryRepository } from "../model/repositories/categoryRepository";

export function categoryRouter(auth: Authorizer): Router {
    const router = Router();

    // this must come first so that "short" route is registered over generic parametrized ":id" route
    setupDbRoute(router, "get", "/short", auth.requirePosition(), false, async (_req, _res, db) => {
        const repo = new CategoryRepository(db);
        return repo.allInShort();
    });

    setupDbRoute(router, "get", "", auth.requirePosition("manager"), false, async (req, res, db) => {
        const repo = new CategoryRepository(db);
        const { order, pagination } = parseCollectionQueryParams(req.query);
        const output = await repo.select([], order, pagination);
        res.setHeader("X-Total-Count", output.baseLength); // second element in the resulting tuple is a total length of the paginated results array, which is sent via header
        return output.rows; // will be sent via body
    });

    setupDbRoute(router, "post", "", auth.requirePosition("manager"), true, async (req, _res, db) => {
        const repo = new CategoryRepository(db);
        return repo.insertAndReturn(req.body);
    });

    setupDbRoute(router, "get", "/:id", auth.requirePosition(), false, async (req, _res, db) => {
        const repo = new CategoryRepository(db);
        return repo.selectByPK(parseInt(req.params.id));
    });

    setupDbRoute(router, "put", "/:id", auth.requirePosition("manager"), true, async (req, _res, db) => {
        const repo = new CategoryRepository(db);
        return repo.updateAndReturn(parseInt(req.params.id), req.body);
    });

    setupDbRoute(router, "delete", "/:id", auth.requirePosition("manager"), true, async (req, _res, db) => {
        const repo = new CategoryRepository(db);
        await repo.delete(parseInt(req.params.id));
    });

    return router;
}
