const express = require("express");
const kleur = require("kleur");
const swaggerUi = require("swagger-ui-express"); // for later
const mysql = require("mysql");
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