'use strict';

var request = require('request');
var Q = require('q');
var helper = require('./helper');
var httptimer = exports;

httptimer.defaults = {
	parallel: 10,
	repeat: 3,
	timeout: 2000
};

httptimer.option = function (key, options) {
	if (!options || options[key] === undefined) {
		return httptimer.defaults[key];
	}

	return options[key];
};

httptimer.start = function (urls, options) {
	return httptimer.repeat(urls, options).then(function (results) {
		var entries = results.map(function (result, i) {
			return {url: urls[i], result: result}
		});

		var successEntries = [];
		var failEntries = [];
		entries.forEach(function (entry) {
			if (typeof entry.result === 'number') {
				successEntries.push(entry);
			} else {
				failEntries.push(entry);
			}
		});

		successEntries.sort(function (entry1, entry2) {
			return entry1.result - entry2.result;
		});

		return successEntries.concat(failEntries);
	});
};

httptimer.repeat = function (urls, options) {
	var repeat = httptimer.option('repeat', options);
	var tests = helper.createArray(repeat, startAll);

	return helper.parallel(tests, 1).then(httptimer.crunchData);

	function startAll() {
		return httptimer.startAll(urls, options);
	}
};

httptimer.crunchData = function (rttSet) {
	return helper.zip(rttSet).map(function (results) {
		var rtts = [];
		var errors = [];

		results.forEach(function (result) {
			if (typeof result === 'number') {
				rtts.push(result);
			} else {
				errors.push(result);
			}
		});

		if (!rtts.length) {
			return errors[0];
		}

		return Math.round(helper.average(rtts));
	});
};

httptimer.startAll = function (urls, options) {
	var parallel = httptimer.option('parallel', options);
	var tests = urls.map(startOne);

	return helper.parallel(tests, parallel);

	function startOne(url) {
		return function () {
			var done = httptimer.startOne(url, options);
			return done.then(function (value) {
				return value;
			}, function (reason) {
				return reason;
			});
		}
	}
};

httptimer.startOne = function (url, options) {
	var timeout = httptimer.option('timeout', options);
	var template = httptimer.option('template', options);

	if (typeof template === 'string' && template.indexOf('%s') !== -1) {
		url = template.replace(/%s/g, url);
	}

	if (!/^https?:\/\//.test(url)) {
		url = 'http://' + url;
	}

	var start = Date.now();
	return Q.nfcall(request.head, {
		uri: url,
		timeout: timeout
	}).then(function () {
		return Date.now() - start;
	});
};