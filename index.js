var util = require('util'),
  mongoose = require('mongoose'),
  clone = require('clone'),
  _toJSON = mongoose.Document.prototype.toJSON;


// convert string formatted fields to object formatted ones
function normalizeFields(fields) {
  if (!fields) return;

  if (fields.constructor.name === 'Object') {
    return fields;
  } else if ('string' === typeof fields) {
    var _fields = {};

    fields.split(/\s+/).forEach(function(field) {
      if (!field) return;

      var include = +(field[0] !== '-');

      field = include ? field : field.substring(1);
      _fields[field] = include;
    });
    return _fields;
  }

  throw new TypeError('Invalid select fields. Must be a string or object.');
}

// create an empty object or array as a destination to copy
function emptyObject(obj) {
  if (obj && obj.constructor.name === 'Object') {
    return {};
  } else if (util.isArray(obj)) {
    return [];
  }
}

// copy a value of 'field' from 'src' to 'dst' recursively
function pick(src, dst, field) {
  if (util.isArray(src)) {
    pickArray(src, dst, field);
    return;
  }

  var parts = field.split('.'),
    _field = parts[0],
    _src, _dst;

  if (!src || !(_field in src)) return;
  _src = src[_field];

  if (parts.length > 1) {
    if (dst && _field in dst) {
      // get a reference when a value already exists
      _dst = dst[_field];
    } else {
      _dst = emptyObject(_src);
      if (_dst) {
        dst[_field] = _dst;
      }
    }

    if (_src && _dst) {
      // continue to search nested objects
      pick(_src, _dst, parts.slice(1).join('.'));
    }
    return;
  }

  dst[_field] = clone(_src);
}

// pick only objects and arrays from a array
function pickArray(src, dst, field) {
  var i = 0;

  src.forEach(function(_src) {
    var _dst;

    if (dst.length > i) {
      _dst = dst[i];
    } else {
      _dst = emptyObject(_src);
      if (_dst) {
        dst.push(_dst);
      }
    }

    if (_src && _dst) {
      pick(_src, _dst, field);
      i++;
    }
  });
}

function only(data, fields) {
  if (!fields.length) return data;

  var _data = {};

  fields.forEach(function(field) {
    pick(data, _data, field);
  });

  return _data;
}

function except(data, fields) {
  data = clone(data);

  fields.forEach(function(field) {
    var parts = field.split('.'),
      last = parts.length - 1,
      value = data;

    parts.forEach(function(part, i) {
      if (i === last) {
        delete value[part];
        return;
      }

      value = value && value[part];
    });
  });

  return data;
}

function select(data, fields) {
  if (!fields) return data;

  var inclusive = [],
    exclusive = [];

  fields = normalizeFields(fields);

  Object.keys(fields).forEach(function(field) {
    (fields[field] ? inclusive : exclusive).push(field);
  });

  return except(only(data, inclusive), exclusive);
}


exports = module.exports = function(schema, fields) {
  var methods = schema.methods,
    toJSON = methods.toJSON || _toJSON;

  // NOTE: toJSON calls toJSON with a same option recursively for all subdocuments.
  methods.toJSON = function(options) {
    var schemaOptions = this.schema.options.toJSON,
      _options = options || schemaOptions || {},
      _fields = (options || {}).select || (schemaOptions || {}).select || fields,
      obj;

    _options = clone(_options);

    if (!options) {
      // use default fields in all subdocuments.
      delete _options.select;
    } else if ('undefined' !== typeof options.select) {
      // fields are specified directly, then don't limit fields in all subdocuments.
      if (options.select) {
        // the route for an original document
        _options.select = null;
      } else {
        // the route for all subdocuments
        _fields = null;
      }
    }

    obj = toJSON.call(this, _options);
    return _fields ? select(obj, _fields) : obj;
  };
};

exports.select = select;

