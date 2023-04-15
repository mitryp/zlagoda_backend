import {Router} from "express";
import {AuthenticationService} from "../services/auth/authenticationService";
import {loginController} from "../controllers/loginController";
import {Authorizer} from "../middleware/authoriser";

export function loginRouter(authService: AuthenticationService, authorizer: Authorizer): Router {
    const router = Router();

    router.post('', loginController(authService));
    router.post('/validate',
        authorizer.requirePosition(),
        (_, res) => res.status(200).send(),
    );


    return router;
}