var httptimer = require('./lib/httptimer');

module.exports = function (urls, options, callback) {
	httptimer.start(urls, options).nodeify(callback);
};