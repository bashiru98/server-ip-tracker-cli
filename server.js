const dns = require('dns');
const request = require('request');

const __ipRegexStr = '(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.' +
                 '(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.' +
                 '(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.' +
                 '(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)';
const __ipRegex = new RegExp(__ipRegexStr);

const toRad = function(num) {
    return num * (Math.PI / 180);
};

const getIpInfo = function(server, callback) {
    const ipinfo = function(p, cb) {
        request('http://ipinfo.io/' + p, function(err, response, body) {
            var json;
            try {
                json = JSON.parse(body);
            } catch(error) {
                return cb(error, null);
            }
            cb(err, json);
        });
    };

    if (!server) {
        return ipinfo('json', callback);
    } else if (!server.match(__ipRegex)) {
        return dns.lookup(server, function(err, data) {
            ipinfo(data, callback);
        });
    } else {
        return ipinfo(server, callback);
    }
};

const ipDistance = function(lat1, lon1, lat2, lon2) {
    // Earth radius in km
    const r = 6371;

    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    lat1 = toRad(lat1);
    lat2 = toRad(lat2);

    const a = Math.sin(dLat / 2.0) * Math.sin(dLat / 2.0) + 
        Math.sin(dLon / 2.0) * Math.sin(dLon / 2.0) * Math.cos(lat1) * Math.cos(lat2);
    const c = 2.0 * Math.atan2(Math.sqrt(a), Math.sqrt(1.0 - a));
    return r * c;
};

const findDistance = function(ip1, ip2, callback) {
    let lat1, lon1, lat2, lon2;

    getIpInfo(ip1, function(err, data1) {
        var coords1 = data1.loc.split(',');
        lat1 = Number(coords1[0]);
        lon1 = Number(coords1[1]);
        getIpInfo(ip2, function(err, data2) {
            var coords2 = data2.loc.split(',');
            lat2 = Number(coords2[0]);
            lon2 = Number(coords2[1]);

            var dist = ipDistance(lat1, lon1, lat2, lon2);
            callback(null, dist);
        });
    });
};

const cli = function() {
    const yargs = require('yargs')
        .usage('Usage: $0 [command] [options]')
        .command('distance <loc1> [loc2]', 'Compute the approx. distance between IPs/URLs')
        .option('json', {
            alias: 'j',
            describe: 'Return data as json',
        })
        .example('$0', 'Get location info for your IP address')
        .example('$0 -j', 'Get location info for your IP as json')
        .example('$0 distance 8.8.8.8', 'Get distance from your IP to given IP')
        .example('$0 distance triage.net google.com', 'Get the distance between two given URLs')
        .help('help')
        .alias('h', 'help')
        .epilog('bashiru test cli');

    const argv = yargs.argv;

    if (argv.loc1) {
        findDistance(argv.loc1, argv.loc2, function(err, distance) {
            console.log(String(distance.toFixed(2)) + ' km');
        });
    } else if (argv.json) {
        getIpInfo(argv._[0], function(err, data) {
            console.log(JSON.stringify(data, null, 4));
        });
    } else {
        getIpInfo(argv._[0], function(err, data) {
            if (err) {
                console.log('Error:', err.message);
                return;
            }

            console.log('IP:', data.ip);
            console.log('Hostname:', data.hostname || '-');
            console.log('City:', data.city || '-');
            console.log('Region:', data.region || '-');
            console.log('Postal:', data.postal || '-');
            console.log('Country:', data.country || '-');
            console.log('Coordinates:', data.loc || '-');
            console.log('ISP:', data.org || '-');
        });
    }
};

exports.info = getIpInfo;
exports.distance = findDistance;
exports.cli = cli;