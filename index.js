const express = require("express");
const multer = require("multer");
const path = require("path");
const kleur = require("kleur");
const swaggerUi = require("swagger-ui-express"); // for later
const swaggerJs = require("swagger-jsdoc");
const mysql = require("mysql");
const sharp = require("sharp");
const app = express();
app.use(express.json());

var sql = mysql.createConnection({
    host: "",
    user: "",
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
    if (err) return console.log(kleur.red("[BitRender] Database error occurred - " + err));
    console.log("Connected!");
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
        res.send({
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
        res.send({success: false, error: e.toString() || "No valid error was provided!"});
        console.log(kleur.red("[BitRender] Error on /images/convert/upload - " + e));
    }
})

app.get("/images/formats", async (req, res) => {
    try {
        res.send({success: true, formats: base64types});
    } catch (e) {
        res.send({
            success: false,
            error: e.toString() || "Generic"
        });
        console.log("Failed to convert: " + e);
    }
});

app.use("/docs", swaggerUi.serve, swaggerUi.setup(openApiSpecification, {explorer: true}));
const port = process.env.PORT || 3000;
app.listen(port, () => {
    log(`
▄▄▄▄· ▪  ▄▄▄▄▄▄▄▄  ▄▄▄ . ▐ ▄ ·▄▄▄▄  ▄▄▄ .▄▄▄  
▐█ ▀█▪██ •██  ▀▄ █·▀▄.▀·•█▌▐███▪ ██ ▀▄.▀·▀▄ █·
▐█▀▀█▄▐█· ▐█.▪▐▀▀▄ ▐▀▀▪▄▐█▐▐▌▐█· ▐█▌▐▀▀▪▄▐▀▀▄ 
██▄▪▐█▐█▌ ▐█▌·▐█•█▌▐█▄▄▌██▐█▌██. ██ ▐█▄▄▌▐█•█▌
·▀▀▀▀ ▀▀▀ ▀▀▀ .▀  ▀ ▀▀▀ ▀▀ █▪▀▀▀▀▀•  ▀▀▀ .▀  ▀
        `);
    console.log("✱  Listening on " + kleur.underline("127.0.0.1:" + port) + " | Press Ctrl+C / Cmd+C to exit (^C)");
});

function log(text) {
    console.log(kleur.cyan(text));
}