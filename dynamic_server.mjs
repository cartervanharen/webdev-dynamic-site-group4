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
    let asyncCount = 0;
    let dbRows1 = null;
    let dbRows2 = null;
    let dbRows3 = null;
    let fileData = null;

    let sendResponse = function () {
        fs.readFile(path.join(template, 'index.html'), {encoding: 'utf8'}, (err, data) => {
            
            let li_string = '';
            for (let i=0; i < dbRows1.length; i++) {
                li_string += '<li><a href="/location/' + dbRows1[i].locationSource + '">' + dbRows1[i].locationSource + '</a></li>';
            }

            let li_string2 = '';
            for (let i=0; i < dbRows2.length; i++) {
                li_string2 += '<li><a href="/magnitude/' + dbRows2[i].mag + '">' + dbRows2[i].mag + '</a></li>';
            }

            let li_string3 = '';
            for (let i=0; i < dbRows3.length; i++) {
                li_string3 += '<li><a href="/depth/' + dbRows3[i].depth + '">' + dbRows3[i].depth + '</a></li>';
            }
                      
            response = data.replace('$$$LOCATION_LIST$$$', li_string);
            response = response.replace('$$$MAGNITUDE_LIST$$$', li_string2);
            response = response.replace('$$$DEPTH_LIST$$$', li_string3);
            res.status(200).type('html').send(response);
        });
    }

    let sql = 'SELECT DISTINCT locationSource FROM Earthquakes ORDER BY locationSource';

    let sql2 = 'SELECT DISTINCT mag FROM Earthquakes LIMIT 50';

    let sql3 = 'SELECT DISTINCT depth FROM Earthquakes LIMIT 50';

    let response;

    // list out locations
    db.all(sql, [], (err, rows) => {
        if (err) {
            res.status(500).type('txt').send('SQL Error');
        }
        else {
            dbRows1 = rows;
            asyncCount++;
            if (asyncCount == 3) {
                sendResponse();
            }
        }
     });

     // list out magnitudes
     db.all(sql2, [], (err, rows) => {
        if (err) {
            res.status(500).type('txt').send('SQL Error');
        }
        else {
            dbRows2 = rows;
            asyncCount++;
            if (asyncCount == 3) {
                sendResponse();
            }
        }
     });

    // list out depths 
    db.all(sql3, [], (err, rows) => {
        if (err) {
            res.status(500).type('txt').send('SQL Error');
        }
        else {
            dbRows3 = rows;
            asyncCount++;
            if (asyncCount == 3) {
                sendResponse();
            }
        }
     });
});

// three dynamic routes ----------------------------------------------------
// by location
app.get('/location/:loc', (req, res) => {
    let currentLocation = req.params.loc;
    let sql = 'SELECT * FROM Earthquakes WHERE locationSource == ?';
    db.all(sql, [currentLocation], (err, rows) => {
        if (err) {
            res.status(500).type('txt').send('SQL Error');
        }
        else {
            
            fs.readFile(path.join(template, 'location.html'), {encoding: 'utf8'}, (err, data) => {
                let tr_string = '';
                let location = '';
                for (let i=0; i < rows.length; i++) {
                    tr_string += '<tr><td>' + rows[i].time + '</td><td>' + rows[i].latitude + '</td><td>' + rows[i].longitude + '</td><td>' + rows[i].depth + '</td><td>' + rows[i].mag + '</td><td>' + rows[i].place + '</td><td>' + rows[i].type + '</td></tr>';
                    location = rows[i].locationSource;
                }
                let response = data.replace('$$$LOCATION_ROWS$$$', tr_string);
                response = response.replace('$$$LOCATION$$$', location);
                res.status(200).type('html').send(response);
            });

        }
    });
});

// by magnitude
app.get('/magnitude/:mag', (req, res) => {
    let currentMagnitude = req.params.mag;
    let sql = 'SELECT * FROM Earthquakes WHERE mag == ?';
    db.all(sql, [currentMagnitude], (err, rows) => {
        if (err) {
            res.status(500).type('txt').send('SQL Error');
        }
        else {

            fs.readFile(path.join(template, 'magnitude.html'), {encoding: 'utf8'}, (err, data) => {
                let tr_string = '';
                let magnitude = '';
                for (let i=0; i < rows.length; i++) {
                    tr_string += '<tr><td>' + rows[i].time + '</td><td>' + rows[i].latitude + '</td><td>' + rows[i].longitude + '</td><td>' + rows[i].depth + '</td><td>' + rows[i].place + '</td><td>' + rows[i].type + '</td><td>' + rows[i].locationSource +'</td></tr>';
                    magnitude = rows[i].mag;
                }
                let response = data.replace('$$$MAGNITUDE_ROWS$$$', tr_string);
                response = response.replace('$$$MAGNITUDE$$$', magnitude);
                res.status(200).type('html').send(response);
            });

        }
    });
});

// by depth
app.get('/depth/:dep', (req, res) => {
    let currentDepth = req.params.dep;
    let sql = 'SELECT * FROM Earthquakes WHERE depth == ?';
    db.all(sql, [currentDepth], (err, rows) => {
        if (err) {
            res.status(500).type('txt').send('SQL Error');
        }
        else {

             fs.readFile(path.join(template, 'depth.html'), {encoding: 'utf8'}, (err, data) => {
                let tr_string = '';
                let depth = '';
                for (let i=0; i < rows.length; i++) {
                    tr_string += '<tr><td>' + rows[i].time + '</td><td>' + rows[i].latitude + '</td><td>' + rows[i].longitude + '</td><td>' + rows[i].mag + '</td><td>' + rows[i].place + '</td><td>' + rows[i].type + '</td><td>' + rows[i].locationSource +'</td></tr>';
                    depth = rows[i].depth;
                }
                let response = data.replace('$$$DEPTH_ROWS$$$', tr_string);
                response = response.replace('$$$DEPTH$$$', depth);
                res.status(200).type('html').send(response);
            });

        }
    });
});

app.listen(port, () => {
    console.log('Now listening on port ' + port);
});
