 var util = require('util');
 var winston = require('winston');
 var redis = require('redis');
 var common = require('winston/lib/winston/common');

 var LogstashRedis = exports.LogstashRedis = function (options) {
   winston.Transport.call(this, options);

   var self = this;

   options = options || {};
   options.host = options.host || 'localhost';
   options.port = options.port || 6379;
   this.source_app = options.app || 'not specified';
   this.source_hostname  = require('os').hostname();
   this.source_pid = process.pid;
   this.source_env = process['env']['NODE_ENV'];

   this.name = 'logstashRedis';
   this.level = options.level || 'info';
   this.redis = redis.createClient(options.port, options.host);

   this.timestamp = options.timestamp || true;

   if (options.auth) {
     this.redis.auth(options.auth);
   }

   this.redis.on('error', function (err) {
     self.emit('error', err);
   });

 };

 util.inherits(LogstashRedis, winston.Transport);

 LogstashRedis.prototype.log = function (level, msg, meta, callback) {
   var self = this;
   var output = common.log({
     level: level,
     message: msg,
     meta: meta,
     timestamp: self.timestamp,
     json: true,
     logstash: 'v1',
     source_app: self.source_app,
     source_hostname: self.source_hostname,
     source_pid: self.source_pid,
     source_env: self.source_env
   });

   this.redis.rpush('logstash', output, function (err) {
     if (err) {
       if (callback) callback(err, false);
       return self.emit('error', err);
     }
     self.emit('logged');
     if (callback) callback(null, true);
   });
 };
 winston.transports.LogstashRedis = LogstashRedis;
