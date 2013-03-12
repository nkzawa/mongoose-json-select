var mongoose = require('mongoose'),
  _toJSON = mongoose.Document.prototype.toJSON;


function clone(obj) {
  var _obj = {}, k;

  for (k in obj) {
    if (obj.hasOwnProperty(k)) {
      _obj[k] = obj[k];
    }
  }

  return _obj;
}

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
  } else {
    throw new TypeError('Invalid select fields. Must be a string or object.');
  }
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

function select(data, fields) {
  if (!fields) return data;

  var inclusive = [],
    exclusive = [],
    selected;

  fields = normalizeFields(fields);

  Object.keys(fields).forEach(function(field) {
    (fields[field] ? inclusive : exclusive).push(field);
  });

  selected = only(data, inclusive);
  selected = except(selected, exclusive);
  return selected;
}

module.exports = function(schema, fields) {
  var methods = schema.methods,
    toJSON = methods.toJSON || _toJSON;

  // NOTE: toJSON would share a same options for every subdocuments.
  methods.toJSON = function(options) {
    var schemaOptions = this.schema.options.toJSON,
      _options = options || schemaOptions || {},
      _fields = (options || {}).select || (schemaOptions || {}).select || fields,
      obj;

    _options = clone(_options);

    if (!options) {
      // called directly without options, then use default fields.
      delete _options.select;
    } else if ('select' in options) {
      if (options.select) {
        // options specified, then don't apply 'select' to all subdocuments.
        _options.select = null;
      } else {
        _fields = null;
      }
    }

    obj = toJSON.call(this, _options);
    return _fields ? select(obj, _fields) : obj;
  };
};


