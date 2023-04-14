import * as express from "express";
import * as cors from "cors";
import * as dotenv from "dotenv";
import { initDbIfNotExists } from "./model/dataSchema";
dotenv.config();

const app = express();

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
    app.use(
        cors({
            allowedHeaders: ["Origin", "X-Requested-With", "Content-Type", "Accept", "Authorization"],
        })
    );
    app.use(express.json());
    app.use(express.urlencoded({ extended: false }));
    app.use(express.static(process.env.PUBLIC_DIR));
    app.use((req, res) => res.redirect("/"));

    // frontend serving setup
    app.get("/", (req, res) => {
        res.sendFile("index.html", {
            root: process.env.PUBLIC_DIR,
        });
    });

    // database initialization
    await initDbIfNotExists();

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
