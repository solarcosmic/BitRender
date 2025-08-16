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
const sanitize = require("sanitize-filename");
const app = express();
app.use(express.json({limit: "3mb"}));

var settings = {}
const start = Date.now();
try {
    const settings_yml = yaml.load(fs.readFileSync(path.join(__dirname, "settings.yml")));
    settings = settings_yml;
    kleur.enabled = settings?.misc?.log_coloring || false
} catch (e) {
    welcomePrint();
    console.log(kleur.red("Failed to process settings.yml - " + e.toString()));
    return process.exit();
}
welcomePrint();

const port = settings?.general?.port || 3000;

var sql = mysql.createConnection({
    host: settings?.database?.host || "127.0.0.1",
    user: settings?.database?.user || "root",
    database: settings?.database?.db_name || "bitrender",
    password: settings?.database?.password || "",
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

const swaggerOptions = {
    definition: {
        openapi: "3.0.0",
        info: {
            title: "BitRender",
            version: "1.0.0", // to replace with manifest version
            description: "An API that lets you convert, store, delete, and retrieve images!",
            license: {
                name: "MIT License",
                url: "https://opensource.org/licenses/MIT"
            }
        },
    },
    apis: ["./index.js"]
};
const openApiSpecification = swaggerJs(swaggerOptions);
const uplMulter = multer({storage: multer.memoryStorage()});

function welcomePrint() {
    log(settings?.misc?.ascii ? `
                  Welcome to
▄▄▄▄· ▪  ▄▄▄▄▄▄▄▄  ▄▄▄ . ▐ ▄ ·▄▄▄▄  ▄▄▄ .▄▄▄  
▐█ ▀█▪██ •██  ▀▄ █·▀▄.▀·•█▌▐███▪ ██ ▀▄.▀·▀▄ █·
▐█▀▀█▄▐█· ▐█.▪▐▀▀▄ ▐▀▀▪▄▐█▐▐▌▐█· ▐█▌▐▀▀▪▄▐▀▀▄ 
██▄▪▐█▐█▌ ▐█▌·▐█•█▌▐█▄▄▌██▐█▌██. ██ ▐█▄▄▌▐█•█▌
·▀▀▀▀ ▀▀▀ ▀▀▀ .▀  ▀ ▀▀▀ ▀▀ █▪▀▀▀▀▀•  ▀▀▀ .▀  ▀
` : `Welcome to BitRender.`);
}

sql.connect(function(err) {
    if (err) {
        console.log(kleur.red("Database error occurred - " + err));
        return process.exit();
    }
    console.log(kleur.green("✱  Connected to database! - " + settings?.database?.db_name + "@" + settings?.database?.host + " as " + settings?.database?.user));
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

function isBase64(str) {
    return /^data:image\/[a-z]+;base64,[A-Za-z0-9+/]+={0,2}$/.test(str);
}

/**
 * @openapi
 * /images/convert/base64:
 *   post:
 *     description: |
 *       Converts a Base64 image string into a different format (jpg, png, webp, ...).
 * 
 *       You can call [**GET /images/formats**](#/default/get_images_formats) to return a list of formats that are officially supported, but it may also be possible to use the formats [Sharp](https://sharp.pixelplumbing.com/api-output/) supports.
 * 
 *       **NOTE:** On Swagger UI, the Base64 response may be trimmed. Please consider using the API directly or a frontend implementation.
 *     responses:
 *       200:
 *         description: Returns the converted image in Base64 format.
 *       400:
 *         description: Requirement not met or client/server side error (e.g. incorrect format, uncomplete Base64 string)
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - format
 *               - base64
 *             properties:
 *               format:
 *                 type: string
 *                 description: The format you want to convert the image to (jpg, png, ...)
 *               base64:
 *                 type: string
 *                 description: The Base64 string you want to convert. Usually begins with "data:image/"
 */
app.post("/images/convert/base64", async (req, res) => {
    try {
        console.log(req.body);
        if (!req?.body?.format) throw Error("No format was provided! Please use the `format` tag.");
        if (!isBase64(req.body.base64)) throw Error("Base64 string is not valid!");
        const bufferSplit = req.body.base64.split(";base64,");
        //const previousFormat = bufferSplit.shift(); // e.g. data:image/png
        const previousBase64 = bufferSplit.pop(); // the string of letters after the content type
        var newFormat = null;
        const buffer = Buffer.from(previousBase64, "base64");
        const format = req?.body?.format.toLowerCase() || "jpeg";
        if (!base64types[format]) throw Error("Invalid format!");
        const grayscale = await sharp(buffer).toFormat(format).toBuffer();
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

/**
 * @openapi
 * /images/convert/upload:
 *   post:
 *     description: |
 *       Allows you to upload an image file and convert it into a different format (jpg, png, webp, ...). Returns the image in Base64.
 * 
 *       **NOTE:** On Swagger UI, the Base64 response may be trimmed. Please consider using the API directly or a frontend implementation.
 *     responses:
 *       200:
 *         description: Returns the converted image in Base64 format.
 *       400:
 *         description: Requirement not met or client/server side error (e.g. incorrect format, path error).
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - format
 *               - file
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: The image file. Must be compatible with the format list.
 *               format:
 *                 type: string
 *                 description: The format you want to convert the image to (jpg, png, ...)
 */
app.post("/images/convert/upload", uplMulter.single("file"), async (req, res) => {
    try {
        if (!req.file) throw Error("No file was uploaded! Please check that you have uploaded a file correctly.");
        if (!req.body.format) throw Error("No target format was specified! Please choose a compatible format.");
        var format = req.body.format.toLowerCase();
        if (format.toLowerCase() == "jpg") format = "jpeg";
        if (!base64types[format]) throw Error("The chosen file format is not compatible / does not exist!");
        const buffer = await sharp(req.file.buffer).toFormat(format).toBuffer();
        const basePrefix = base64types[format] || "data:image/" + format + ";base64,";
        res.send({success: true, format, base64: basePrefix + buffer.toString("base64")});
    } catch (e) {
        res.status(400).send({success: false, error: e.toString() || "No valid error was provided!"});
        console.log(kleur.red("[BitRender] Error on /images/convert/upload - " + e));
    }
});

/**
 * @openapi
 * /images/upload:
 *   post:
 *     description: |
 *       Allows you to upload an image file onto the database.
 *     responses:
 *       200:
 *         description: Returns the ID of the newly created image file.
 *       400:
 *         description: Requirement not met or client/server side error (e.g. incorrect format, path error).
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: The image file. Must be compatible with the format list.
 */
// TODO: fix
app.post("/images/upload", uplMulter.single("file"), async (req, res) => {
    try {
        const format = req.file.mimetype.split("/")[1];
        const basePrefix = base64types[format] || "data:image/" + format + ";base64,";
        const base64 = basePrefix + req.file.buffer.toString("base64");
        sql.query("INSERT INTO images (filename, format, data) VALUES (?, ?, ?)", [sanitize(req.file.originalname), req.file.mimetype.split("/")[1], base64], (err, result) => {
            res.send({
                success: true,
                id: result?.insertId
            });
        });
    } catch (e) {
        res.status(400).send({success: false, error: e.toString() || "No valid error was provided!"});
        console.log(kleur.red("[BitRender] Error on /images/upload - " + e));
    }
});

/**
 * @openapi
 * /images/upload/base64:
 *   post:
 *     description: |
 *       Uploads the Base64 image string to the database.
 *     responses:
 *       200:
 *         description: Returns the ID of the newly created image file and the time taken to upload.
 *       400:
 *         description: Requirement not met or client/server side error (e.g. incorrect format, uncomplete Base64 string)
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - format
 *               - base64
 *             properties:
 *               name:
 *                 type: string
 *                 description: The name of the image file.
 *               format:
 *                 type: string
 *                 description: The format you want to convert the image to (jpg, png, ...).
 *               base64:
 *                 type: string
 *                 description: The Base64 string you want to convert. Usually begins with "data:image/".
 */
app.post("/images/upload/base64", async (req, res) => {
    try {
        const timeStart = Date.now();
        sql.query("INSERT INTO images (filename, format, data) VALUES (?, ?, ?)", [sanitize(req.body.name), req.body.format, req.body.base64], (err, result) => {
            if (err) throw Error(err);
            res.send({success: true, id: result?.insertId, time_taken: (Date.now() - timeStart) + "ms"});
            console.log("✱  Uploaded file to database named \"" + sanitize(req.body.name) + "\" with format " + req.body.format + " via Base64!");
        })
    } catch (e) {
        res.status(400).send({success: false, error: e.toString() || "No valid error was provided!"});
        console.log(kleur.red("[BitRender] Error on /images/upload - " + e));
    }
})

/**
 * @openapi
 * /images/delete/{id}:
 *   delete:
 *     description: Deletes an image from the database.
 *     responses:
 *       200:
 *         description: Returns the ID of the deleted image file and a response.
 *       500:
 *         description: Server side error (e.g. failed to delete).
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the image you want to fetch.
 */
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
            return res.send({success: true, id: imgId, response: "Image with " + imgId + " successfully deleted."});
        })
    })
})

/**
 * @openapi
 * /images/formats:
 *   get:
 *     description: Returns a list of formats officially supported by BitRender.
 *     responses:
 *       200:
 *         description: Returns an array of formats with their respective Base64 headers.
 *       500:
 *         description: Server side error.
 */
app.get("/images/formats", async (req, res) => {
    try {
        res.send({success: true, formats: base64types});
    } catch (e) {
        res.status(500).send({
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
        callback(null, {base64: base64, pureBase64: resp[0].data.toString(), format: img.format});
    });
}

/**
 * @openapi
 * /images/{id}/raw:
 *   get:
 *     description: Returns an image from the database (Content-Type - Image).
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the image you want to fetch.
 *     responses:
 *       200:
 *         description: Returns an image from the database (Content-Type - Image). No other content.
 *         content:
 *           image/*:
 *             schema:
 *               type: string
 *               format: binary
 *       400:
 *         description: Requirement not met or client/server side error (e.g. ID not found).
 *     
 */
app.get("/images/:id/raw", async (req, res) => {
    if (!req.params.id) throw Error("No valid image ID!");
    try {
        getBase64FromID(req.params.id, (err, result) => {
            if (err) return res.status(400).send({success: false, error: err.toString()});
            res.setHeader("Content-Type", "image/" + result.format);
            res.send(Buffer.from(result.base64, "base64"));
        })
    } catch (e) {
        res.status(400).send({success: false, error: e.toString() || "No valid error was provided!"});
        console.log(kleur.red("[BitRender] Error on /images/:id - " + e));
    };
});

/**
 * @openapi
 * /images/{id}:
 *   get:
 *     description: Returns an image in Base64 from the database.
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the image you want to fetch.
 *     responses:
 *       200:
 *         description: Returns the image from the database in Base64 format.
 *       400:
 *         description: Requirement not met or client/server side error (e.g. ID not found).
 *     
 */
app.get("/images/:id", async (req, res) => {
    try {
        if (!req.params.id) throw Error("No valid image ID!");
        getBase64FromID(req.params.id, (err, result) => {
            if (err) return res.status(400).send({success: false, error: err.toString()});
            res.send({success: true, id: req.params.id, format: result.format, base64: result.pureBase64.toString()});
        })
    } catch (e) {
        res.status(400).send({success: false, error: e.toString() || "No valid error was provided!"});
        console.log(kleur.red("[BitRender] Error on /images/:id - " + e));
    };
})

/**
 * @openapi
 * /images/{id}/rename:
 *   put:
 *     description: Renames an image in the database.
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the image you want to fetch.
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 description: The name you want to change the image's file name to.
 *     responses:
 *       200:
 *         description: Returns the image from the database in Base64 format.
 *       400:
 *         description: Requirement not met or client/server side error (e.g. ID not found).
 *     
 */
app.put("/images/:id/rename", async (req, res) => {
    try {
        if (!req?.params?.id) throw Error("No valid image ID!");
        if (!req?.body?.name) throw Error("Please specify a name you want to rename the image to!");
        sql.query("SELECT * FROM images WHERE id = ?", [req.params.id], async (err, resp) => {
            if (err) throw Error("Database error. Please contact an admin for more help.");
            var name = sanitize(req.body.name);
            var prev_name = resp[0].filename;
            sql.query("UPDATE images SET filename = ?", [name], async (err, resp) => {
                if (err) throw Error("Database error while updating name. Please contact an admin for more help.");
                res.send({success: true, previous: prev_name, new: name})
            })
        });
    } catch (e) {
        res.status(400).send({success: false, error: e.toString() || "No valid error was provided!"});
        console.log(kleur.red("[BitRender] Error on /images/:id/rename - " + e));
    }
})

/**
 * @openapi
 * /images:
 *   get:
 *     description: |
 *       Returns an array of all the images stored in the database.
 * 
 *       URL queries are supported, for example:
 *       /images?limit=5&offset=7&base64=true
 *     parameters:
 *       - name: limit
 *         in: query
 *         required: false
 *         schema:
 *           type: integer
 *         description: Maximum amount of images to be returned.
 *       - name: offset
 *         in: query
 *         required: false
 *         schema:
 *           type: integer
 *         description: Amount of images to skip from the beginning.
 *       - name: base64
 *         in: query
 *         required: false
 *         schema:
 *           type: boolean
 *         description: If true, includes the Base64 along with the images.
 *     responses:
 *       200:
 *         description: Returns the image from the database in Base64 format.
 *       400:
 *         description: Requirement not met or client/server side error (e.g. ID not found).
 *     
 */
app.get("/images", async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        const offset = parseInt(req.query.offset) || 0;
        sql.query("SELECT * FROM images LIMIT ? OFFSET ?", [limit, offset], async (err, resp) => {
            const result = [];
            for (const item of resp) {
                const thing = {
                    id: item?.id,
                    filename: item?.filename,
                    format: item?.format,
                    created_at: item?.created_at
                };
                if (req?.query?.base64) {
                    if (req?.query?.base64.toLowerCase() == "true") thing["base64"] = "data:image/" + item?.format + ";base64," + item?.data.toString("base64");
                }
                result.push(thing);
            };
            res.send({success: true, limit, offset, images: result});
        });
    } catch (e) {
        res.status(500).send({success: false, error: e.toString() || "No valid error was provided!"});
        console.log(kleur.red("[BitRender] Error on /images/:id/rename - " + e));
    }
})

app.use("/docs", swaggerUi.serve, swaggerUi.setup(openApiSpecification, {explorer: true}));

function log(text) {
    console.log(kleur.cyan(text));
}