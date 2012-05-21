/*globals console, process */

// config
var config = require('./config.js');

// dependencies
var http = require('http');
var url = require('url');
var _ = require('underscore');
var Router = require('routes').Router;
var nodemailer = require('nodemailer');

// buffer of log messages to be sent in next log report
var messages = [];

// routing system, very complex
var router = new Router();
router.addRoute('/log', function(query, headers) {
    var message = {
        level: query.l ? query.l.toUpperCase() : 'LOG',
        content: query.m || '',
        userAgent: headers['user-agent'] || '',
        time: (new Date()).toString()
    };

    console.log(message);
    messages.push(message);
});

var smtpTransport = nodemailer.createTransport('SMTP', {
    service: 'Gmail',
    auth: {
        user: config.gmail ? config.gmail.user : process.env.GMAIL_USER,
        pass: config.gmail ? config.gmail.password : process.env.GMAIL_PASSWORD
    }
});

var sendLogReport = function() {
    // no messages so no point in sending an email report
    if (messages.length === 0) {
        console.log('No messages, report not sent');
        return;
    }
    var mailOptions = _.clone(config.mail.options);

    // construct the email in text and html form
    var text = messages.length + ' messages were logged\n\n';
    var html = '<h2>' + messages.length + ' messages were logged' + '</h2>';
    _(messages).each(function(message) {
        text += message.time + ' - ' + message.level + ' - ' + message.content +
                ' - ' + message.userAgent + '\n';
        html += '<p>' + message.time + ' - ' + message.level + ' - ' + 
                message.content + ' - ' + message.userAgent + '</p>';
    });

    mailOptions.text = text;
    mailOptions.html = html;

    smtpTransport.sendMail(mailOptions, function(err, res) {
        // only clear the messages if the email was sent successfully
        if (err) {
            console.error('Sending of report failed: ' + err);
        }

        else {
            console.log('Report sent: ' + res.message);
            messages = [];
        }
    });
};

// attempt to send daily log report
setInterval(sendLogReport, config.mail.interval);

var server = http.createServer(function(req, res) {
    var parseQueryString = true;
    var urlParts = url.parse(req.url, parseQueryString);

    var route = router.match(urlParts.pathname);
    if (route) {
        route.fn(urlParts.query, req.headers);
        res.writeHead(200);
    }

    else {
        res.writeHead(404);
    }
    
    res.end();
});

var port = process.env.PORT || config.server.port.dev;
server.listen(port, function() {
    console.log('Listening on port ' + port);
});
