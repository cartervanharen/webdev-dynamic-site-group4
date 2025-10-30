import * as fs from 'node:fs';
import * as path from 'node:path';
import * as url from 'node:url';
import { default as express } from 'express';
import { default as sqlite3 } from 'sqlite3';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

const port = 8080;
const root = path.join(__dirname, 'public');
const template = path.join(__dirname, 'templates');

const SQL_GET_ALL_LOCATIONS = 'SELECT DISTINCT locationSource FROM Earthquakes ORDER BY locationSource';
const SQL_GET_EARTHQUAKES_BY_LOCATION = 'SELECT * FROM Earthquakes WHERE locationSource == ?';
const SQL_GET_EARTHQUAKES_BY_MAGNITUDE_RANGE = 'SELECT * FROM Earthquakes WHERE mag >= ? AND mag < ?';
const SQL_GET_EARTHQUAKES_BY_DEPTH_RANGE = 'SELECT * FROM Earthquakes WHERE depth >= ? AND depth < ?';

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
    let response;

    let sendResponse = function () {
        fs.readFile(path.join(template, 'index.html'), {encoding: 'utf8'}, (err, data) => {
            
            let li_string = '';
            for (let i=0; i < dbRows1.length; i++) {
                li_string += '<li><a href="/location/' + dbRows1[i].locationSource + '">' + dbRows1[i].locationSource + '</a></li>';
            }

            let li_string2 = '';
            for (let magGroup = 1; magGroup <= 9; magGroup++) {
                li_string2 += '<li><a href="/magnitude/' + magGroup + '">Magnitude ' + magGroup + '</a></li>';
            }

            let li_string3 = '';
            li_string3 += '<li><a href="/depth/1">Shallow (0-70 km)</a></li>';
            li_string3 += '<li><a href="/depth/2">Intermediate (70-300 km)</a></li>';
            li_string3 += '<li><a href="/depth/3">Deep (300-700 km)</a></li>';
                      
            response = data.replace('$$$LOCATION_LIST$$$', li_string);
            response = response.replace('$$$MAGNITUDE_LIST$$$', li_string2);
            response = response.replace('$$$DEPTH_LIST$$$', li_string3);
            res.status(200).type('html').send(response);
        });
    }

    let sql = SQL_GET_ALL_LOCATIONS;

    // list out locations
    db.all(sql, [], (err, rows) => {
        if (err) {
            res.status(500).type('txt').send('SQL Error');
        }
        else {
            dbRows1 = rows;
            asyncCount++;
            if (asyncCount == 1) {
                sendResponse();
            }
        }
     });
});

