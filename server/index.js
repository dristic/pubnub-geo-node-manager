// Generated by CoffeeScript 1.6.3
(function() {
  var NEAR_DISTANCE, Node, PUBNUB, app, calculateDistance, connect, createNode, initialNodes, initializeNodes, nodes, pubnub, _ref;

  PUBNUB = require('pubnub');

  connect = require('connect');

  calculateDistance = function(lat1, lon1, lat2, lon2) {
    var R, a, c, d, dLat, dLon;
    R = 6371;
    dLat = (lat2 - lat1).toRad();
    dLon = (lon2 - lon1).toRad();
    a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1.toRad()) * Math.cos(lat2.toRad()) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    d = R * c;
    return d;
  };

  Number.prototype.toRad = function() {
    return this * Math.PI / 180;
  };

  pubnub = PUBNUB.init({
    subscribe_key: 'sub-c-4a330ce2-ced1-11e2-9fea-02ee2ddab7fe',
    publish_key: 'pub-c-ceff350b-b55f-4747-abdf-6cf0867a8620'
  });

  nodes = [];

  NEAR_DISTANCE = 0;

  Node = (function() {
    function Node(name, lat, long, radius, message) {
      var _this = this;
      this.name = name;
      this.lat = lat;
      this.long = long;
      this.radius = radius;
      this.message = message;
      pubnub.subscribe({
        channel: this.name,
        callback: function(message) {},
        presence: function(message) {
          if (message.action === 'join') {
            return pubnub.publish({
              channel: _this.name,
              message: "Node Message: " + _this.message
            });
          }
        }
      });
    }

    Node.prototype.isNear = function(lat, long) {
      var distance;
      distance = calculateDistance(this.lat, this.long, lat, long);
      distance = Math.abs(distance);
      if (distance > (this.radius / 1000) && distance < (this.radius / 1000) + (NEAR_DISTANCE / 1000)) {
        return true;
      } else {
        return false;
      }
    };

    Node.prototype.isInside = function(lat, long) {
      var distance;
      distance = calculateDistance(this.lat, this.long, lat, long);
      distance = Math.abs(distance);
      if (distance < (this.radius / 1000)) {
        return true;
      } else {
        return false;
      }
    };

    return Node;

  })();

  createNode = function(coords, name, radius, message) {
    nodes.push(new Node(name, coords.lat, coords.long, radius, message));
    return console.log("Created node: " + name);
  };

  pubnub.subscribe({
    channel: 'createNode',
    callback: function(message) {
      var exists, node, _i, _len;
      message = JSON.parse(message);
      console.log(message);
      exists = false;
      for (_i = 0, _len = nodes.length; _i < _len; _i++) {
        node = nodes[_i];
        if (node.name === message.name) {
          exists = true;
        }
      }
      if (exists !== true) {
        createNode(message.coords, message.name, message.radius, message.message);
        message.uuid = null;
        return pubnub.publish({
          channel: 'createNode',
          message: JSON.stringify(message)
        });
      } else {
        return pubnub.publish({
          channel: message.uuid,
          message: JSON.stringify({
            error: "Name " + message.name + " is already taken."
          })
        });
      }
    }
  });

  pubnub.subscribe({
    channel: 'getNodes',
    callback: function(message) {
      var data, insideNodes, nearNodes, node, _i, _len;
      data = JSON.parse(message);
      console.log('getNodes', data);
      nearNodes = [];
      insideNodes = [];
      for (_i = 0, _len = nodes.length; _i < _len; _i++) {
        node = nodes[_i];
        if (node.isNear(data.location.latitude, data.location.longitude)) {
          nearNodes.push({
            name: node.name,
            lat: node.lat,
            long: node.long,
            radius: node.radius
          });
        }
        if (node.isInside(data.location.latitude, data.location.longitude)) {
          insideNodes.push({
            name: node.name,
            lat: node.lat,
            long: node.long,
            radius: node.radius
          });
        }
      }
      console.log('Publishing to', data.uuid);
      return pubnub.publish({
        channel: data.uuid,
        message: JSON.stringify({
          type: 'getNodes',
          near: nearNodes,
          inside: insideNodes
        })
      });
    }
  });

  app = connect();

  app.use(connect.logger('dev'));

  app.use(connect["static"]('client'));

  app.listen((_ref = process.env.PORT) != null ? _ref : 5000);

  initialNodes = [
    {
      name: 'Point1',
      radius: 150,
      message: 'Welcome to the PubNub scavenger hunt!',
      coords: {
        lat: 37.765155,
        long: -122.394707
      }
    }, {
      name: 'Point2',
      radius: 150,
      message: 'Best photo interpretation of H2O. Now take your H2O bottle, grab some peanuts and cracker jacks and take a 7th inning stretch before hitting the diamond',
      coords: {
        lat: 37.767741,
        long: -122.392604
      }
    }, {
      name: 'Point3',
      radius: 100,
      message: 'Film someone running the bases. Now you can blow off some Steam and grab a cold one at this SF icon.',
      coords: {
        lat: 37.764468,
        long: -122.399631
      }
    }, {
      name: 'Point4',
      radius: 100,
      message: 'Get a coaster. At this location you can either signup for Greenpeace or buy a $10 container of organic blueberries',
      coords: {
        lat: 37.763208,
        long: -122.40108
      }
    }, {
      name: 'Point5',
      radius: 100,
      message: 'Photograph the most expensive item. For all your hard work',
      coords: {
        lat: 37.764417,
        long: -122.402764
      }
    }
  ];

  initializeNodes = function() {
    var initialNode, _i, _len, _results;
    _results = [];
    for (_i = 0, _len = initialNodes.length; _i < _len; _i++) {
      initialNode = initialNodes[_i];
      _results.push(createNode(initialNode.coords, initialNode.name, initialNode.radius, initialNode.message));
    }
    return _results;
  };

  setTimeout(initializeNodes, 5000);

}).call(this);
