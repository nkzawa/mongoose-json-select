var mongoose = require('mongoose'),
  _toJSON = mongoose.Document.prototype.toJSON;


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

function only(data, fields) {
  if (!fields.length) return data;

  var _data = {};

  fields.forEach(function(field) {
    var parts = field.split('.'),
      last = parts.length - 1,
      value = data,
      _value = _data;

    parts.forEach(function(part, i) {
      value = value && value[part];

      if (i === last) {
        _value[part] = value;
        return;
      }

      _value = _value[part] || (_value[part] = {});
    });
  });

  return _data;
}

function except(data, fields) {
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

function pick(data, field) {
  var parts = field.split('.'),
    _field = parts[0],
    value;

  value = Array.isArray(data) ? data.map(function(v) {
    return pick(v, _field);
  }) : data && data[_field];

  if (parts.length > 1) {
    value = pick(value, parts.slice(1).join('.'));
  }

  return value;
}

// TODO: handle '$'
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

function clone(obj) {
  var _obj = {}, k;

  for (k in obj) {
    if (obj.hasOwnProperty(k)) {
      _obj[k] = obj[k];
    }
  }

  return _obj;
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
exports.pick = pick;

