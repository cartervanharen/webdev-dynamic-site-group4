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
    // list out locations

    // list out magnitudes

    // list out depths

    let sql = 'SELECT DISTINCT locationSource FROM Earthquakes';
    console.log(sql);

    let sql2 = 'SELECT DISCTINCT mag FROM Earthquakes';

    let sql3 = 'SELECT DISTINCT depth FROM Earthquakes';
    
    db.all(sql, [], (err, rows) => {
        if (err) {
            res.status(500).type('txt').send('SQL Error');
        }
        else {

            fs.readFile(path.join(template, 'index.html'), {encoding: 'utf8'}, (err, data) => {
                let li_string = '';
                for (let i=0; i < rows.length; i++) {
                    li_string += '<li><a href="/location/' + rows[i].locationSource + '">' + rows[i].locationSource + '</a></li>';
                }

                let li_string2 = '';
                for (let i=0; i < rows.length; i++) {
                    li_string2 += '<li><a href="/magnitude/' + rows[i].mag + '">' + rows[i].mag + '</a></li>';
                }

                let li_string3 = '';
                for (let i=0; i < rows.length; i++) {
                    li_string3 += '<li><a href="/depth/' + rows[i].depth + '">' + rows[i].depth + '</a></li>';
                }


                let response = data.replace('$$$LOCATION_LIST$$$', li_string);
                response = response.replace('$$$MAGNITUDE_LIST$$$', li_string2);
                response = response.replace('$$$DEPTH_LIST$$$', li_string3);
                res.status(200).type('html').send(response);
            });
        }
     });


     /*
    // basic test to see if its working
     fs.readFile(path.join(template, 'index.html'), {encoding: 'utf8'}, (err, data) => {            
        // send response
        res.status(200).type('html').send(data);
    });*/
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
