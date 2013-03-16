var expect = require('chai').expect,
  mongoose = require('mongoose'),
  jsonSelect = require('../');


function model(name, schema) {
  if ('string' !== typeof name) {
    schema = name;
    name = 'Model';
  }
  return mongoose.model(name, schema, null, {cache: false});
}

function userSchema() {
  return mongoose.Schema({
    username: String,
    password: String,
    name: {
      first: String,
      last: String
    },
    emails: [String],
    created: {type: Date, 'default': Date.now}
  });
}

describe('json-select', function() {

  var fieldsList = [
      '_id username name.first name.last created',
      {_id: 1, username:1, 'name.first': 1, 'name.last': 1, created: 1},
      '-password -emails',
      {password: 0, emails: 0}
    ],
    userData = {
      username: 'foo',
      password: 'password',
      name: {first: 'family', last: 'given'},
      emails: ['foo@example.com']
    };

  function expected(user) {
    return {
      _id: user._id,
      username: user.username,
      name: {first: user.name.first, last: user.name.last},
      created: user.created
    };
  }

  fieldsList.forEach(function(fields, i) {
    it('should limit attributes by plugin options (' + i + ')', function() {
      var schema = userSchema(),
        User, user;

      schema.plugin(jsonSelect, fields);

      User = model(schema);
      user = new User(userData);

      expect(user.toJSON()).to.eql(expected(user));
    });

    it('should limit attributes by schema options (' + i + ')', function() {
      var schema = userSchema(),
        User, user;

      schema.plugin(jsonSelect);
      schema.options.toJSON = {select: fields};

      User = model(schema);
      user = new User(userData);

      expect(user.toJSON()).to.eql(expected(user));
    });

    it('should limit attributes by toJSON options (' + i + ')', function() {
      var schema = userSchema(),
        User, user;

      schema.plugin(jsonSelect);

      User = model(schema);
      user = new User(userData);

      expect(user.toJSON({select: fields, transform: true})).to.eql(expected(user));
    });
  });

  it('should be able to mix inclusion and exclusion', function() {
    var schema = userSchema(),
      User, user;

    schema.plugin(jsonSelect, 'name -name.last');

    User = model(schema);
    user = new User(userData);

    expect(user.toJSON()).to.eql({name: {first: user.name.first}});
  });

  it('should call original toJSON', function() {
    var schema = userSchema(),
      username = 'xformed',
      User, user;

    schema.methods.toJSON = function(options) {
      return {username: username, bar: 'baz'};
    };
    schema.plugin(jsonSelect, 'username');

    User = model(schema);
    user = new User(userData);

    expect(user.toJSON()).to.eql({username: username});
  });

  describe('embeded documents', function() {
    it('should handle subdocuments', function() {
      var schema = userSchema(),
        User, user, groupSchema, Group, group;

      User = model('User', schema);
      user = new User(userData);

      groupSchema = mongoose.Schema({
        name: String,
        users: [schema]
      });
      groupSchema.plugin(jsonSelect, '_id name users.username');
      Group = model('Group', groupSchema);
      group = new Group({name: 'foo', users: [user]});

      expect(group.toJSON()).to.eql({
        _id: group._id,
        name: group.name,
        users: [{username: user.username}]
      });
    });

    it('should handle subdocuments', function() {
      var schema = userSchema(),
        User, user, groupSchema, Group, group;

      schema.plugin(jsonSelect, 'username');

      User = model('User', schema);
      user = new User(userData);

      groupSchema = mongoose.Schema({
        name: String,
        users: [schema]
      });
      Group = model('Group', groupSchema);
      group = new Group({name: 'foo', users: [user]});

      expect(group.toJSON()).to.eql({
        _id: group._id,
        name: group.name,
        users: [{username: user.username}]
      });
    });
  });

  describe('select', function() {
    it('should pick array with contents', function() {
      var obj = {a: ['foo', 'bar']},
        data;

      data = jsonSelect.select(obj, 'a');
      expect(data).to.eql({a: ['foo', 'bar']});
    });

    it('should leave only objects and arrays in a array', function() {
      var obj = {a: [
          {b: 'foo'}, {b:'bar', c: true}, [{b: 'baz'}],
          null, false, 1, 'str', new Date(), [], {}
        ]},
        data;

      data = jsonSelect.select(obj, 'a.b');
      expect(data).to.eql({a:[{b: 'foo'}, {b:'bar'}, [{b: 'baz'}], [], {}]});
    });
  });
});
