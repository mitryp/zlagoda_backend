import {Request, Response} from "express";
import {unauthorized} from "../common/responses";
import {AuthenticationService} from "../services/auth/authenticationService";
import {ExpressController} from "../common/types";
import {authDataOf, decodeBasicCredentials} from "../services/auth/auth_utils";


export function loginController(authService: AuthenticationService): ExpressController {
    return async (req: Request, res: Response) => {
        const auth = authDataOf(req);
        if (!auth || auth.schema !== 'Basic')
            return unauthorized(res, 'Basic authorization required');

        const [login, password] = decodeBasicCredentials(auth.content);

        const user = await authService.login(login, password);
        if (!user)
            return unauthorized(res, 'Invalid credentials');

        res.send(user);
    }
}
