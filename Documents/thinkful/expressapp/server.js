console.log('server')
const bodyParser = require('body-parser');
const express = require('express');
const mongoose = require('mongoose');
const morgan = require('morgan');
var USERS = require('./users');

var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');


var index = require('./routes/index');
var users = require('./routes/users');
const queryString = require('query-string');

const {DATABASE_URL, PORT} = require('./config');
const {BlogPost} = require('./models');

const app = express();
//var app = require('./app');
app.use(morgan('common'));
app.use(bodyParser.json());
console.log('anytdhing');
mongoose.Promise = global.Promise;


app.get('/bengals', (req, res) => {
  console.log('something');
  BlogPost
    .find()
    .exec()
    .then(posts => {
      console.log(posts)
      console.log("bengals")
      res.json(posts.map(post => post.apiRepr()));
    })
    .catch(err => {
      console.error(err);
      res.status(500).json({error: 'something went terribly wrong'});
    });
});

app.get('/posts/:id', (req, res) => {
  BlogPost
    .findById(req.params.id)
    .exec()
    .then(post => res.json(post.apiRepr()))
    .catch(err => {
      console.error(err);
      res.status(500).json({error: 'something went horribly awry'});
    });
});

app.post('/posts', (req, res) => {
  const requiredFields = ['title', 'content', 'author'];
  for (let i=0; i<requiredFields.length; i++) {
    const field = requiredFields[i];
    if (!(field in req.body)) {
      const message = `Missing \`${field}\` in request body`
      console.error(message);
      return res.status(400).send(message);
    }
  }

  BlogPost
    .create({
      title: req.body.title,
      content: req.body.content,
      author: req.body.author
    })
    .then(blogPost => res.status(201).json(blogPost.apiRepr()))
    .catch(err => {
        console.error(err);
        res.status(500).json({error: 'Something went wrong'});
    });

});


app.delete('/posts/:id', (req, res) => {
  BlogPost
    .findByIdAndRemove(req.params.id)
    .exec()
    .then(() => {
      res.status(204).json({message: 'success'});
    })
    .catch(err => {
      console.error(err);
      res.status(500).json({error: 'something went terribly wrong'});
    });
});


app.put('/posts/:id', (req, res) => {
  if (!(req.params.id && req.body.id && req.params.id === req.body.id)) {
    res.status(400).json({
      error: 'Request path id and request body id values must match'
    });
  }

  const updated = {};
  const updateableFields = ['title', 'content', 'author'];
  updateableFields.forEach(field => {
    if (field in req.body) {
      updated[field] = req.body[field];
    }
  });

  BlogPost
    .findByIdAndUpdate(req.params.id, {$set: updated}, {new: true})
    .exec()
    .then(updatedPost => res.status(201).json(updatedPost.apiRepr()))
    .catch(err => res.status(500).json({message: 'Something went wrong'}));
});


app.delete('/:id', (req, res) => {
  BlogPosts
    .findByIdAndRemove(req.params.id)
    .exec()
    .then(() => {
      console.log(`Deleted blog post with id \`${req.params.ID}\``);
      res.status(204).end();
    });
});


//app.use('*', function(req, res) {
  //res.status(404).json({message: 'Not Found'});
//});

// closeServer needs access to a server object, but that only
// gets created when `runServer` runs, so we declare `server` here
// and then assign a value to it in run
let server;

// this function connects to our database, then starts the server
function runServer(databaseUrl=DATABASE_URL, port=PORT) {
  return new Promise((resolve, reject) => {
    mongoose.connect(databaseUrl, err => {
      if (err) {
        return reject(err);
      }
      server = app.listen(port, () => {
        console.log(`Your app is listeningdfon port ${port}`);
        resolve();
      })
      .on('error', err => {
        mongoose.disconnect();
        reject(err);
      });
    });
  });
}

// this function closes the server, and returns a promise. we'll
// use it in our integration tests later.
function closeServer() {
  return mongoose.disconnect().then(() => {
     return new Promise((resolve, reject) => {
       console.log('Closing server');
       server.close(err => {
           if (err) {
               return reject(err);
           }
           resolve();
       });
     });
  });
}



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
// if server.js is called directly (aka, with `node server.js`), this block
// runs. but we also export the runServer command so other code (for instance, test code) can start the server as needed.
if (require.main === module) {
  runServer().catch(err => console.error(err));
};

module.exports = {runServer, app, closeServer};
