'use strict';
const MAX_UINT = Math.pow(1 << 16, 2);
const MAX_SAFE_HIGH_BITS = Math.pow(2, 53 - 32);

function paddingLength(length) {
  if (length % 4 === 0) return 0;
  if (length % 4 === 1) return 3;
  if (length % 4 === 2) return 2;
  return 1;
}

function Reader(buffer) { this.buffer = buffer; this.offset = 0; }
function Writer() { this.length = 0; this.operations = []; }
Writer.prototype.get = function() {
  let buffer = Buffer.alloc(this.length);
  let length = this.operations.length, index = -1, offset = 0;
  while (++index < length) {
    let operation = this.operations[index];
    if (typeof operation[1] === 'string') {
      buffer['write' + operation[1]](operation[2], offset);
    } else {
      operation[1](buffer, offset, operation[2], operation[0]);
    }
    offset += operation[0];
  }
  return buffer;
};

function defineType(name, options) {
  Writer.prototype[name] = function(value, width) {
    if (typeof width === 'undefined') {
      width = (typeof options.width === 'function') ? options.width(value) : options.width;
      this.length += width;
    } else {
      this.length += width + paddingLength(width);
    }

    this.operations.push([ width, options.write_op, value ]);
    return this;
  };

  Reader.prototype[name] = function(width) {
    if (typeof options.read_op === 'function') return options.read_op(this, width);
    let result = this.buffer['read' + options.read_op](this.offset, this.offset + options.width);
    this.offset += options.width;
    return result;
  };
}

function bufferOperations(op, width) { return { width: width, write_op: op, read_op: op }; }
defineType('int', bufferOperations('Int32BE', 4));
defineType('uint', bufferOperations('UInt32BE', 4));
defineType('short', bufferOperations('Int16BE', 2));
defineType('ushort', bufferOperations('UInt16BE', 2));
defineType('float', bufferOperations('FloatBE', 4));
defineType('double', bufferOperations('DoubleBE', 8));
defineType('bool', {
  width: 4,
  read_op: function(reader) { return (reader.int() === 1); },
  write_op: function(buf, offset, value) { buf.writeInt32BE(value === false ? 0 : 1, offset); }
});

defineType('opaque', {
  width: function(value) { return value.length + paddingLength(value.length); },
  read_op: function(reader, size) {
    let width = (typeof size !== 'undefined') ? size : reader.uint();
    let padding = paddingLength(width);
    let result = reader.buffer.slice(reader.offset, reader.offset + width);
    reader.offset += width + padding;
    return result;
  },
  write_op: function(buf, offset, value) {
    value.copy(buf, offset);
    Buffer.alloc(paddingLength(value.length)).fill(0).copy(buf, offset + value.length);
  }
});

/*
defineType('opaque', {
  width: function(value) {  // for variable length opaque
    return value.length + paddingLength(value.length);
  },
  read_op: function(reader, size) { return reader.bytes(size); },
  write_op: function(buf, offset, value, size) {
    console.log('size: ', size);
    console.log('value: ', value);

    value.copy(buf, offset);
    Buffer.alloc(paddingLength(value.length)).fill(0).copy(buf, offset + value.length);

    /*
    let variable = false;
    if (typeof size === 'undefined') {
      variable = true;
      size = Array.isArray(value) ? value.length : 1;
    }

    let pos = offset;
    if (variable) {
      this.uint(size);
      value.map(b => { b.copy(buf, pos); pos += b.length; });
    } else {
      value.copy(buf, pos);
      pos += value.length;
    }
    Buffer.alloc(paddingLength(pos - offset)).fill(0).copy(buf, pos);
  }
});
*/

defineType('hyper', {
  width: 8,
  read_op: function(reader) {
    let high = reader.uint(), low = reader.uint();
    if (high < MAX_SAFE_HIGH_BITS && high > -MAX_SAFE_HIGH_BITS) {
      return high * MAX_UINT + (low >>> 0);
    }
    return null;
  },
  write_op: function(buf, offset, value) {
    let abs = Math.abs(value), high = abs / MAX_UINT, low = abs % MAX_UINT;
    if (value > 0) {
      buf.writeInt32BE(high, offset); buf.writeUInt32BE(low, offset + 4);
      return;
    }

    // need to write to a buffer in order to calculate the 2s complement
    let data = new Buffer(8), carry = 1, current = low;
    for (let i = 7; i >= 0; i--) {
      let v = ((current & 0xff) ^ 0xff) + carry;
      data[i] = v & 0xff;
      current = (i === 4) ? high : current >>> 8;
      carry = v >> 8;
    }
    data.copy(buf, 0);
  }
});

defineType('uhyper', {
  width: 8,
  read_op: function(reader) {
    let high = reader.uint(), low = reader.uint();
    if (high < MAX_SAFE_HIGH_BITS) {
      return ((high >>> 0) * MAX_UINT) + (low >>> 0);
    }
    return null;
  },
  write_op: function(buf, offset, value) {
    let high = value / MAX_UINT, low = value % MAX_UINT;
    buf.writeUInt32BE(high, offset); buf.writeUInt32BE(low, offset + 4);
  }
});

defineType('string', {
  width: function(value) {
    let length = Buffer.byteLength(value, 'utf8');
    return length + paddingLength(length) + 4;
  },
  read_op: function(reader) {
    let width = reader.int(), padding = paddingLength(width);
    let result = reader.buffer.slice(reader.offset, reader.offset + width).toString('utf8');
    reader.offset += (width + padding);
    return result;
  },
  write_op: function(buf, offset, value) {
    let data = new Buffer(value);
    let padding = Buffer.alloc(paddingLength(data.length)).fill(0);
    buf.writeInt32BE(data.length, offset);
    data.copy(buf, offset + 4);
    padding.copy(buf, offset + 4 + data.length);
  }
});

function defineStruct(name, members) {
  Writer.prototype[name] = function(value) {
    members.map(m => this[m.type](value[m.name]));
    return this;
  };

  Reader.prototype[name] = function() {
    return members.reduce((result, member) => {
      result[member.name] = this[member.type]();
      return result;
    }, {});
  };
}

function defineEnum(name, members) {
  Writer.prototype[name] = function(value) {
    let idx = members.findIndex(e => e.name === value);
    if (idx === -1) throw new TypeError('invalid enum value: ' + value);
    return this.uint(members[idx].value);
  };

  Reader.prototype[name] = function() { return this.uint(); };
}

module.exports = {
  Reader: Reader,
  Writer: Writer,
  defineStruct: defineStruct,
  defineEnum: defineEnum
};
