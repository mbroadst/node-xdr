'use strict';
const p = require('../lib/protocol_base'),
      expect = require('chai').expect;

function buildEncoder(type) {
  return function(value) { let writer = new p.Writer(); return writer[type](value).get(); };
}

function buildDecoder(type) {
  return function(value) { let reader = new p.Reader(value); return reader[type](); };
}

suite('protocol', function() {
  suite('int', function() {
    test('decode', function() {
      let decode = buildDecoder('int');
      expect(decode(new Buffer([ 0x00, 0x00, 0x00, 0x00]))).to.eql(0);
      expect(decode(new Buffer([ 0x00, 0x00, 0x00, 0x01]))).to.eql(1);
      expect(decode(new Buffer([ 0xFF, 0xFF, 0xFF, 0xFF]))).to.eql(-1);
      expect(decode(new Buffer([ 0x7F, 0xFF, 0xFF, 0xFF]))).to.eql(Math.pow(2, 31) - 1);
      expect(decode(new Buffer([ 0x80, 0x00, 0x00, 0x00]))).to.eql(-Math.pow(2, 31));
    });

    test('encode', function() {
      let encode = buildEncoder('int');
      expect(encode(0)).to.eql(new Buffer([ 0x00, 0x00, 0x00, 0x00 ]));
      expect(encode(1)).to.eql(new Buffer([ 0x00, 0x00, 0x00, 0x01 ]));
      expect(encode(-1)).to.eql(new Buffer([ 0xFF, 0xFF, 0xFF, 0xFF ]));
      expect(encode(Math.pow(2, 31) - 1)).to.eql(new Buffer([ 0x7F, 0xFF, 0xFF, 0xFF ]));
      expect(encode(-Math.pow(2, 31))).to.eql(new Buffer([ 0x80, 0x00, 0x00, 0x00 ]));
    });
  });

  suite('uint', function() {
    test('decode', function() {
      let decode = buildDecoder('uint');
      expect(decode(new Buffer([ 0x00, 0x00, 0x00, 0x00 ]))).to.eql(0);
      expect(decode(new Buffer([ 0x00, 0x00, 0x00, 0x01 ]))).to.eql(1);
      expect(decode(new Buffer([ 0xFF, 0xFF, 0xFF, 0xFF ]))).to.eql(Math.pow(2, 32) - 1);
    });

    test('encode', function() {
      let encode = buildEncoder('uint');
      expect(encode(0)).to.eql(new Buffer([ 0x00, 0x00, 0x00, 0x00 ]));
      expect(encode(1)).to.eql(new Buffer([ 0x00, 0x00, 0x00, 0x01 ]));
      expect(encode(Math.pow(2, 32) - 1)).to.eql(new Buffer([ 0xFF, 0xFF, 0xFF, 0xFF ]));
    });
  });

  suite('double', function() {
    test('decode', function() {
      let decode = buildDecoder('double');
      expect(decode(new Buffer([ 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00 ]))).to.eql(0.0);
      expect(decode(new Buffer([ 0x80, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00 ]))).to.eql(-0.0);
      expect(decode(new Buffer([ 0x3F, 0xF0, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00 ]))).to.eql(1.0);
      expect(decode(new Buffer([ 0xBF, 0xF0, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00 ]))).to.eql(-1.0);
      expect(decode(new Buffer([ 0x7F, 0xF8, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00 ]))).to.eql(NaN);
      expect(decode(new Buffer([ 0x7F, 0xF0, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01 ]))).to.eql(NaN);
    });

    test('encode', function() {
      let encode = buildEncoder('double');
      expect(encode(0.0)).to.eql(new Buffer([ 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00 ]));
      expect(encode(-0.0)).to.eql(new Buffer( [0x80, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00 ]));
      expect(encode(1.0)).to.eql(new Buffer([ 0x3F, 0xF0, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00 ]));
      expect(encode(-1.0)).to.eql(new Buffer([ 0xBF, 0xF0, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00 ]));
    });
  });

  suite('float', function() {
    test('decode', function() {
      let decode = buildDecoder('float');
      expect(decode(new Buffer([ 0x00, 0x00, 0x00, 0x00 ]))).to.eql(0.0);
      expect(decode(new Buffer([ 0x80, 0x00, 0x00, 0x00 ]))).to.eql(-0.0);
      expect(decode(new Buffer([ 0x3F, 0x80, 0x00, 0x00 ]))).to.eql(1.0);
      expect(decode(new Buffer([ 0xBF, 0x80, 0x00, 0x00 ]))).to.eql(-1.0);
      expect(decode(new Buffer([ 0x7F, 0xC0, 0x00, 0x00 ]))).to.eql(NaN);
      expect(decode(new Buffer([ 0x7F, 0xF8, 0x00, 0x00 ]))).to.eql(NaN);
    });

    test('encode', function() {
      let encode = buildEncoder('float');
      expect(encode(0.0)).to.eql(new Buffer([ 0x00, 0x00, 0x00, 0x00 ]));
      expect(encode(-0.0)).to.eql(new Buffer([ 0x80, 0x00, 0x00, 0x00 ]));
      expect(encode(1.0)).to.eql(new Buffer([ 0x3F, 0x80, 0x00, 0x00 ]));
      expect(encode(-1.0)).to.eql(new Buffer([ 0xBF, 0x80, 0x00, 0x00 ]));
    });
  });

  suite('bool', function() {
    test('decode', function() {
      let decode = buildDecoder('bool');
      expect(decode(new Buffer([0x00, 0x00, 0x00, 0x00]))).to.eql(false);
      expect(decode(new Buffer([0x00, 0x00, 0x00, 0x01]))).to.eql(true);
    });

    test('encode', function() {
      let encode = buildEncoder('bool');
      expect(encode(false)).to.eql(new Buffer([ 0x00, 0x00, 0x00, 0x00 ]));
      expect(encode(true)).to.eql(new Buffer([ 0x00, 0x00, 0x00, 0x01 ]));
    });
  });

  suite('string', function() {
    test('decode', function() {
      let decode = buildDecoder('string');
      expect(decode(new Buffer([ 0x00, 0x00, 0x00, 0x00 ]))).to.eql('');
      expect(decode(new Buffer([ 0x00, 0x00, 0x00, 0x01, 0x41, 0x00, 0x00, 0x00 ]))).to.eql('A');
      expect(decode(new Buffer([ 0x00, 0x00, 0x00, 0x03, 0xe4, 0xb8, 0x89, 0x00 ]))).to.eql('三');
      expect(decode(new Buffer([ 0x00, 0x00, 0x00, 0x02, 0x41, 0x41, 0x00, 0x00 ]))).to.eql('AA');
    });

    test('encode', function() {
      let encode = buildEncoder('string');
      expect(encode('')).to.eql(new Buffer([ 0x00, 0x00, 0x00, 0x00]));
      expect(encode('三')).to.eql(new Buffer([ 0x00, 0x00, 0x00, 0x03, 0xe4, 0xb8, 0x89, 0x00 ]));
      expect(encode('A')).to.eql(new Buffer([ 0x00, 0x00, 0x00, 0x01, 0x41, 0x00, 0x00, 0x00 ]));
      expect(encode('AA')).to.eql(new Buffer([ 0x00, 0x00, 0x00, 0x02, 0x41, 0x41, 0x00, 0x00 ]));
    });
  });

  suite('unsigned hyper', function() {
    test('decode', function() {
      let decode = buildDecoder('uhyper');
      expect(decode(new Buffer([ 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00 ]))).to.eql(0);
      expect(decode(new Buffer([ 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01 ]))).to.eql(1);
      // expect(t.decode(new Buffer([ 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF ]))).to.eql(UnsignedHyper.MAX_VALUE);
    });

    test('encode', function() {
      let encode = buildEncoder('uhyper');
      expect(encode(0)).to.eql(new Buffer([ 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00 ]));
      expect(encode(1)).to.eql(new Buffer([ 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01 ]));
      // expect(encode(UnsignedHyper.MAX_VALUE)).to.eql([0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF]);
    });
  });

  suite('hyper', function() {
    test('decode', function() {
      let decode = buildDecoder('hyper');
      expect(decode(new Buffer([ 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00 ]))).to.eql(0);
      expect(decode(new Buffer([ 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01 ]))).to.eql(1);
      // expect(decode(new Buffer([ 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF ]))).to.eql(-1);
      // expect(t.decode(new Buffer([ 0x7F, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF ]))).to.eql(Hyper.MAX_VALUE);
      // expect(t.decode(new Buffer([ 0x80, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00 ]))).to.eql(Hyper.MIN_VALUE);
    });

    test('encode', function() {
      let encode = buildEncoder('hyper');
      expect(encode(0)).to.eql(new Buffer([ 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00 ]));
      expect(encode(1)).to.eql(new Buffer([ 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01 ]));
      expect(encode(-1)).to.eql(new Buffer([ 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF ]));
      // expect(encode(Hyper.MAX_VALUE)).to.eql([0x7F,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF]);
      // expect(encode(Hyper.MIN_VALUE)).to.eql([0x80,0x00,0x00,0x00,0x00,0x00,0x00,0x00]);
    });
  });

  suite('struct', function() {
    test('decode', function() {
      p.defineStruct('myStruct', [
        { type: 'int', name: 'an_int' },
        { type: 'string', name: 'a_string' }
      ]);

      let data = new Buffer([
        0x00, 0x00, 0x00, 0x01,
        0x00, 0x00, 0x00, 0x01, 0x41, 0x00, 0x00, 0x00
      ]);

      let reader = new p.Reader(data);
      expect(reader.myStruct()).to.eql({ an_int: 1, a_string: 'A' });
    });

    test('encode', function() {
      p.defineStruct('myStruct', [
        { type: 'int', name: 'an_int' },
        { type: 'string', name: 'a_string' }
      ]);

      let data = new Buffer([
        0x00, 0x00, 0x00, 0x01,
        0x00, 0x00, 0x00, 0x01, 0x41, 0x00, 0x00, 0x00
      ]);

      let writer = new p.Writer();
      expect(writer.myStruct({ an_int: 1, a_string: 'A' }).get()).to.eql(data);
    });
  });
});
