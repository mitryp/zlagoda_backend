import { Router } from "express";
import { Authorizer } from "../middleware/authoriser";
import { setupDbRoute, parseCollectionQueryParams, parseExpectedFilters } from "./routeUtils";
import { StoreProductRepository } from "../model/repositories/storeProductRepository";
import { IStoreProductInput } from "../model/data_types/storeProduct";

const discountQuotient = parseFloat(process.env.DISCOUNT_QUOTIENT);

export function storeProductRouter(auth: Authorizer): Router {
    const router = Router();

    setupDbRoute(router, "get", "", auth.requirePosition(), false, async (req, res, db) => {
        const repo = new StoreProductRepository(db);
        const { order, pagination } = parseCollectionQueryParams(req.query);
        const filters = parseExpectedFilters(["upcFilter", "productNameFilter"], req.query);
        const output = await repo.select(filters, order, pagination);
        res.setHeader("X-Total-Count", output.baseLength); // second element in the resulting tuple is a total length of the paginated results array, which is sent via header
        return output.rows; // will be sent via body
    });

    setupDbRoute(router, "post", "", auth.requirePosition("manager"), true, async (req, _res, db) => {
        const repo = new StoreProductRepository(db);
        let storeProduct = req.body as IStoreProductInput;
        if (storeProduct.baseStoreProductId !== null) {
            storeProduct.price = (await repo.selectByPK(storeProduct.baseStoreProductId)).price * discountQuotient; // static discount from base price
        }
        return repo.insertAndReturn(req.body);
    });

    setupDbRoute(router, "get", "/:id", auth.requirePosition(), false, async (req, _res, db) => {
        const repo = new StoreProductRepository(db);
        return repo.selectByPK(parseInt(req.params.id));
    });

    setupDbRoute(router, "put", "/:id", auth.requirePosition("manager"), true, async (req, _res, db) => {
        const repo = new StoreProductRepository(db);
        let storeProduct = req.body as IStoreProductInput;
        if (storeProduct.baseStoreProductId !== null && storeProduct.price === null) {
            storeProduct.price = (await repo.selectByPK(storeProduct.baseStoreProductId)).price * discountQuotient; // TODO do something
        }
        return repo.updateAndReturn(parseInt(req.params.id), req.body);
    });

    setupDbRoute(router, "delete", "/:id", auth.requirePosition("manager"), true, async (req, _res, db) => {
        const repo = new StoreProductRepository(db);
        return repo.delete(parseInt(req.params.id));
    });

    setupDbRoute(router, "get", "/short", auth.requirePosition(), false, async (_req, _res, db) => {
        const repo = new StoreProductRepository(db);
        return repo.allInShort();
    });

    return router;
}