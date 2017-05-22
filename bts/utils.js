'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');


function root_dir() {
	return path.normalize(path.join(__dirname, '..'));
}

function size(obj) {
	var res = 0;
	for (var key in obj) {
		if (obj.hasOwnProperty(key)) {
			res++;
		}
	}
	return res;
}

function pluck(obj, keys) {
	var res = {};
	keys.forEach(function(k) {
		if (obj.hasOwnProperty(k)) {
			res[k] = obj[k];
		}
	});
	return res;
}

function cmp(a, b) {
	if (a < b) {
		return -1;
	} else if (a > b) {
		return 1;
	} else {
		return 0;
	}
}

function cmp_key(key) {
	return function(o1, o2) {
		const v1 = o1[key];
		const v2 = o2[key];
		return cmp(v1, v2);
	};
}

function natcmp(as, bs){
	var a, b, a1, b1, i= 0, n, L;
	var rx = /(\.\d+)|(\d+(\.\d+)?)|([^\d.]+)|(\.\D+)|(\.$)/g;
	if (as=== bs) {
		return 0;
	}
	a = as.toLowerCase().match(rx);
	b = bs.toLowerCase().match(rx);
	L = a.length;
	while (i<L){
		if (!b[i]) {
			return 1;
		}
		a1 = a[i];
		b1 = b[i++];
		if (a1 !== b1){
			n = a1-b1;
			if (!isNaN(n)) {
				return n;
			}
		return a1>b1? 1:-1;
		}
	}
	return b[i] ? -1:0;
}

function remove(ar, val) {
	for (var i = 0;i < ar.length;i++) {
		if (ar[i] === val) {
			ar.splice(i, 1);
			return true;
		}
	}
	return false;
}

// From http://stackoverflow.com/a/14387791/35070
function copy_file(source, target, cb) {
	var cbCalled = false;

	const rd = fs.createReadStream(source);
	rd.on('error', function(err) {
		done(err);
	});
	const wr = fs.createWriteStream(target);
	wr.on('error', function(err) {
		done(err);
	});
	wr.on('close', function() {
		done();
	});
	rd.pipe(wr);

	function done(err) {
		if (!cbCalled) {
			cb(err);
			cbCalled = true;
		}
	}
}

function make_index(ar, index_func) {
	const res = new Map();
	for (const el of ar) {
		res.set(index_func(el), el);
	}
	return res;
}

function pad(n, width, z) {
	z = z || '0';
	n = n + '';
	return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
}

function values(obj) {
	var res = [];
	for (var key in obj) {
		if (Object.prototype.hasOwnProperty.call(obj, key)) {
			res.push(obj[key]);
		}
	}
	return res;
}

function plucked_deep_equal(x, y, keys) {
	for (var i = 0;i < keys.length;i++) {
		var k = keys[i];
		if (! deep_equal(x[k], y[k])) {
			return false;
		}
	}
	return true;
}

function deep_equal(x, y) {
	if (x === y) {
		return true;
	}
	if ((x === null) || (y === null)) {
		return false;
	}
	if ((typeof x == 'object') && (typeof y == 'object')) {
		var key_count = 0;
		for (var k in x) {
			if (! deep_equal(x[k], y[k])) {
				return false;
			}
			key_count++;
		}

		for (k in y) {
			key_count--;
		}
		return key_count === 0;
	}
	return false;
}

function gen_token() {
	return crypto.randomBytes(32).toString('hex');
}

module.exports = {
	cmp,
	cmp_key,
	copy_file,
	deep_equal,
	gen_token,
	make_index,
	natcmp,
	pad,
	pluck,
	plucked_deep_equal,
	remove,
	root_dir,
	size,
	values,
};
