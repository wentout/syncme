#!/usr/bin/node.sh

const path = require('path'),
	watch = require('watch'),
	fs = require('fs'),
	fs_extra = require('fs-extra'),
	mkdirp = require('mkdirp'),
	dir_copy = require('directory-copy'),
	rimraf = require('rimraf'),
	moment = require('moment');

const log = (...args) => {
	args.unshift(moment().format('HH:mm:ss YYYY.MM.DD'));
	console.log.apply(null, args);
};

const changed = (str) => {
	return str.cyan;
};
const dest = (str) => {
	return str.magenta;
};
const errlog = (str) => {
	return str.red;
};

const getPath = (f, dirs) => {
	return f.split(dirs.src)[1];
};

const makeChanges = (f, dirs, type) => {
	try {
		const fname = getPath(f, dirs);
		const rname = path.join(dirs.dst, fname);
		const rdirname = path.dirname(rname);

		log(changed(`${type} : ${fname}`));

		if (dirs.async) {
			fs_extra.copy(f, rname, (err) => {
				if (err) return console.error(err);
				log(dest(`Copy made to: ${rname}`));
			});
			return;
		}
		setTimeout(() => {
			if (fs.statSync(f).isDirectory()) {
				if (fs.existsSync(rname)) {
					return;
				}
				mkdirp.sync(rname);
				dir_copy(
					{
						src: f,
						dest: rname
					},
					() => {
						log(dest(`Destination Created: ${rname}`));
					}
				);
				return;
			}
			if (fs.existsSync(rname)) {
				fs.writeFileSync(rname, fs.readFileSync(f));
				log(dest(`Destination Changed: ${rname}`));
				return;
			}
			if (fs.existsSync(rdirname)) {
				fs.writeFileSync(rname, fs.readFileSync(f));
				log(dest(`Destination Created: ${rname}`));
				return;
			}
			mkdirp.sync(rdirname);
			log(dest(`Destination Created: ${rdirname}`));
			fs.writeFileSync(rname, fs.readFileSync(f));
			log(dest(`Destination Created: ${rname}`));
		}, 1000);
	} catch (e) {
		log(errlog('Error'), errlog(e.stack || e));
	}
};

const makeRemoval = (f, dirs) => {
	try {
		const fname = getPath(f, dirs);
		const rname = path.join(dirs.dst, fname);

		log(changed(`Removed : ${fname}`));

		if (dirs.async) {
			fs.exists(rname, (exists) => {
				if (!exists) {
					log(dest('Removed Destination Not Exists.'));
					return;
				}
				fs_extra.remove(rname, (err) => {
					if (err) return console.error(err);
					log(dest(`Made Removal to: ${rname}`));
				});
			});
		} else {
			if (!fs.existsSync(rname)) {
				log(dest('Removed Destination Not Exists.'));
			}
			if (fs.statSync(rname).isDirectory()) {
				rimraf.sync(rname);
				log(dest(`Destination Removed: ${rname}`));
			} else {
				fs.unlinkSync(rname);
				log(dest(`Destination Removed: ${rname}`));
			}
		}
	} catch (e) {
		log(errlog('Error'), errlog(e.stack || e));
	}
};


const configFileArgv = process.argv[2];
if (!configFileArgv) {
	log('no config file');
	process.exit(1);
}

const configPath = path.join(__dirname, configFileArgv);
if (!fs.existsSync(configPath)) {
	log('wrong config path');
	process.exit(1);
}

Object.entries(require(configPath)).forEach(it => {
	const [name, dirs] = it;
	dirs.async == undefined && (dirs.async = true);

	log('***	About of: ', name);
	log('Source:', dirs.src);
	log('Destination:', dirs.dst);
	log('Async:', dirs.async);

	watch.createMonitor(dirs.src, (monitor) => {
		monitor.on('changed', (f) => {
			makeChanges(f, dirs, 'Changed');
		});
		monitor.on('created', (f) => {
			makeChanges(f, dirs, 'Created');
		});
		monitor.on('removed', (f) => {
			makeRemoval(f, dirs);
		});
	});
});
