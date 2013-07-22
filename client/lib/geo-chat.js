(function() {
  var Node, calculateDistance, chilled, currentNode, currentPos, lastTimeout, map, nodes, onError, pubnub, startPos, updateNodes, updateTimeout, uuid;

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

  chilled = [
    {
      featureType: 'road',
      elementType: 'geometry',
      stylers: [
        {
          'visibility': 'simplified'
        }
      ]
    }, {
      featureType: 'road.arterial',
      stylers: [
        {
          hue: 149
        }, {
          saturation: -78
        }, {
          lightness: 0
        }
      ]
    }, {
      featureType: 'road.highway',
      stylers: [
        {
          hue: -31
        }, {
          saturation: -40
        }, {
          lightness: 2.8
        }
      ]
    }, {
      featureType: 'poi',
      elementType: 'label',
      stylers: [
        {
          'visibility': 'off'
        }
      ]
    }, {
      featureType: 'landscape',
      stylers: [
        {
          hue: 163
        }, {
          saturation: -26
        }, {
          lightness: -1.1
        }
      ]
    }, {
      featureType: 'transit',
      stylers: [
        {
          'visibility': 'off'
        }
      ]
    }, {
      featureType: 'water',
      stylers: [
        {
          hue: 3
        }, {
          saturation: -24.24
        }, {
          lightness: -38.57
        }
      ]
    }
  ];

  uuid = PUBNUB.uuid();

  pubnub = PUBNUB.init({
    subscribe_key: 'sub-c-4a330ce2-ced1-11e2-9fea-02ee2ddab7fe',
    publish_key: 'pub-c-ceff350b-b55f-4747-abdf-6cf0867a8620',
    uuid: uuid
  });

  console.log('Listening to', uuid);

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

  startPos = {};

  currentPos = {};

  currentNode = '';

  nodes = [];

  updateTimeout = 50000;

  lastTimeout = Date.now();

  Node = (function() {
    function Node(name, radius, lat, long) {
      var opts,
        _this = this;
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
      this.circle = new google.maps.Circle(opts);
      this.el.on('click', function(event) {
        if (currentNode !== '') {
          pubnub.unsubscribe({
            channel: currentNode
          });
          $('#messages').html($('#messages').html() + ("--Left room " + currentNode + "--<br />"));
        }
        currentNode = _this.name;
        $('#messages').html($('#messages').html() + ("--Joined room " + currentNode + "--<br />"));
        return pubnub.subscribe({
          channel: currentNode,
          callback: function(message) {
            console.log("Node returned " + message);
            $('#messages').html($('#messages').html() + ("" + message + "<br />"));
            return $("#messages").animate({
              scrollTop: $('#messages').height()
            }, "slow");
          },
          presence: function(message) {
            return console.log("Presence node " + message);
          }
        });
      });
    }

    Node.prototype.destroy = function() {
      pubnub.unsubscribe({
        channel: this.name
      });
      this.circle.setMap(null);
      this.el.off('click');
      delete this.name;
      delete this.radius;
      delete this.lat;
      delete this.long;
      return delete this.circle;
    };

    return Node;

  })();

  updateNodes = function() {
    return pubnub.publish({
      channel: 'getNodes',
      message: JSON.stringify({
        name: 'AUser',
        uuid: uuid,
        location: {
          latitude: currentPos.coords.latitude,
          longitude: currentPos.coords.longitude
        }
      })
    });
  };

  pubnub.subscribe({
    channel: uuid,
    connect: function() {
      return updateNodes();
    },
    callback: function(data) {
      var node, _i, _j, _k, _len, _len1, _len2, _ref, _ref1, _results;
      data = JSON.parse(data);
      console.log('getNodes', data);
      if (data.type === 'getNodes') {
        $('#nodes a').off('click');
        $('#nodes').html("Nodes located in: ");
        for (_i = 0, _len = nodes.length; _i < _len; _i++) {
          node = nodes[_i];
          node.destroy();
        }
        nodes = [];
        _ref = data.near;
        for (_j = 0, _len1 = _ref.length; _j < _len1; _j++) {
          node = _ref[_j];
          nodes.push(new Node(node.name, node.radius, node.lat, node.long));
        }
        _ref1 = data.inside;
        _results = [];
        for (_k = 0, _len2 = _ref1.length; _k < _len2; _k++) {
          node = _ref1[_k];
          nodes.push(new Node(node.name, node.radius, node.lat, node.long));
          _results.push($('#nodes').append(nodes[nodes.length - 1].el));
        }
        return _results;
      }
    }
  });

  $(document).ready(function() {
    navigator.geolocation.getCurrentPosition((function(position) {
      var mapOptions, marker, styledMapType;
      startPos = position;
      currentPos = position;
      if (localStorage['location']) {
        startPos = JSON.parse(localStorage['location']);
      }
      updateNodes();
      styledMapType = new google.maps.StyledMapType(chilled, {
        name: 'Chilled'
      });
      mapOptions = {
        center: new google.maps.LatLng(startPos.coords.latitude, startPos.coords.longitude),
        zoom: 15,
        mapTypeId: google.maps.MapTypeId.ROADMAP,
        disableDefaultUI: true,
        mapTypeId: 'Chilled',
        mapTypeControlOptions: {
          mapTypeIds: [google.maps.MapTypeId.ROADMAP, 'map_style']
        }
      };
      map = new google.maps.Map(document.getElementById("map-canvas"), mapOptions);
      map.mapTypes.set('map_style', styledMapType);
      map.setMapTypeId('map_style');
      return marker = new google.maps.Marker({
        position: mapOptions.center,
        title: "Hello World!",
        map: map
      });
    }), onError, {
      timeout: 30000,
      enableHighAccuracy: true
    });
    navigator.geolocation.watchPosition(function(position) {
      currentPos = position;
      if (localStorage['location']) {
        currentPos = JSON.parse(localStorage['location']);
      }
      if (Date.now() - lastTimeout > updateTimeout) {
        lastTimeout = Date.now();
        updateNodes();
      }
      return map.setCenter(new google.maps.LatLng(currentPos.coords.latitude, currentPos.coords.longitude));
    });
    document.querySelector('#create-node').onclick = function(event) {
      var nodeMessage, nodeName, radius;
      nodeName = $('#node-name').val();
      nodeMessage = $('#node-message').val();
      radius = parseInt($('#radius').val());
      return pubnub.publish({
        channel: 'createNode',
        message: JSON.stringify({
          uuid: uuid,
          name: nodeName,
          message: nodeMessage,
          radius: radius,
          coords: {
            lat: currentPos.coords.latitude,
            long: currentPos.coords.longitude
          }
        }),
        callback: function() {
          return updateNodes();
        }
      });
    };
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
