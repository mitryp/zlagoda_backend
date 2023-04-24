import * as dotenv from "dotenv";
dotenv.config();
import * as express from "express";
import * as cors from "cors";
import { initDbIfNotExists } from "./model/dataSchema";
import { initAuth } from "./services/auth/auth_utils";
import { loginRouter } from "./routers/loginRouter";
import { productRouter } from "./routers/productRouter";
import { categoryRouter } from "./routers/categoryRouter";
import { employeeRouter } from "./routers/employeeRouter";
import { storeProductRouter } from "./routers/storeProductRouter";

const app = express();

function applyMiddlewares() {
    // logs all requests
    app.use((req, res, next) => {
        console.log(`${new Date().toTimeString()} - ${req.method} ${req.url}`);
        next();
    });

    app.use(
        cors({
            allowedHeaders: ["Origin", "X-Requested-With", "Content-Type", "Accept", "Authorization"],
        })
    );
    app.use(express.json());
    app.use(express.urlencoded({ extended: false }));
    app.use(express.static(process.env.PUBLIC_DIR));

    app.use((req, res, next) => {
        if (!req.path.startsWith("/api")) {
            console.log("Redirecting to /");
            return res.redirect("/");
        }
        next();
    });
}

/**
 In the world of code, where lines never end,
 And programs run, their functions to attend,
 One stands out above the rest,
 It's called "startServer", it's surely the best.

 It starts with a call, a simple request,
 To launch a server, with all the best,
 From port to protocol, it handles it all,
 No need for worry, no need to stall.

 With every connection, it springs to life,
 Ready to handle, any user's strife,
 Requests come in, and it responds with grace,
 Quick and efficient, it keeps up the pace.

 Errors may arise, but it won't back down,
 With logs to guide, it turns them around,
 It's built to last, it's built to withstand,
 The tests of time, and users' demands.

 So if you need a server, that's reliable and strong,
 Look no further, than "startServer's" song,
 It's the function you need, to get your site on track,
 With smooth sailing ahead, and no looking back.
 */
async function startServer(): Promise<void> {
    // middleware setup
    applyMiddlewares();

    // frontend serving setup
    app.get("/", (req, res) => {
        res.sendFile("index.html", {
            root: process.env.PUBLIC_DIR,
        });
    });

    // database initialization
    await initDbIfNotExists();

    // auth initialization
    const [authService, auth] = await initAuth();

    // auth routes
    app.use("/api/login", loginRouter(authService, auth));

    app.use("/api/categories", categoryRouter(auth));
    app.use("/api/products", productRouter(auth));
    app.use("/api/store_products", storeProductRouter(auth));
    app.use("/api/employees", employeeRouter(authService, auth));
    // auth examples:
    // any position:
    // app.get('/categories', auth.requirePosition(), (req, res) => {});
    // exact position:
    // app.get('/employees', auth.requirePosition('manager'), (req, res) => {});

    // api routes
    // employee

    // product

    // store_product

    // category

    // customer_card

    // receipt

    app.listen(process.env.PORT, () => {
        console.log(`Start app, listening at http://localhost:${process.env.PORT}`);
    });
}

startServer();
