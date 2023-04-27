import { Router } from "express";
import { Authorizer } from "../middleware/authoriser";
import { setupDbRoute, parseCollectionQueryParams, parseExpectedFilters, fetchUser } from "./routeUtils";
import { EmployeeRepository } from "../model/repositories/employeeRepository";
import { authDataOf, hashPassword } from "../services/auth/auth_utils";
import { AuthenticationService } from "../services/auth/authenticationService";
import { IEmployeeInput } from "../model/data_types/employee";
import { forbidden } from "../common/responses";

export function employeeRouter(authService: AuthenticationService, auth: Authorizer): Router {
    const router = Router();

    setupDbRoute(router, "get", "/best_cashiers", auth.requirePosition(), false, async (req, _res, db) => {
        const repo = new EmployeeRepository(db);
        return await repo.bestCashiers(parseInt(req.query.minSold as string));
    });

    setupDbRoute(router, "get", "/me", auth.requirePosition(), false, async (req, _res, db) => {
        const user = await fetchUser(req, authService);
        const repo = new EmployeeRepository(db);
        return await repo.selectByPK(user.userId); // find employee corresponding to the user
    });

    setupDbRoute(router, "get", "/cashiers/short", auth.requirePosition(), false, async (_req, _res, db) => {
        const repo = new EmployeeRepository(db);
        return repo.cashiersInShort();
    });

    setupDbRoute(router, "get", "", auth.requirePosition("manager"), false, async (req, res, db) => {
        const repo = new EmployeeRepository(db);
        const { order, pagination } = parseCollectionQueryParams(req.query);
        const filters = parseExpectedFilters(["employeeSurnameFilter", "positionFilter"], req.query);
        const output = await repo.select(filters, order, pagination);
        res.setHeader("X-Total-Count", output.baseLength); // second element in the resulting tuple is a total length of the paginated results array, which is sent via header
        return output.rows; // will be sent via body
    });

    setupDbRoute(router, "post", "", auth.requirePosition("manager"), true, async (req, _res, db) => {
        const repo = new EmployeeRepository(db);
        const employee = req.body as IEmployeeInput;
        employee.password = await hashPassword(employee.password);
        return repo.insertAndReturn(employee);
    });

    // /me route exists so that the client does not need to send the id, but a get request to own id is also treated as allowed
    setupDbRoute(router, "get", "/:id", auth.requirePosition(), false, async (req, res, db) => {
        const repo = new EmployeeRepository(db);
        const user = await fetchUser(req, authService);
        const employee = await repo.selectByPK(req.params.id);
        if (!employee) return null;
        if (user.role === "cashier" && user.userId !== employee.employeeId) forbidden(res, "Як касир, Ви не маєте права переглядати інформацію інших працівників");
        return employee;
    });

    setupDbRoute(router, "put", "/:id", auth.requirePosition("manager"), true, async (req, _res, db) => {
        const repo = new EmployeeRepository(db);
        const employee = req.body as IEmployeeInput;
        if (employee.password) employee.password = await hashPassword(employee.password); // if password is not null, hash it; might be null if request does not intend to change it
        const output = await repo.updateAndReturn(req.params.id, employee); // first perform the update, because it might fail and cause a fail response
        await authService.logout(req.params.id); // on successful update, log the employee out to force them to login again and receive relevant data
        return output;
    });

    setupDbRoute(router, "delete", "/:id", auth.requirePosition("manager"), true, async (req, _res, db) => {
        const repo = new EmployeeRepository(db);
        await repo.delete(req.params.id); // delete first, because the operation might fail
        await authService.logout(req.params.id); // on successful delete, log the employee out, because their account is no longer valid
    });

    return router;
}
