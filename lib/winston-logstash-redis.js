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
   this.server_app = options.app || 'not specified';
   this.server_hostname  = require('os').hostname();
   this.server_pid = process.pid;
   this.server_env = process['env']['NODE_ENV'];

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
   meta.server_app = self.server_app
   meta.server_hostname = self.server_hostname
   meta.server_pid = self.server_pid
   meta.server_env = self.server_env
   
   var output = common.log({
     level: level,
     message: msg,
     meta: meta,
     timestamp: self.timestamp,
     json: true,
     logstash: 'v1'
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
