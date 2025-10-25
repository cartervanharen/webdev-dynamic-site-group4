import * as fs from 'node:fs';
import * as path from 'node:path';
import * as url from 'node:url';
import { default as express } from 'express';
import { default as sqlite3 } from 'sqlite3';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

const port = 8080;
const root = path.join(__dirname, 'public');
const template = path.join(__dirname, 'templates');

let app = express();
app.use(express.static(root));

// open the database file and keep it open for the lifetime of my server
const db = new sqlite3.Database('./earthquakes.sqlite3', sqlite3.OPEN_READONLY, (err) => { 
    if (err) {
        console.log('Error connecting to database');
    }
    else {
        console.log('Successfully connected to database');
    }
}); 

// get the home page
app.get('/', (req, res) => {
    // read the template
    fs.readFile(path.join(template, 'index.html'), (err, data) => {            
        // send response
        res.status(200).type('html').send(data);
    });
});

// three dynamic routes ----------------------------------------------------
// by location
app.get('/location/:loc', (req, res) => {
    let sql = 'SELECT * FROM Earthquakes WHERE locationSource == ?';
    db.all(sql, [req.params.loc], (err, rows) => {
        if (err) {
            res.status(500).type('txt').send('SQL Error');
        }
        else {

        }
    });
});

// by magnitude
app.get('/magnitude/:mag', (req, res) => {
    let sql = 'SELECT * FROM Earthquakes WHERE mag == ?';
    db.all(sql, [req.params.mag], (err, rows) => {
        if (err) {
            res.status(500).type('txt').send('SQL Error');
        }
        else {

        }
    });
});

// by depth
app.get('/depth/:dep', (req, res) => {
    let sql = 'SELECT * FROM Earthquakes WHERE depth == ?';
    db.all(sql, [req.params.dep], (err, rows) => {
        if (err) {
            res.status(500).type('txt').send('SQL Error');
        }
        else {

        }
    });
});

app.listen(port, () => {
    console.log('Now listening on port ' + port);
});
