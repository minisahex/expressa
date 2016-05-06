var pg = require('pg')
var bCrypt = require('bcrypt-nodejs')
var handler = require('./jwt')

var createHash = function(password){
    return bCrypt.hashSync(password, bCrypt.genSaltSync(10), null)
}

var isValidPassword = function(password, hashedPassword){
    return bCrypt.compareSync(password, hashedPassword)
}

module.exports = {
	createHash: createHash,
	middleware: function(req, res, next) {
		handler.isLoggedIn(req, function(uid) {
			if (uid) {
				req.uid = uid;
			}
			next();
		})
	},
	getRegisterRoute: function(api) {
		return function(req, res, next) {
			var user = req.body
			var email = user.email
			user.password = createHash(user.password)

			// check if user exists
			api.db.users.find({'email': email})
				.then(function(result) {
					if (result.length > 0) {
						return res.status(409).send('User with this email already registered.')
					}
					api.db.users.create(req.body)
						.then(function(result2) {
							var uid = result2[0]._id;
							handler.doLogin(uid, req, res)
						}, function(err2) {
							next(err2)
						})

				}, next)
		};
	},
	getLoginRoute: function(api) {
		return function(req, res, next) {
			var email = req.body.email
			var password = req.body.password

			// check if user exists
			api.db.users.find({'email': email})
				.then(function(result) {
					if (result.length == 0) {
						return res.status(404).send('No user found with this email.')
					}
					var user = result[0];
					if (isValidPassword(password, user.password)) {
						handler.doLogin(user._id, req, res)
					} else {
						res.status(500).send('Incorrect password')
					}
				}, next)
		}
	}
}