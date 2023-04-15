import {ExpressMiddleware} from "../common/types";
import {EmployeePosition} from "../model/data_types/employee";
import {AuthenticationService} from "../services/auth/authenticationService";
import {DbHelpers} from "../model/dbHelpers";
import {TokenStorage} from "../services/auth/tokenStorage";
import {forbidden, unauthorized} from "../common/responses";
import {authDataOf} from "../services/auth/auth_utils";

export class Authorizer {
    constructor(private authService: AuthenticationService) {
    }

    requirePosition(position?: EmployeePosition): ExpressMiddleware {
        return async (req, res, next) => {
            const auth = authDataOf(req);
            if (!auth || auth.schema !== 'Bearer') {
                return unauthorized(res, 'Необхідно надати токен авторизації');
            }

            const token = auth.content;
            const user = await this.authService.validateToken(token);

            if (!user) {
                return unauthorized(res, 'Токен авторизації не дійсний');
            }

            if (position && user.role !== position) {
                return forbidden(res, 'Користувач не має прав для виконання цієї дії');
            }

            next();
        };
    }
}
