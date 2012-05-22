exports.server = {
    port: {
        prod: 80,
        dev: 4000
    }
};

exports.mail = {
    //interval: 86400000,
    interval: 2000,
    options: {
        from: 'Philanthropist Log Aggregator',
        to: 'jacob.s.harding@gmail.com',
        subject: 'Philanthropist Log Report',
        text: '',
        html: ''
    }
};
