'use strict';

var http = require('http');
var Url = require('url');
var _ = require('underscore');
var Q = require('q');

var group = 1;
var repeat = 2;
var timeout = 2000;

repeatTestServers(['http://baidu.com', 'http://163.com']).then(function (rtts) {
	console.log(rtts);
});

function repeatTestServers(urls) {
	// var test = Q([]);
	var rttSet = [];
	var done = Q();
	for (var i = 0; i < repeat; ++i) {
		done = done.then(function (rtts) {
			rttSet.push(rtts);
			return testServers(urls);
		});
	}

	return done.then(function () {
		console.log(rttSet)
		rttSet.shift();
		return crunch(rttSet);
	});
}

function testServers(urls) {
	var urlGroups = [];
	var rtts = [];
	var i = 0;

	while (i < urls.length) {
		var urlGroup = urls.slice(i, i += group);
		urlGroups.push(urlGroup);
		// tests.push(testServerGroup(urlGroup));
	}

	return urlGroups.reduce(function (done, urlGroup) {
		return done.then(function (rs) {
			rtts = rtts.concat(rs);
			return testServerGroup(urlGroup);
		});
	}, Q([])).then(function () {
		return rtts;
	});

	// return tests.reduce(function (prevTest, test) {
	// 	return prevTest.then(function (rttGroups) {
	// 		rttGroups.push(test);
	// 		return Q.all(rttGroups);
	// 	});
	// }, Q([])).then(_.flatten);
}

function testServerGroup(urls) {
	return Q.all(urls.map(testServer));
}

function testServer(url) {
	var deferred = Q.defer();
	var options = _.extend(Url.parse(url), {
		method: 'HEAD'
	});

	var start = Date.now();
	var req = http.request(options, function () {
		deferred.resolve(Date.now() - start);
	}).on('error', function (e) {
		if (e.code !== 'ECONNRESET') {
			deferred.reject(e);
		}
	});
	req.setTimeout(timeout, function () {
		req.abort();
		deferred.resolve(-1);
	});
	req.end();

	return deferred.promise;
}

function crunch(rttSet) {
	return _.zip.apply(_, rttSet).map(average);
}

function average(rtts) {
	rtts = rtts.filter(function (rtt) {
		return rtt !== -1;
	});
	if (!rtts.length) {
		return timeout;
	}

	var sum = rtts.reduce(function (sum, rtt) {
		return sum + rtt;
	});

	return Math.round(sum / rtts.length);
}