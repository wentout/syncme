var log = console.log;

var start = function (proc, init_ctx, init_opts) {
	
	var repl = false;
	var util = require('util');
	
	!proc && (proc = process);
	!init_ctx && (init_ctx = {});
	!init_opts && (init_opts = {});

	var repl_module = require('repl');

	try {

		var setPRawMode = function () {
			if (proc.stdin) {
				if (typeof proc.stdin.setRawMode == 'function') {
					proc.stdin.setRawMode (true);
				} else {
					var tty = require('tty');
					if (tty && tty.setRawMode) {
						tty.setRawMode(true);
					}
				}
			}
		};

		try {
			// proper reaction on keys
			// TTY is also supported
			setPRawMode ();
			proc.stdin.setEncoding && (proc.stdin.setEncoding('utf8'));
			proc.stdin.resume();

		} catch (e) {}

		var util_inspect_opts = {
			showHidden: true,
			// depth: null,
			// depth: 7,
			depth: 1,
			colors: true,
			customInspect: false
		};

		var iLog = function (obj, onlyReturn) {
			var output = util.inspect(obj, util_inspect_opts);
			if (onlyReturn) {
				return output;
			} else {
				proc.stdout.write(output);
			}
		};

		// var repl_writer = function (result) {
		// 	return util.inspect(result, util_inspect_opts);
		// };

		var repl_opts = {
			prompt: '> ',
			input: proc.stdin,
			output: proc.stdout,
			// writer: repl_writer,
			// useGlobal: false
		};

		for (var i in init_opts) {
			repl_opts[i] = init_opts[i];
		}

		var repl_info = function (sw) {
			switch (sw) {
				case 0:
					log ('\nSwitched to REPL');
					log ('For Exit it use [Ctrl + D], or type .exit and hit enter \u21A9');
					log ('List of available commands under [. + tab]\n');
					break;
				case 1:
					log ('\n\nExit from REPL\n');
					break;
				default:
					log ('Use ` for coming to REPL');
			}
		};

		var repl_commands = {
			cls:  {
				help: 'Clear REPL screen',
				action: function () {
					proc.stdout.write('\u001B[2J\u001B[0;0f');
					// log('\033[2J');
					this.displayPrompt();
				}
			},
			eval: {
				help: 'console.log for repl.eval something',
				action: function () {
					for (var i in arguments) {
						repl.eval(arguments[i], repl.context, null, function (err, result){
							try {
								if (err) {
									iLog(err);
								} else {
									iLog(result);
								}
							} catch (e) {
								iLog(e.stack || e);
							}
						});
					}
					repl.displayPrompt();
				}
			}
		};

		
		var addContext = function (rpl) {
			rpl.context.repl = rpl;
			rpl.context.util = util;
			for (var i in init_ctx) {
				rpl.context[i] = init_ctx[i];
			}
		};
		var resetContext = function () {
			this.context = this.createContext();
			addContext (this);
		};

		var repl_start = function () {
			
			repl_info (0);
			
			var repl_obj = repl_module.start(repl_opts);
			repl_obj.on('exit', repl_exit);
			
			for (var i in repl_commands) {
				try {
					repl_obj.defineCommand(i, repl_commands[i]);
				} catch (e) {
					log (e.stack || e);
				}
			}

			repl = repl_obj;
			addContext (repl);
			repl.resetContext = resetContext;

		};

		var repl_pstart = function () {
			proc.stdin.pause();
			// need timeout for clearing buffers
			setTimeout (repl_start, 100);
		};

		var repl_exit = function () {
			repl.resetContext();
			repl_info (1);
			setPRawMode ();
			proc.stdin.resume();
			repl = false;
		};
		
		var during_exit = false;
		var keydata = function (key) {

			if (during_exit) {

				if (key == 'y') {
					proc.exit(); // succes
				} else {
					log ('Exit proc terminated.');
					during_exit = false;
				}

			} else {

				if (repl) {

					return false;

				} else {

					if (key == '\u0003') {
					
						during_exit = true;
						log ('Are You Sure (y)?');
						return;
					
					} else {

						// if (key == '\r') {
						if (key == '`') {

							repl_pstart ();

						} else {
							repl_info ();
						}

					}

				}

			}

		};

		proc.stdin.on('data', keydata);

		repl_info ();

	} catch (e) {}

	return repl;

};

var checkProc = function (proc) {
	if (!proc.stdin || !proc.stdout) {
		var stream = require('stream');
		!proc.stdin && (proc.stdin = new stream.Readable);
		!proc.stdout && (proc.stdout = new stream.Writable);
	}
};

if (require.main.filename == __filename) { //isMain
	var emptyfn = function () {};
	setInterval (emptyfn, 1000000);
	start (checkProc(process), {
		foo: 'bar'
	});
} else {
	module.exports = function (proc, context, opts, loger) {
		log = loger || log;
		return start (checkProc(process), context, opts);
	};
}


/* Example

var repl = require( './repl.js' );

setTimeout (function () {
	log ('\n\n\n');
	repl (process, {
		brige: brige,
		http: servers.http
	}, null, yourLogger);
}, 1000);

*/