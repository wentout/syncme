
var path = require('path');
var watch = require('watch');
var fs = require('fs');
var fs_extra = require('fs-extra');
var dir_copy = require('directory-copy');
var mkdirp = require('mkdirp');
var rimraf = require('rimraf');
var moment = require('moment');

var colors = require('colors');

var log = function() {
	var arr = Array.prototype.slice.call(arguments);
	arr.unshift(moment().format('HH:mm:ss YYYY.MM.DD'));
	console.log.apply(null, arr);
};

var changed = function(str) {
	return str.cyan;
};
var dest = function(str) {
	return str.magenta;
};
var errlog = function(str) {
	return str.red;
};



var getPath = function(f, dirs) {
	return f.split(dirs.src)[1];
};

var makeChanges = function(f, dirs, type) {
	try {

		var fname = getPath(f, dirs);
		var rname = path.join(dirs.dst, fname);
		var rdirname = path.dirname(rname);

		log(changed(type + ' : ' + fname));

		if (dirs.async) {
			fs_extra.copy(f, rname, function(err) {
				if (err) return console.error(err);
				log(dest('Copy made to: ' + rname));
			});
		} else {

			setTimeout(function() {
				if (fs.statSync(f).isDirectory()) {
					if (fs.existsSync(rname)) {
						// rimraf.sync(rname);
					} else {
						mkdirp.sync(rname);
						dir_copy({
							src: f,
							dest: rname
						}, function() {
							log(dest('Destination Created: ' + rname));
						});
					}
				} else {
					if (fs.existsSync(rname)) {
						fs.writeFileSync(rname, fs.readFileSync(f));
						log(dest('Destination Changed: ' + rname));
					} else {
						if (fs.existsSync(rdirname)) {
							fs.writeFileSync(rname, fs.readFileSync(f));
							log(dest('Destination Created: ' + rname));
						} else {
							mkdirp.sync(rdirname);
							log(dest('Destination Created: ' + rdirname));
							fs.writeFileSync(rname, fs.readFileSync(f));
							log(dest('Destination Created: ' + rname));
						}
					}
				}
			}, 1000);

		}
	} catch (e) {
		log(errlog('Error'), errlog(e.stack || e));
	}
};

var makeRemoval = function(f, dirs) {
	try {
		var fname = getPath(f, dirs);
		var rname = path.join(dirs.dst, fname);
		var rdirname = path.dirname(rname);

		log(changed('Removed : ' + fname));

		if (dirs.async) {
			fs.exists(rname, function(exists) {
				if (exists) {
					fs_extra.remove(rname, function(err) {
						if (err) return console.error(err);
						log(dest('Made Removal to: ' + rname));
					});
				} else {
					log(dest('Removed Destination Not Exists.'));
				}
			});
		} else {
			if (fs.existsSync(rname)) {
				if (fs.statSync(rname).isDirectory()) {
					rimraf.sync(rname);
					log(dest('Destination Removed: ' + rname));
				} else {
					fs.unlinkSync(rname);
					log(dest('Destination Removed: ' + rname));
				}
			} else {
				log(dest('Removed Destination Not Exists.'));
			}
		}

	} catch (e) {
		log(errlog('Error'), errlog(e.stack || e));
	}
};


var config = require('./config.js');

for (var i in config) {
	(function(index, dirs) {

		(dirs.async == undefined) && (dirs.async = true);

		log('***  About of: ', index);
		log('Source:', dirs.src);
		log('Destination:', dirs.dst);
		log('Async:', dirs.async);

		watch.createMonitor(dirs.src, function(monitor) {
			monitor.on("changed", function(f, curr, prev) {
				makeChanges(f, dirs, 'Changed');
			});
			monitor.on("created", function(f, stat) {
				makeChanges(f, dirs, 'Created');
			});
			monitor.on("removed", function(f, stat) {
				makeRemoval(f, dirs);
			});
		});

	}(i, config[i]));
}


var _repl = require('./repl.js');
var repl = null;

setTimeout(function() {
	repl = _repl(process, {
		config: config,
		log: log,
	}, null, function(str) {
		log(str);
		if (repl) {
			this.displayPrompt();
		}
	});
}, 1000);
