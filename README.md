# mongoose-json-select
[![Build Status](https://travis-ci.org/nkzawa/middleware-handler.png?branch=master)](https://travis-ci.org/nkzawa/middleware-handler)

MiddlewareHandler manages custom middlewares in the same way as how Express/Connect does.

```js
var MiddlewareHandler = require('middleware-handler');

var handler = new MiddlewareHandler();
handler.use(function(a, b, next()) {
  console.log(a, b); // foo bar
  next();
});
handler.handle(['foo', 'bar']);
```

## Installation
    $ npm install middleware-handler

## Example

### Integration with Socket.io
Parsing cookie from handshake's data with the authorization.

```js
var cookieParser = require('express').cookieParser('secret');
var handler = new MiddlewareHandler();
handler.use(function(handshakeData, next) {
  cookieParser(handshakeData, {}, next);
});

var io = require('socket.io').listen(8080);
io.set('authorization', function(handshakeData, callback) {
  handler.handle([handshakeData], function(err) {
    console.log(handshakeData.cookies);
    callback(err, !err);
  });
});
```

## Documentation

### #use(middleware)
```middleware``` accepts variable arguments and a callback.

```js
var handler = new MiddlewareHandler();
handler.use(function(arg, next) {
  var err;
  // do some stuff
  next(err); // optionally accepts an error object
});
```

### #handle([args], [callback])
Invoke middlewares.

```js
var handler = new MiddlewareHandler();
handler.use(function(a, b, next) {
  console.log(a, b); // foo bar
  next();
});
handler.handle(['foo', 'bar'], function(err) {
  // after calling all middlewares
});
```

### #compose([callback])
Create a function that invokes middlewares.

```js
var handler = new MiddlewareHandler();
handler.use(function(a, b, next) {
  console.log(a, b); // foo bar
  next();
});

var fn = handler.compose(function(err) {
    // after calling all middlewares
  });
fn('foo', 'bar');
```

### #clear()
Clear all middlewares from the stack.

```js
var handler = new MiddlewareHandler();
handler.use(function() {});
console.log(handler.stack.length); // 1

handler.clear();
console.log(handler.stack.length); // 0
```

### compose(middlewares...)
Create a function that invokes the passed middlewares.

```js
function middleware(a, b, next) {
  console.log(a, b); // foo bar
  next();
}

var fn = MiddlewareHandler.compose(middleware, function(a, b) {
    console.log(a, b); // foo bar
  });
fn('foo', 'bar');
```

## License
MIT

