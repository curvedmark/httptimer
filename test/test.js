'use strict';

var http = require('http');
var Q = require('q');
var httptimer = require('../lib/httptimer');

test('startOne()', function (done) {
	var promise = createServer(100).then(function (url) {
		return httptimer.startOne(url);
	});

	var start = Date.now();
	promise.then(function (rtt) {
		rtt.should.be.within(100, 125);
		(Date.now() - start).should.be.within(100, 125);
	}).nodeify(done);
});

test('startOne(), template', function (done) {
	var promise = createServer(100).then(function (url) {
		var template = '%s' + url.slice(1);
		return httptimer.startOne(url.charAt(0), {template: template});
	});

	var start = Date.now();
	promise.then(function (rtt) {
		rtt.should.be.within(100, 125);
		(Date.now() - start).should.be.within(100, 125);
	}).nodeify(done);
});

test('startOne(), timeout', function (done) {
	var promise = createServer(200).then(function (url) {
		return httptimer.startOne(url, {timeout: 100});
	});

	var start = Date.now();
	promise.then(function () {
		throw Error('promise should be rejected');
	}, function (error) {
		error.should.be.an.instanceOf(Error);
		(Date.now() - start).should.be.within(100, 125);
	}).nodeify(done);
});

test('startAll(), serial', function (done) {
	var promise = createServers(200, 100).then(function (urls) {
		return httptimer.startAll(urls, {parallel: 1});
	});

	var start = Date.now();
	promise.spread(function (rtt1, rtt2) {
		rtt1.should.be.within(200, 225);
		rtt2.should.be.within(100, 125);
		(Date.now() - start).should.be.within(300, 350);
	}).nodeify(done);
});

test('startAll(), parallel', function (done) {
	var promise = createServers(200, 100).then(function (urls) {
		return httptimer.startAll(urls, {parallel: 2});
	});

	var start = Date.now();
	promise.spread(function (rtt1, rtt2) {
		rtt1.should.be.within(200, 225);
		rtt2.should.be.within(100, 125);
		(Date.now() - start).should.be.within(200, 225);
	}).nodeify(done);
});

test('repeat(), repeat twice, serial', function (done) {
	var promise = createServers([300, 100], [150, 50]).then(function (urls) {
		return httptimer.repeat(urls, {parallel: 1, repeat: 2});
	});

	var start = Date.now();
	promise.spread(function (rtt1, rtt2) {
		rtt1.should.be.within(200, 250);
		rtt2.should.be.within(100, 150);
		(Date.now() - start).should.be.within(600, 700);
	}).nodeify(done);
});

test('repeat(), repeat twice, parallel', function (done) {
	var promise = createServers([300, 100], [150, 50]).then(function (urls) {
		return httptimer.repeat(urls, {parallel: 2, repeat: 2});
	});

	var start = Date.now();
	promise.spread(function (rtt1, rtt2) {
		rtt1.should.be.within(200, 225);
		rtt2.should.be.within(100, 125);
		(Date.now() - start).should.be.within(400, 450);
	}).nodeify(done);
});

test('start(), sort results', function (done) {
	var promise = createServers(200, 100).then(function (urls) {
		var done = httptimer.start(urls, {repeat: 1});
		return done.then(function (entries) {
			entries.forEach(function (entry) {
				entry.url = urls.indexOf(entry.url);
			});
			return entries;
		});
	});

	promise.spread(function (entry1, entry2) {
		entry1.url.should.equal(1);
		entry2.url.should.equal(0);
	}).nodeify(done);
});

test('start(), sort results with error', function (done) {
	var promise = createServers(200, 150, 100, 50).then(function (urls) {
		var done = httptimer.start(urls, {repeat: 1, timeout: 125});
		return done.then(function (entries) {
			entries.forEach(function (entry) {
				entry.url = urls.indexOf(entry.url);
			});
			return entries;
		});
	});

	promise.spread(function (entry1, entry2, entry3, entry4) {
		entry1.url.should.equal(3);
		entry2.url.should.equal(2);
		entry3.url.should.equal(0);
		entry4.url.should.equal(1);
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