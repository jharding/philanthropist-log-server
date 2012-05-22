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

    // if the messages doesn't currently have expires set, set it
    // at 24 hours in the future
    if (!messages.expires) {
        messages.expires = new Date(Date.now() + config.mail.interval);
        console.log('Log report to be sent after ' + 
                    messages.expires.toString());
    }

    // messages collection has expired and it's time for the log
    // report to be sent
    if (messages.expires > Date.now()) {
        sendLogReport(); 
    }
});

// configure mail transport based off of config file or env variables
var smtpTransport = nodemailer.createTransport('SMTP', {
    service: config.mail.sender ? 
             config.mail.sender.service : process.env.MAIL_SERVICE,
    auth: {
        user: config.mail.sender ? 
              config.mail.sender.user : process.env.MAIL_USER,
        pass: config.mail.sender ? 
              config.mail.sender.password : process.env.MAIL_PASSWORD
    }
});

// constructs and emails the log report
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
        if (err) {
            console.error('Sending of report failed: ' + err);
        }

        else {
            console.log('Report sent: ' + res.message);
            
            // only clear the messages if the email was sent successfully
            messages = [];
        }
    });
};

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
