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
    it.skip('should handle subdocuments', function() {
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

  describe('pick', function() {
    it('should get a value from a nested object', function() {
      var obj = {a: {b: {c: 'foo'}}},
        data = jsonSelect.pick(obj, 'a.b.c');

      expect(data).to.eql('foo');
    });

    it('should get values from a array', function() {
      var obj = {a: [{b: 'b1', c: 'c1'}, {b: 'b2', c: 'c2'}]},
        data = jsonSelect.pick(obj, 'a.b');

      expect(data).to.eql(['b1', 'b2']);
    });

    it('should get values from nested arrays', function() {
      var obj = {a: [
          [{b: 'b1', c: 'c1'}, {b: 'b2', c: 'c2'}],
          [{b: 'b3', c: 'c3'}, {b: 'b4', c: 'c4'}]
        ]},
        data = jsonSelect.pick(obj, 'a.b');

      expect(data).to.eql([['b1', 'b2'], ['b3', 'b4']]);
    });
  });
});
