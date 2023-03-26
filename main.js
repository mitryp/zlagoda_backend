const express = require("express");
const app = express();
const cors = require("cors");
const path = require("path");
const dotenv = require("dotenv");
dotenv.config();

// middleware setup
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// frontend serving setup
app.get("/", (req, res) => {
    res.sendFile("index.html", {
        root: process.env.PUBLIC_DIR,
    });
});
app.use(express.static(process.env.PUBLIC_DIR));
app.use((req, res) => {
    res.redirect("/");
});

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
