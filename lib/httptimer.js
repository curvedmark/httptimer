'use strict';

var http = require('http');
var Url = require('url');
var Q = require('q');
var helper = require('./helper');
var httptimer = exports;

httptimer.defaults = {
	parallel: 10,
	repeat: 5,
	timeout: 2000
};

httptimer.option = function (key, options) {
	if (!options || options[key] === undefined) {
		return httptimer.defaults[key];
	}

	return options[key];
};

httptimer.start = function (urls, options) {
	var repeat = httptimer.option('repeat', options);
	var startAll = httptimer.startAll.bind(httptimer, urls, options);
	var tests = helper.createArray(repeat, startAll);

	return helper.parallel(tests, 1).then(httptimer.crunchData);
};

httptimer.crunchData = function (rttSet) {
	return helper.zip(rttSet).map(function (rtts) {
		return Math.round(helper.average(rtts));
	});
};

httptimer.startAll = function (urls, options) {
	var parallel = httptimer.option('parallel', options);
	var tests = urls.map(function (url) {
		return httptimer.startOne.bind(httptimer, url, options);
	});

	return helper.parallel(tests, parallel);
};

httptimer.startOne = function (url, options) {
	var timeout = httptimer.option('timeout', options);
	var deferred = Q.defer();

	if (!/^https?:\/\//.test(url)) {
		url = 'http://' + url;
	}

	var reqOpts = Url.parse(url);
	reqOpts.method = 'HEAD';

	var start = Date.now();
	var req = http.request(reqOpts, function () {
		deferred.resolve(Date.now() - start);
	}).on('error', function (e) {
		if (e.code !== 'ECONNRESET') {
			deferred.reject(e);
		}
	});
	req.setTimeout(timeout, function () {
		deferred.resolve(timeout);
		req.abort();
	});
	req.end();

	return deferred.promise;
};