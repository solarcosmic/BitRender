const express = require("express");
const multer = require("multer");
const path = require("path");
const kleur = require("kleur");
const swaggerUi = require("swagger-ui-express"); // for later
const swaggerJs = require("swagger-jsdoc");
const mysql = require("mysql");
const sharp = require("sharp");
const yaml = require("js-yaml");
const fs = require("fs");
const app = express();
app.use(express.json());

var db = "bitrender";
var host = "127.0.0.1";
var user = "root";

log(`
                  Welcome to
▄▄▄▄· ▪  ▄▄▄▄▄▄▄▄  ▄▄▄ . ▐ ▄ ·▄▄▄▄  ▄▄▄ .▄▄▄  
▐█ ▀█▪██ •██  ▀▄ █·▀▄.▀·•█▌▐███▪ ██ ▀▄.▀·▀▄ █·
▐█▀▀█▄▐█· ▐█.▪▐▀▀▄ ▐▀▀▪▄▐█▐▐▌▐█· ▐█▌▐▀▀▪▄▐▀▀▄ 
██▄▪▐█▐█▌ ▐█▌·▐█•█▌▐█▄▄▌██▐█▌██. ██ ▐█▄▄▌▐█•█▌
·▀▀▀▀ ▀▀▀ ▀▀▀ .▀  ▀ ▀▀▀ ▀▀ █▪▀▀▀▀▀•  ▀▀▀ .▀  ▀
`);
const start = Date.now();
var sql = mysql.createConnection({
    host: host,
    user: user,
    database: db,
    password: "",
});

const swaggerOptions = {
    definition: {
        openapi: "3.0.0",
        info: {
            title: "BitRender",
            version: "1.0.0" // to replace with manifest version
        },
    },
    apis: ["./index.js"]
};
const openApiSpecification = swaggerJs(swaggerOptions);
const uplMulter = multer({storage: multer.memoryStorage()});

sql.connect(function(err) {
    if (err) {
        console.log(kleur.red("Database error occurred - " + err));
        return process.exit();
    }
    console.log(kleur.green("✱  Connected to database! - " + db + "@" + host + " as " + user));
    app.listen(port, () => {
        console.log("✱  Listening on " + kleur.underline("127.0.0.1:" + port) + " | Press Ctrl+C / Cmd+C to exit (^C)");
        console.log("Took approximately " + (Date.now() - start) + "ms to load.");
    });
})

const base64types = {
    "jpeg": "data:image/jpeg;base64,",
    "png": "data:image/png;base64,",
    "webp": "data:image/webp;base64,",
    "gif": "data:image/gif;base64,",
    "jp2": "data:image/jp2;base64,",
    "tiff": "data:image/tiff;base64,",
    "avif": "data:image/avif;base64,",
    "heif": "data:image/heif;base64,",
    "jxl": "data:image/jxl;base64,",
    "raw": "data:image/x-raw;base64,", // may work?
}

/**
 * @openapi
 * /images/convert/base64:
 *   post:
 *     description: Converts a base64 image string into another.
 *     responses:
 *       200:
 *         description: Returns the converted image in Base64 format.
 *     parameters:
 *       - name: format
 *         required: true
 *         type: string
 *         in: formData
 *         description: The format you want to convert the image to.
 *       - name: base64
 *         required: true
 *         type: string
 *         in: formData
 *         description: Valid base64 data that you want converted.
 */
app.post("/images/convert/base64", async (req, res) => {
    try {
        console.log(req.body);
        if (!req?.body?.format) throw Error("No format was provided! Please use the `format` tag.");
        const bufferSplit = req.body.base64.split(";base64,");
        //const previousFormat = bufferSplit.shift(); // e.g. data:image/png
        const previousBase64 = bufferSplit.pop(); // the string of letters after the content type
        var newFormat = null;
        const buffer = Buffer.from(previousBase64, "base64");
        const format = req?.body?.format || "jpeg";
        const grayscale = await sharp(buffer).toFormat(format).grayscale().toBuffer();
        for (const [key, value] of Object.entries(base64types)) {
            if (value.includes(format)) {
                newFormat = value;
            }
        }
        res.send({
            success: true,
            format: format,
            base64: (newFormat || "data:image/" + format + ";base64,") + grayscale.toString("base64")
        });
    } catch (e) {
        res.status(400).send({
            success: false,
            error: e.toString() || "Generic"
        });
        console.log("Failed to convert: " + e);
    }
});

