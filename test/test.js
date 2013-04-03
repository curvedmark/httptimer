'use strict';

var http = require('http');
var Q = require('q');
var httptimer = require('../lib/httptimer');

test('startOne', function (done) {
	var promise = createServer(100).then(function (url) {
		return httptimer.startOne(url);
	});

	var start = Date.now();
	promise.then(function (rtt) {
		rtt.should.be.within(100, 120);
		(Date.now() - start).should.be.within(100, 115);
	}).nodeify(done);
});

test('startAll, serial', function (done) {
	var promise = createServers(200, 100).then(function (urls) {
		return httptimer.startAll(urls, {parallel: 1});
	});

	var start = Date.now();
	promise.spread(function (rtt1, rtt2) {
		rtt1.should.be.within(200, 215);
		rtt2.should.be.within(100, 115);
		(Date.now() - start).should.be.within(300, 330);
	}).nodeify(done);
});

test('startAll, parallel', function (done) {
	var promise = createServers(200, 100).then(function (urls) {
		return httptimer.startAll(urls, {parallel: 2});
	});

	var start = Date.now();
	promise.spread(function (rtt1, rtt2) {
		rtt1.should.be.within(200, 215);
		rtt2.should.be.within(100, 115);
		(Date.now() - start).should.be.within(200, 230);
	}).nodeify(done);
});

test.only('start, repeat twice, serial', function (done) {
	var promise = createServers([300, 100], [150, 50]).then(function (urls) {
		return httptimer.start(urls, {parallel: 1, repeat: 2});
	});

	var start = Date.now();
	promise.spread(function (rtt1, rtt2) {
		rtt1.should.be.within(200, 215);
		rtt2.should.be.within(100, 115);
		(Date.now() - start).should.be.within(600, 630);
	}).nodeify(done);
});

test.only('start, repeat twice, parallel', function (done) {
	var promise = createServers([300, 100], [150, 50]).then(function (urls) {
		return httptimer.start(urls, {parallel: 2, repeat: 2});
	});

	var start = Date.now();
	promise.spread(function (rtt1, rtt2) {
		rtt1.should.be.within(200, 215);
		rtt2.should.be.within(100, 115);
		(Date.now() - start).should.be.within(400, 430);
	}).nodeify(done);
});

function createServers() {
	var delaySet = [].slice.call(arguments, 0);
	var promises = delaySet.map(function (delays) {
		return createServer(delays);
	});

	return Q.all(promises);
}

function createServer(delays) {
	if (typeof delays === 'number') {
		delays = [delays];
	}

	var deferred = Q.defer();

	var i = 0;
	var server = http.createServer(function (req, res) {
		setTimeout(function () {
			res.writeHead(200, {"Content-Type": "text/plain"});
			res.end();
		}, delays[i]);

		if (i < delays.length - 1) {
			++i;
		}
	});

	server.listen(0, '127.0.0.1', function () {
		var address = server.address();
		var url = 'http://' + address.address + ':' + address.port;
		deferred.resolve(url);
	});

	return deferred.promise;
}