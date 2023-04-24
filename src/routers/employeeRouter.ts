import { Router } from "express";
import { Authorizer } from "../middleware/authoriser";
import { setupDbRoute, parseCollectionQueryParams, parseExpectedFilters } from "./routeUtils";
import { EmployeeRepository } from "../model/repositories/employeeRepository";
import { authDataOf, hashPassword } from "../services/auth/auth_utils";
import { AuthenticationService } from "../services/auth/authenticationService";
import { IEmployeeInput } from "../model/data_types/employee";

export function employeeRouter(authService: AuthenticationService, auth: Authorizer): Router {
    const router = Router();

    setupDbRoute(router, "get", "/me", auth.requirePosition(), false, async (req, _res, db) => {
        const token = authDataOf(req).content; // parse bearer token from auth header
        const user = await authService.validateToken(token); // get user by that token; user has employee id
        const repo = new EmployeeRepository(db);
        return await repo.selectByPK(user.userId); // find employee corresponding to the user
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

    setupDbRoute(router, "get", "/:id", auth.requirePosition("manager"), false, async (req, _res, db) => {
        const repo = new EmployeeRepository(db);
        return repo.selectByPK(req.params.id);
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
