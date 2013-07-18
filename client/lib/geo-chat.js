(function() {
  var Node, calculateDistance, createNode, currentNode, currentPos, map, nodes, onError, pubnub, startPos, uuid;

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

  uuid = PUBNUB.uuid();

  pubnub = PUBNUB.init({
    subscribe_key: 'sub-c-4a330ce2-ced1-11e2-9fea-02ee2ddab7fe',
    publish_key: 'pub-c-ceff350b-b55f-4747-abdf-6cf0867a8620',
    uuid: uuid
  });

  pubnub.subscribe({
    channel: uuid,
    callback: function(message) {
      return console.log(message);
    }
  });

  if (navigator.geolocation) {
    console.log("Geolocation is supported!");
  } else {
    console.log("Geolocation is not supported for this");
  }

  onError = function(error) {
    return alert('Error has occurred: ' + error.code);
  };

  map = {};

  nodes = [];

  createNode = function(name, lat, long, radius) {
    var opts;
    console.log("Creating " + name + " " + lat + " " + long);
    opts = {
      fillColor: 'blue',
      fillOpacity: 0.1,
      strokeColor: 'blue',
      strokeWeight: 2,
      map: map,
      center: new google.maps.LatLng(lat, long),
      radius: radius,
      title: name
    };
    return nodes.push(new google.maps.Circle(opts));
  };

  Node = (function() {
    function Node(name, radius, lat, long) {
      var _this = this;
      this.name = name;
      this.radius = radius;
      this.lat = lat;
      this.long = long;
      this.el = $("<a href='#'>" + this.name + "</a>");
      this.users = 0;
      pubnub.subscribe({
        channel: this.name,
        callback: function(message) {},
        presence: function(message) {
          if (message.action === 'join') {
            _this.users++;
          } else if (message.action === 'leave') {
            _this.users--;
          }
          return _this.el.text("" + _this.name + " (" + _this.users + ")");
        }
      });
    }

    return Node;

  })();

  startPos = {};

  currentPos = {};

  currentNode = '';

  $(document).ready(function() {
    navigator.geolocation.getCurrentPosition((function(position) {
      var mapOptions, marker;
      startPos = position;
      if (localStorage['location']) {
        startPos = JSON.parse(localStorage['location']);
      }
      document.getElementById('startLocation').innerHTML = startPos.coords.latitude + " : " + startPos.coords.longitude;
      $.ajax({
        type: 'POST',
        url: 'http://localhost:3001/nodes',
        headers: {
          'Content-Type': 'application/json'
        },
        data: JSON.stringify({
          name: 'Testing',
          location: startPos.coords
        }),
        success: function(data) {
          var node, _i, _len;
          data = JSON.parse(data);
          console.log(data);
          $('#nodes').html("Nodes in your area: ");
          for (_i = 0, _len = data.length; _i < _len; _i++) {
            node = data[_i];
            createNode(node.name, node.lat, node.long, node.radius);
            node = new Node(node.name, node.radius, node.lat, node.long);
            $('#nodes').append(node.el);
          }
          $('#nodes a').off('click');
          return $('#nodes a').on('click', function(event) {
            var target;
            target = $(event.target);
            currentNode = target.text();
            return pubnub.subscribe({
              channel: currentNode,
              callback: function(message) {
                console.log("Node returned " + message);
                return $('#messages').html($('#messages').html() + ("" + message + "<br />"));
              },
              presence: function(message) {
                return console.log("Presence node " + message);
              }
            });
          });
        }
      });
      mapOptions = {
        center: new google.maps.LatLng(startPos.coords.latitude, startPos.coords.longitude),
        zoom: 15,
        mapTypeId: google.maps.MapTypeId.ROADMAP
      };
      map = new google.maps.Map(document.getElementById("map-canvas"), mapOptions);
      return marker = new google.maps.Marker({
        position: mapOptions.center,
        title: "Hello World!",
        map: map
      });
    }), onError);
    navigator.geolocation.watchPosition(function(position) {
      currentPos = position;
      document.getElementById('curLocation').innerHTML = currentPos.coords.latitude + " : " + currentPos.coords.longitude;
      return document.getElementById('distance').innerHTML = calculateDistance(startPos.coords.latitude, startPos.coords.longitude, currentPos.coords.latitude, currentPos.coords.longitude);
    });
    document.querySelector('#create-node').onclick = function(event) {
      var nodeName, radius;
      nodeName = $('#node-name').val();
      radius = parseInt($('#radius').val());
      return pubnub.publish({
        channel: 'createNode',
        message: JSON.stringify({
          uuid: uuid,
          name: nodeName,
          radius: radius,
          coords: {
            lat: currentPos.coords.latitude,
            long: currentPos.coords.longitude
          }
        })
      });
    };
    pubnub.subscribe({
      channel: 'createNode',
      callback: function(message) {
        var distance;
        message = JSON.parse(message);
        if (!message.uuid) {
          distance = calculateDistance(startPos.coords.latitude, startPos.coords.longitude, message.coords.lat, message.coords.long);
          if (distance < 10) {
            return createNode(message.name, message.coords.lat, message.coords.long, message.radius);
          }
        }
      }
    });
    return $('#send-message').on('click', function(event) {
      var message;
      message = $('#message').val();
      if (message !== '') {
        return pubnub.publish({
          channel: currentNode,
          message: message
        });
      }
    });
  });

}).call(this);
