var path = require('path');
module.exports = {
	'Simple Name for index & log ' : {
		src: path.join(__dirname, '../app/'),
		dst: path.join(__dirname, '../app_sync/'),
		// async: false
	},
	'Simple Name for index & log 2' : {
		src: path.join(__dirname, '../app2/'),
		dst: path.join(__dirname, '../app_sync2/'),
		// async: false
	},
};