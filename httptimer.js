var httptimer = require('./lib/httptimer');

module.exports = function (urls, options, callback) {
	new httptimer().start(urls, options).nodeify(callback);
};