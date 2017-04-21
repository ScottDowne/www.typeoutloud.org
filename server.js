require('habitat').load();

var express = require('express');
var app = express();
var routes = require('./routes');
var compression = require('compression');
var helmet = require('helmet');
var path = require('path');

var bodyParser = require('body-parser');

app.set('trust proxy', true);

var RateLimit = require('express-rate-limit');

var limiter = new RateLimit({
  windowMs: 15*60*1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  delayMs: 0 // disable delaying - full speed until the max limit is reached
});

app.use(bodyParser.json());
app.use(compression());
app.use(helmet.frameguard({
  action: "deny"
}));
app.use(helmet.hidePoweredBy());
app.use(helmet.ieNoOpen());
app.use(helmet.noSniff());
app.use(helmet.xssFilter());

app.use(helmet.contentSecurityPolicy({
  directives:{
    defaultSrc: [ "'none'" ],
    scriptSrc: ["'self'", "https://*.shpg.org/", "https://www.google-analytics.com/"],
    connectSrc:["'self'"],
    childSrc:["'self'"],
    styleSrc:["'self'", "https://maxcdn.bootstrapcdn.com/"],
    fontSrc:["'self'", "https://maxcdn.bootstrapcdn.com/"],
    imgSrc:["'self'", "https://www.google-analytics.com", "https://*.shpg.org/"],
    frameAncestors: ["'none'"]
  }
}));

app.use(helmet.hsts({
  maxAge: 365 * 24 * 60 * 60 * 1000 // 1 year
}));

app.use(function(req, res, next){
  if (process.env.NODE_ENV === 'production') {
    if (req.headers['x-forwarded-proto'] != 'https') {
      return res.redirect('https://' + req.host + req.url);
    }
  }

  next();
});

app.post('/api/sheets/add/', limiter, routes.sheets.add);
app.post('/api/sheets/read/', routes.sheets.read);

app.use(express.static('public'));

app.get('*', function (request, response) {
  response.sendFile(path.join(__dirname, '/public/index.html'));
});

app.listen(process.env.PORT, function () {
  console.log('Running server at: ' + process.env.PORT + '!');
});
