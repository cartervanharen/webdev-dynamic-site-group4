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

});

// three dynamic routes ------------------
// by location
app.get('/location/:location', (req, res) => {

});

// by magnitude
app.get('/magnitude/:magnitude', (req, res) => {
    
});

// by depth
app.get('/depth/:depth', (req, res) => {
    
});

app.listen(port, () => {
    console.log('Now listening on port ' + port);
});
