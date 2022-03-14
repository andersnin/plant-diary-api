const jwt = require("express-jwt");
const jwks = require("jwks-rsa")

// const secret = process.env.SECRET;

function authenticate() {

  const jwtCheck = jwt({
    secret: jwks.expressJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksUri: 'https://dev-shqzo9iz.eu.auth0.com/.well-known/jwks.json'
  }),
  audience: 'http://localhost:8080',
  issuer: 'https://dev-shqzo9iz.eu.auth0.com/',
  algorithms: ['RS256']
}).unless({path: ['/']});
return jwtCheck;

}

module.exports = {
  authenticate
};