// three dynamic routes ----------------------------------------------------
// by location
app.get('/location/:loc', (req, res) => {
    let currentLocation = req.params.loc;

    let sqlAllLoc = SQL_GET_ALL_LOCATIONS;

    // get ordered list of all distinct locations (use this to compute prev/next)
    db.all(sqlAllLoc, [], (err, allLocations) => {
        if (err) {
            res.status(500).type('txt').send('SQL Error');
        }
        else {

            // find the index of the current location in that ordered list
            let indexOfCurrentLocation = allLocations.findIndex(row => row.locationSource === currentLocation);

            // if the requested location is not in the list -> 404
            if (indexOfCurrentLocation === -1) {
                res.status(404).type('txt').send('Location not found: ' + currentLocation);
                return;
            }

            let prevLoc;
            let nextLoc;

            // figure out previous location
            if (indexOfCurrentLocation > 0) {
                // if we are NOT at the first item, just go one back
                prevLoc = allLocations[indexOfCurrentLocation - 1].locationSource;
            } else {
                // if we ARE at the first item, wrap around to the last one
                prevLoc = allLocations[allLocations.length - 1].locationSource;
            }

            // figure out next location
            if (indexOfCurrentLocation < allLocations.length - 1) {
                // if we are NOT at the last item, just go one forward
                nextLoc = allLocations[indexOfCurrentLocation + 1].locationSource;
            } else {
                // if we ARE at the last item, wrap around to the first one
                nextLoc = allLocations[0].locationSource;
            }

            let sql = SQL_GET_EARTHQUAKES_BY_LOCATION;
            db.all(sql, [currentLocation], (err, rows) => {
                if (err) {
                    res.status(500).type('txt').send('SQL Error');
                }
                else {
                    
                    fs.readFile(path.join(template, 'location.html'), {encoding: 'utf8'}, (err, data) => {
                        let tr_string = '';
                        let location = '';
                        
                        let magnitudes = [];
                        let depths = [];
                        
                        for (let i=0; i < rows.length; i++) {
                            tr_string += '<tr><td>' + rows[i].time + '</td><td>' + rows[i].latitude + '</td><td>' + rows[i].longitude + '</td><td>' + rows[i].depth + '</td><td>' + rows[i].mag + '</td><td>' + rows[i].place + '</td><td>' + rows[i].type + '</td></tr>';
                            location = rows[i].locationSource;
                            magnitudes.push(rows[i].mag);
                            depths.push(rows[i].depth);
                        }

                        // build the prev/next links 
                        let prevLink = '<a href="/location/' + prevLoc + '">Previous Location</a>';
                        let nextLink = '<a href="/location/' + nextLoc + '">Next Location</a>';

                        let homeLink = '<a href="/">Back to Home</a>';

                        let response = data.replace('$$$LOCATION_ROWS$$$', tr_string);
                        response = response.replace('$$$LOCATION$$$', location);
                        response = response.replace('$$$TOTAL_COUNT$$$', rows.length);
                        response = response.replace('$$$PREV_LINK$$$', prevLink);
                        response = response.replace('$$$NEXT_LINK$$$', nextLink);
                        response = response.replace('$$$HOME_LINK$$$', homeLink);
                        response = response.replace('$$$MAGNITUDES$$$', JSON.stringify(magnitudes));
                        response = response.replace('$$$DEPTHS$$$', JSON.stringify(depths));
                        res.status(200).type('html').send(response);
                    });

                }
            });

        }
     });
});

// by magnitude
app.get('/magnitude/:mag', (req, res) => {
    let magGroup = parseInt(req.params.mag);

    if (magGroup < 1 || magGroup > 9 || isNaN(magGroup)) {
        res.status(404).type('txt').send('Magnitude group not found: ' + req.params.mag);
        return;
    }

    let lowerBound = magGroup;
    let upperBound = magGroup + 1;

    let prevMag = magGroup > 1 ? magGroup - 1 : 9;
    let nextMag = magGroup < 9 ? magGroup + 1 : 1;

    let sql = SQL_GET_EARTHQUAKES_BY_MAGNITUDE_RANGE;
    db.all(sql, [lowerBound, upperBound], (err, rows) => {
        if (err) {
            res.status(500).type('txt').send('SQL Error');
        }
        else {
            fs.readFile(path.join(template, 'magnitude.html'), {encoding: 'utf8'}, (err, data) => {
                let tr_string = '';
                let magnitudeRange = 'Magnitude ' + lowerBound + '.0 - ' + upperBound + '.0 (exclusive)';
                
                let depths = [];
                let magnitudes = [];
                
                for (let i=0; i < rows.length; i++) {
                    tr_string += '<tr><td>' + rows[i].time + '</td><td>' + rows[i].latitude + '</td><td>' + rows[i].longitude + '</td><td>' + rows[i].depth + '</td><td>' + rows[i].mag + '</td><td>' + rows[i].place + '</td><td>' + rows[i].type + '</td><td>' + rows[i].locationSource +'</td></tr>';
                    
                    depths.push(rows[i].depth);
                    magnitudes.push(rows[i].mag);
                }

                // build the prev/next links 
                let prevLink = '<a href="/magnitude/' + prevMag + '">Previous Magnitude</a>';
                let nextLink = '<a href="/magnitude/' + nextMag + '">Next Magnitude</a>';

                let homeLink = '<a href="/">Back to Home</a>';

                let imageSrc = '/images/magnitudeChartM' + magGroup + '.png';
                let imageAlt = 'An image of a magnitude of ' + magGroup + '.';

                let response = data.replace('$$$MAGNITUDE_ROWS$$$', tr_string);
                response = response.replace('$$$MAGNITUDE$$$', magnitudeRange);
                response = response.replace('$$$TOTAL_COUNT$$$', rows.length);
                response = response.replace('$$$PREV_LINK$$$', prevLink);
                response = response.replace('$$$NEXT_LINK$$$', nextLink);
                response = response.replace('$$$HOME_LINK$$$', homeLink);
                response = response.replace('$$$MAGNITUDE_IMAGE_SRC$$$', imageSrc);
                response = response.replace('$$$MAGNITUDE_IMAGE_ALT$$$', imageAlt);
                response = response.replace('$$$MAGNITUDES$$$', JSON.stringify(magnitudes));
                res.status(200).type('html').send(response);
            });
        }
    });
});

