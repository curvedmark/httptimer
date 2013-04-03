'use strict';

var _ = require('underscore');
var Q = require('q');
var helper = exports;

helper.extend = _.extend;

helper.createArray = function (length, item) {
	var array = [];
	for (var i = 0; i < length; ++i) {
		array.push(item);
	}
	return array;
};

helper.zip = function (array) {
	return _.zip.apply(_, array);
};

helper.average = function (nums) {
	var sum = nums.reduce(function (sum, num) {
		return sum + num;
	});

	return sum / nums.length;
};

helper.parallel = function (funcs, count) {
	var length = funcs.length;
	if (!length) {
		return Q([]);
	}

	if (count == null) {
		count = Infinity;
	}

	count = Math.max(count, 1);
	count = Math.min(count, funcs.length);

	var promises = [];
	var values = [];
	for (var i = 0; i < count; ++i) {
		var promise = funcs[i]();
		promise = promise.then(next(i));
		promises.push(promise);
	}

	return Q.all(promises).then(function () {
		return values;
	});

	function next(i) {
		return function (value) {
			if (i == null) {
				i = count++;
			}

			if (i < length) {
				values[i] = value;
			}

			if (count < length) {
				return funcs[count]().then(next());
			}
		};
	}
};