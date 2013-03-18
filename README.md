# mongoose-json-select
[![Build Status](https://travis-ci.org/nkzawa/mongoose-json-select.png?branch=master)](https://travis-ci.org/nkzawa/mongoose-json-select)

A mongoose plugin to limit JSON properties.

```js
var jsonSelect = require('mongoose-json-select');

var schema = Schema({
  name: String,
  email: String,
  created: {type: Date, default: Date.now}
});
schema.plugin(jsonSelect, 'name created');
var User = mongoose.model('User', schema);

var user = User({name: 'alice', email: 'alice@example.com'});
JSON.stringify(user);
// -> '{"_id": "51466baedf03a52e9b000001", "name": "alice", "created": "2013-03-16T16:08:38.065Z"}'

JSON.stringify(user.toJSON({select: 'name email'}));
// -> '{"_id": "51466baedf03a52e9b000001", "name": "alice", "email": "alice@example.com"}'
```

## Installation
    $ npm install mongoose-json-select

## Usage
Inclusion/Exclusion
```js
// inclusion. these are equivalent
schema.plugin(jsonSelect, 'name.first');
schema.plugin(jsonSelect, {'name.first': 1});

// exclusion. these are equivalent
schema.plugin(jsonSelect, '-name.last');
schema.plugin(jsonSelect, {'name.last': 0});
```

Always includes _id field if the field is not excluded explicitly.
```js
schema.plugin(jsonSelect, 'name');  // contains 'name' and '_id'
```

Configures default fields as a plugin option or schema option.
```js
// these are equivalent
schema.plugin(jsonSelect, 'name');

schema.plugin(jsonSelect);
schema.set('toJSON', {select: 'name'});
```

Specifies fields when calling toJSON.
```js
// this overrides a default configuration
JSON.stringify(doc.toJSON({select: 'name email'}));
```

The syntax for fields is the same with mongoose's Query#select.

http://mongoosejs.com/docs/api.html#query_Query-select


## Documentation

### select(obj, fields)
Creates a deep clone of 'obj' filtered by 'fields'.

```js
var select = require('mongoose-json-select').select;
select({a: {b: 'foo'}, c: 'bar'}, 'a.b');
// -> {a: {b: 'foo'}}
```

## License
MIT