// by depth
app.get('/depth/:dep', (req, res) => {
    let depthGroup = parseInt(req.params.dep);

    if (depthGroup < 1 || depthGroup > 3 || isNaN(depthGroup)) {
        res.status(404).type('txt').send('Depth group not found: ' + req.params.dep);
        return;
    }

    let lowerBound, upperBound, depthLabel;
    
    // Define depth ranges
    if (depthGroup === 1) {
        lowerBound = 0;
        upperBound = 70;
        depthLabel = 'Shallow (0-70 km)';
    } else if (depthGroup === 2) {
        lowerBound = 70;
        upperBound = 300;
        depthLabel = 'Intermediate (70-300 km)';
    } else { // depthGroup === 3
        lowerBound = 300;
        upperBound = 700;
        depthLabel = 'Deep (300-700 km)';
    }

    let prevDepth = depthGroup > 1 ? depthGroup - 1 : 3;
    let nextDepth = depthGroup < 3 ? depthGroup + 1 : 1;

    let sql = SQL_GET_EARTHQUAKES_BY_DEPTH_RANGE;
    db.all(sql, [lowerBound, upperBound], (err, rows) => {
        if (err) {
            res.status(500).type('txt').send('SQL Error');
        }
        else {
            fs.readFile(path.join(template, 'depth.html'), {encoding: 'utf8'}, (err, data) => {
                let tr_string = '';
                
                // Prepare data for charts
                let depths = [];
                
                for (let i=0; i < rows.length; i++) {
                    tr_string += '<tr><td>' + rows[i].time + '</td><td>' + rows[i].latitude + '</td><td>' + rows[i].longitude + '</td><td>' + rows[i].depth + '</td><td>' + rows[i].mag + '</td><td>' + rows[i].place + '</td><td>' + rows[i].type + '</td><td>' + rows[i].locationSource +'</td></tr>';
                    depths.push(rows[i].depth);
                }

                // build the prev/next links 
                let prevLink = '<a href="/depth/' + prevDepth + '">Previous Depth Group</a>';
                let nextLink = '<a href="/depth/' + nextDepth + '">Next Depth Group</a>';

                let homeLink = '<a href="/">Back to Home</a>';

                let imageSrc = '/images/depth' + depthGroup + '.png';
                let imageAlt = 'An image of ' + depthLabel + ' depth.';

                let response = data.replace('$$$DEPTH_ROWS$$$', tr_string);
                response = response.replace('$$$DEPTH$$$', depthLabel);
                response = response.replace('$$$TOTAL_COUNT$$$', rows.length);
                response = response.replace('$$$PREV_LINK$$$', prevLink);
                response = response.replace('$$$NEXT_LINK$$$', nextLink);
                response = response.replace('$$$HOME_LINK$$$', homeLink);
                response = response.replace('$$$MAGNITUDE_IMAGE_SRC$$$', imageSrc);
                response = response.replace('$$$MAGNITUDE_IMAGE_ALT$$$', imageAlt);
                response = response.replace('$$$DEPTHS$$$', JSON.stringify(depths));
                res.status(200).type('html').send(response);
            });
        }
    });
});

app.listen(port, () => {
    console.log('Now listening on port ' + port);
});
