const express = require("express");
const kleur = require("kleur");
const swaggerUi = require("swagger-ui-express"); // for later
const mysql = require("mysql");
const sharp = require("sharp");
const app = express();
app.use(express.json());

var sql = mysql.createConnection({
    host: "",
    user: "",
    password: "",
});

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

app.post("/images/convert", async (req, res) => {
    try {
        const buffer = Buffer.from(req.body.buffer.split(";base64,").pop(), "base64");
        const grayscale = await sharp(buffer).grayscale().to();
        res.send({
            success: true,
            buffer: grayscale
        });
    } catch (e) {
        res.send({
            success: false,
            error: e.toString() || "Generic"
        });
        console.log("Failed to convert: " + e);
    }
    
})
const port = process.env.PORT || 3000;
app.listen(port, () => {
    log(`
▄▄▄▄· ▪  ▄▄▄▄▄▄▄▄  ▄▄▄ . ▐ ▄ ·▄▄▄▄  ▄▄▄ .▄▄▄  
▐█ ▀█▪██ •██  ▀▄ █·▀▄.▀·•█▌▐███▪ ██ ▀▄.▀·▀▄ █·
▐█▀▀█▄▐█· ▐█.▪▐▀▀▄ ▐▀▀▪▄▐█▐▐▌▐█· ▐█▌▐▀▀▪▄▐▀▀▄ 
██▄▪▐█▐█▌ ▐█▌·▐█•█▌▐█▄▄▌██▐█▌██. ██ ▐█▄▄▌▐█•█▌
·▀▀▀▀ ▀▀▀ ▀▀▀ .▀  ▀ ▀▀▀ ▀▀ █▪▀▀▀▀▀•  ▀▀▀ .▀  ▀
        `);
    console.log(" - Listening on " + kleur.underline("127.0.0.1:" + port) + " | Press Ctrl+C / Cmd+C to exit (^C)");
});

function log(text) {
    console.log(kleur.cyan(text));
}