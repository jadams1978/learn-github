console.log('app');
var USERS = require('./users');
var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');


var index = require('./routes/index');
var users = require('./routes/users');
const queryString = require('query-string');
const app = express();
//var app = express();
//var {app} = require('./server');
console.log('after server',app)
// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
console.log(path.join(__dirname, 'public'));
app.use('/', index);
app.use('/users', users);

// catch 404 and forward to error handler
/*app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});*/

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});





function gateKeeper(req, res, next) {
  //  `Object.assign` here gives us a neat, clean way to express the following idea:
  //  We want to create an object with default
  //  values of `null` for `user` and `pass`,
  //  and *then*, if after parsing the request header
  //  we find values for `user` and `pass` set
  //  there, we'll use those over the default.
  //  Either way, we're guaranteed to end up
  //  with an object that has `user` and `pass`
  //  keys.
  const {user, pass} = Object.assign(
    {user: null, pass: null}, queryString.parse(req.get('x-username-and-password')));

  // ^^ the more verbose way to express this is:
  //
  // const parsedHeader = queryString.parse(req.get('x-username-and-password'));
  // const user = parsedHeader.user || null;
  // const pass = parsedHeader.pass || null;

  // if there's a user in `USERS` with the username
  // and password from the request headers,
  // we set `req.user` equal to that object.
  // Otherwise, `req.user` will be undefined.
  req.user = USERS.find(
    (usr, index) => usr.userName === user && usr.password === pass);
  // gotta call `next()`!!! otherwise this middleware
  // will hang.
  next();
}

// use `gateKeeper` for all routes in our app.
// this means `req.user` will always be added
// to the request object.
app.use(gateKeeper);


app.get("/allusers/:puppy", (req, res) => {
  console.log(req.body);
  return res.json(USERS);

})
app.get("/api/users/me", (req, res) => {
  // send an error message if no or wrong credentials sent
  if (req.user === undefined) {
    return res.status(403).json({message: 'Must supply valid user credentials'});
  }
  // we're only returning a subset of the properties
  // from the user object. Notably, we're *not*
  // sending `password` or `isAdmin`.
  const {firstName, lastName, id, userName, position} = req.user;
  return res.json({firstName, lastName, id, userName, position});
});






module.exports = app;
