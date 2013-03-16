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

// copy a value recursively
function pick(src, dst, field) {
  if (!src || !dst) return;

  if (util.isArray(src)) {
    pickArray(src, dst, field);
    return;
  }

  var _field = field[0],
    _src, _dst;

  if (!(_field in src)) return;
  _src = src[_field];

  if (field.length > 1) {
    if (_field in dst) {
      // get a reference when a value already exists
      _dst = dst[_field];
    } else {
      _dst = emptyObject(_src);
      if (_dst) {
        dst[_field] = _dst;
      }
    }

    // continue to search nested objects
    pick(_src, _dst, field.slice(1));
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
      i++;
    } else {
      _dst = emptyObject(_src);
      if (_dst) {
        dst.push(_dst);
        i++;
      }
    }

    pick(_src, _dst, field);
  });
}

function only(data, fields) {
  if (!fields.length) return data;

  var _data = {};

  fields.forEach(function(field) {
    pick(data, _data, field.split('.'));
  });

  return _data;
}

// delete a value recursively
function omit(data, field) {
  if (!data) return;

  if (util.isArray(data)) {
    data.forEach(function(_data) {
      omit(_data, field);
    });
    return;
  }

  var _field = field[0];
  if (field.length > 1) {
    omit(data[_field], field.slice(1));
    return;
  }

  if (data.constructor.name === 'Object') {
    delete data[_field];
  }
}

function except(data, fields) {
  var _data = clone(data);

  fields.forEach(function(field) {
    omit(_data, field.split('.'));
  });

  return _data;
}

function select(data, fields) {
  if (!fields) return data;

  var inclusive = [],
    exclusive = [];

  fields = normalizeFields(fields);

  Object.keys(fields).forEach(function(field) {
    (fields[field] ? inclusive : exclusive).push(field);
  });

  data = inclusive.length ? only(data, inclusive) : data;
  return exclusive.length ? except(data, exclusive) : data;
}

// include "_id" by default
function setDefault(fields) {
  if ('_id' in fields) return;

  var hasInclusion = Object.keys(fields).some(function(f) {
      return fields[f];
    });
  if (hasInclusion) {
    fields._id = 1;
  }
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
    if (!_fields) return obj;

    _fields = normalizeFields(_fields);
    setDefault(_fields);
    return select(obj, _fields);
  };
};

exports.select = select;

