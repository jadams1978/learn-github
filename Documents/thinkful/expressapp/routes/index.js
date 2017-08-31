var express = require('express');
var router = express.Router();
var USERS = require('../users');

/* GET home page. */
router.get('/', function(req, res, next) {
  console.log(req.body);
  res.render('index', { title: 'dog' });
});
router.get('/test', function(req, res, next) {
  res.render('index', { title: 'test' });
});
router.get('/all', function(req, res, next) {
  console.log(USERS);
  res.render('all', { users: USERS });

});
module.exports = router;