app.post("/images/convert/upload", uplMulter.single("file"), async (req, res) => {
    try {
        if (!req.file) throw Error("No file was uploaded! Please check that you have uploaded a file correctly.");
        if (!req.body.format) throw Error("No target format was specified! Please choose a compatible format.");
        const format = req.body.format.toLowerCase();
        if (!base64types[format]) throw Error("The chosen file format is not compatible / does not exist!");
        const buffer = await sharp(req.file.buffer).toFormat(format).toBuffer();
        const basePrefix = base64types[format] || "data:image/" + format + ";base64,";
        res.send({success: true, format, base64: basePrefix + buffer.toString("base64")});
    } catch (e) {
        res.status(400).send({success: false, error: e.toString() || "No valid error was provided!"});
        console.log(kleur.red("[BitRender] Error on /images/convert/upload - " + e));
    }
});

// TODO: fix
app.post("/images/upload", uplMulter.single("file"), async (req, res) => {
    try {
        const format = req.file.format;
        const basePrefix = base64types[format] || "data:image/" + format + ";base64,";
        const base64 = basePrefix + req.file.buffer.toString("base64");
        sql.query("INSERT INTO images (filename, format, data) VALUES (?, ?, ?)", [req.file.originalname, req.file.format, base64], (err, result) => {
            res.send({
                success: true
            });
        });
    } catch (e) {
        res.status(400).send({success: false, error: e.toString() || "No valid error was provided!"});
        console.log(kleur.red("[BitRender] Error on /images/upload - " + e));
    }
});

app.post("/images/upload/base64", async (req, res) => {
    try {
        const timeStart = Date.now();
        sql.query("INSERT INTO images (filename, format, data) VALUES (?, ?, ?)", [req.body.name, req.body.format, req.body.base64], (err, result) => {
            if (err) throw Error(err);
            res.send({success: true, id: result?.insertId, time_taken: (Date.now() - timeStart) + "ms"});
            console.log("✱  Uploaded file to database named \"" + req.body.name + "\" with format " + req.body.format + " via Base64!");
        })
    } catch (e) {
        res.status(400).send({success: false, error: e.toString() || "No valid error was provided!"});
        console.log(kleur.red("[BitRender] Error on /images/upload - " + e));
    }
})


// TODO: add JWT auth
app.delete("/images/delete/:id", async (req, res) => {
    const imgId = req.params.id;
    sql.query("SELECT * FROM images WHERE id = ?", [imgId], (err, rows) => {
        if (err) {
            console.log(kleur.red("[BitRender] Error on /images/delete/:id - " + err));
            return res.status(500).send({success: false, error: "Database error. Please contact an admin for more help."});
        }
        if (rows.length == 0) return res.status(404).send({success: false, error: "Image not found!"});
        sql.query("DELETE FROM images WHERE id = ?", [imgId], (err, rows) => {
            if (err) {
                console.log(kleur.red("[BitRender] Error on /images/delete/:id - " + err));
                return res.status(500).send({success: false, error: "Deleting image failed. Please contact an admin for more help."});
            }
            return res.send({success: true, response: "Image with " + imgId + " successfully deleted."});
        })
    })
})

app.get("/images/formats", async (req, res) => {
    try {
        res.send({success: true, formats: base64types});
    } catch (e) {
        res.status(400).send({
            success: false,
            error: e.toString() || "Generic"
        });
        console.log("Failed to convert: " + e);
    }
});

function getBase64FromID(id, callback) {
    sql.query("SELECT * FROM images WHERE id = ?", [id], async (err, resp) => {
        if (err) return callback(err);
        if (!resp[0]) return callback(new Error("Image not found!"));
        if (err) throw Error("Database error. Please contact an admin for more help.");
        const img = resp[0];
        const base64 = img.data.toString().replace(/^data:.+;base64,/, "");
        callback(null, {buffer: Buffer.from(base64, "base64"), format: img.format});
    });
}

app.get("/images/:id/raw", async (req, res) => {
    if (!req.params.id) throw Error("No valid image ID!");
    try {
        getBase64FromID(req.params.id, (err, result) => {
            if (err) return res.status(400).send({success: false, error: err.toString()});
            res.setHeader("Content-Type", "image/" + result.format);
            res.send(result.buffer);
        })
    } catch (e) {
        res.status(400).send({success: false, error: e.toString() || "No valid error was provided!"});
        console.log(kleur.red("[BitRender] Error on /images/:id - " + e));
    }
})

app.use("/docs", swaggerUi.serve, swaggerUi.setup(openApiSpecification, {explorer: true}));
const port = process.env.PORT || 3000;

function log(text) {
    console.log(kleur.cyan(text));
}