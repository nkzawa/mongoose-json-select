var expect = require('chai').expect,
  mongoose = require('mongoose'),
  jsonSelect = require('../'),
  Schema = mongoose.Schema;


function model(name, schema) {
  if ('string' !== typeof name) {
    schema = name;
    name = 'Model';
  }
  return mongoose.model(name, schema, null, {cache: false});
}

function userSchema() {
  return Schema({
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
      'username name.first name.last created',
      {username:1, 'name.first': 1, 'name.last': 1, created: 1},
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

      expect(user.toJSON({select: fields})).to.eql(expected(user));
    });
  });

  it('should be able to exclude "_id"', function() {
    var schema = userSchema(),
      User, user;

    schema.plugin(jsonSelect, '-_id username');

    User = model(schema);
    user = new User(userData);

    expect(user.toJSON()).to.eql({username: user.username});
  });

  it('should handle getters', function() {
    var schema = userSchema(),
      User, user;

    schema.plugin(jsonSelect, 'username name.full');
    schema.set('toJSON', {getters: true});
    schema.path('username').get(function(v) {
      return v && v.toUpperCase();
    });
    schema.virtual('name.full').get(function() {
      return [this.name.first, this.name.last].join(' ');
    });

    User = model(schema);
    user = new User(userData);

    expect(user.toJSON()).to.eql({
      _id: user._id,
      username: user.username,
      name: {full: user.name.full}
    });
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
    it('should limit fields of embeded documents', function() {
      var schema = userSchema(),
        User, user, groupSchema, Group, group;

      User = model('User', schema);
      user = new User(userData);

      groupSchema = Schema({
        name: String,
        users: [schema]
      });
      groupSchema.plugin(jsonSelect, 'name users.username');
      Group = model('Group', groupSchema);
      group = new Group({name: 'foo', users: [user]});

      expect(group.toJSON()).to.eql({
        _id: group._id,
        name: group.name,
        users: [{username: user.username}]
      });
    });

    it('should respect options of embeded documents', function() {
      var schema = userSchema(),
        User, user, groupSchema, Group, group;

      schema.plugin(jsonSelect, 'username');

      User = model('User', schema);
      user = new User(userData);

      groupSchema = Schema({
        name: String,
        users: [schema]
      });
      Group = model('Group', groupSchema);
      group = new Group({name: 'foo', users: [user]});

      expect(group.toJSON()).to.eql({
        _id: group._id,
        name: group.name,
        users: [{
          _id: user._id,
          username: user.username
        }]
      });
    });
  });

  describe('populated documents', function() {
    it('should limit fields of subdocuments', function() {
      var schema = userSchema(),
        User, user, commentSchema, Comment, comment;

      User = model('User', schema);
      user = new User(userData);

      commentSchema = Schema({
        body: String,
        _user: {type: Schema.ObjectId, ref: 'User'}
      });
      commentSchema.plugin(jsonSelect, 'body _user.username');
      Comment = model('Comment', commentSchema);
      comment = new Comment({body: 'foo', _user: user});
      // emulate population
      comment.setValue('_user', user);

      expect(comment.toJSON()).to.eql({
        _id: comment._id,
        body: comment.body,
        _user: {username: user.username}
      });
    });

    it('should respect options of subdocuments', function() {
      var schema = userSchema(),
        User, user, commentSchema, Comment, comment;

      schema.plugin(jsonSelect, 'username');

      User = model('User', schema);
      user = new User(userData);

      commentSchema = Schema({
        body: String,
        _user: {type: Schema.ObjectId, ref: 'User'}
      });
      Comment = model('Comment', commentSchema);
      comment = new Comment({body: 'foo', _user: user});
      // emulate population
      comment.setValue('_user', user);

      expect(comment.toJSON()).to.eql({
        _id: comment._id,
        body: comment.body,
        _user: {
          _id: user._id,
          username: user.username
        }
      });
    });
  });

  describe('select', function() {
    it('should be able to mix inclusion and exclusion', function() {
      var obj = {a: {b: 'foo', c: 'bar'}},
        data = jsonSelect.select(obj, 'a -a.b');

      expect(data).to.eql({a: {c: 'bar'}});
    });

    it('should pick array with contents', function() {
      var obj = {a: ['foo', 'bar']},
        data;

      data = jsonSelect.select(obj, 'a');
      expect(data).to.eql({a: ['foo', 'bar']});
    });

    it('should pick only objects and arrays in a array', function() {
      var obj = {a: [
          {b: 'foo'}, {b:'bar', c: true}, [{b: 'baz'}],
          null, false, 1, 'str', new Date(), [], {}
        ]},
        data;

      data = jsonSelect.select(obj, 'a.b');
      expect(data).to.eql({a:[{b: 'foo'}, {b:'bar'}, [{b: 'baz'}], [], {}]});
    });

    it('should omit values only from objects in a array', function() {
      var date = new Date(),
        obj = {a: [
          {b: 'foo'}, {b:'bar', c: true}, [{b: 'baz'}],
          null, false, 1, 'str', date, [], {}
        ]},
        data;

      data = jsonSelect.select(obj, '-a.b');
      expect(data).to.eql({a:[{}, {c:true}, [{}], null, false, 1, 'str', date, [], {}]});
    });
  });
});
