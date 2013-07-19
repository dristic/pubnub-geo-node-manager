calculateDistance = (lat1, lon1, lat2, lon2) ->
  R = 6371
  dLat = (lat2 - lat1).toRad()
  dLon = (lon2 - lon1).toRad()
  a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1.toRad()) * Math.cos(lat2.toRad()) * 
        Math.sin(dLon / 2) * Math.sin(dLon / 2)
  c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  d = R * c
  return d

Number.prototype.toRad = () ->
  return this * Math.PI / 180

chilled = [
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{'visibility': 'simplified'}]
  }, {
    featureType: 'road.arterial',
    stylers: [
     {hue: 149},
     {saturation: -78},
     {lightness: 0}
    ]
  }, {
    featureType: 'road.highway',
    stylers: [
      {hue: -31},
      {saturation: -40},
      {lightness: 2.8}
    ]
  }, {
    featureType: 'poi',
    elementType: 'label',
    stylers: [{'visibility': 'off'}]
  }, {
    featureType: 'landscape',
    stylers: [
      {hue: 163},
      {saturation: -26},
      {lightness: -1.1}
    ]
  }, {
    featureType: 'transit',
    stylers: [{'visibility': 'off'}]
  }, {
    featureType: 'water',
    stylers: [
      {hue: 3},
      {saturation: -24.24},
      {lightness: -38.57}
    ]
  }
]

uuid = PUBNUB.uuid()

pubnub = PUBNUB.init
  subscribe_key: 'sub-c-4a330ce2-ced1-11e2-9fea-02ee2ddab7fe'
  publish_key: 'pub-c-ceff350b-b55f-4747-abdf-6cf0867a8620'
  uuid: uuid

console.log 'Listening to', uuid
pubnub.subscribe
  channel: uuid
  callback: (message) ->
    console.log message

if navigator.geolocation
  console.log "Geolocation is supported!"
else
  console.log "Geolocation is not supported for this"

onError = (error) ->
  alert 'Error has occurred: ' + error.code

# Globals
map = {}
nodes = []
startPos = {}
currentPos = {}
currentNode = ''
nodes = []

# Node class that holds view information and updates presence
class Node
  constructor: (@name, @radius, @lat, @long) ->
    @el = $("<a href='#'>#{@name}</a>")
    @users = 0

    pubnub.subscribe
      channel: @name
      callback: (message) =>
        # Do nothing
      presence: (message) =>
        if message.action is 'join'
          @users++
        else if message.action is 'leave'
          @users--
        @el.text("#{@name} (#{@users})")

    opts =
      fillColor: 'blue'
      fillOpacity: 0.1
      strokeColor: 'blue'
      strokeWeight: 2
      map: map
      center: new google.maps.LatLng lat, long
      radius: radius
      title: name

    @circle = new google.maps.Circle opts

    @el.on 'click', (event) =>
      unless currentNode is ''
        pubnub.unsubscribe
          channel: currentNode
        $('#messages').html($('#messages').html() + "--Left room #{currentNode}--<br />")

      currentNode = @name

      $('#messages').html($('#messages').html() + "--Joined room #{currentNode}--<br />")

      pubnub.subscribe
        channel: currentNode
        callback: (message) ->
          console.log "Node returned #{message}"
          $('#messages').html($('#messages').html() + "#{message}<br />")
          $("#messages").animate({ scrollTop: $('#messages').height() }, "slow");
        presence: (message) ->
          console.log "Presence node #{message}"

  destroy: () ->
    pubnub.unsubscribe
      channel: @name
    @circle.setMap null
    @el.off 'click'
    delete @name
    delete @radius
    delete @lat
    delete @long
    delete @circle

# Get the nodes from the server and bind them to node objects
updateNodes = () ->
  pubnub.publish
    channel: 'getNodes'
    message: JSON.stringify
      name: 'AUser'
      uuid: uuid
      location:
        latitude: currentPos.coords.latitude
        longitude: currentPos.coords.longitude

pubnub.subscribe
  channel: uuid
  connect: () ->
    updateNodes()
  callback: (data) ->
    data = JSON.parse data
    console.log 'getNodes', data
    
    if data.type is 'getNodes'
      $('#nodes a').off('click')
      $('#nodes').html("Nodes located in: ")

      for node in nodes
        node.destroy()
      nodes = []

      for node in data.near
        nodes.push new Node node.name, node.radius, node.lat, node.long

      for node in data.inside
        nodes.push new Node node.name, node.radius, node.lat, node.long
        $('#nodes').append(nodes[nodes.length - 1].el)

$(document).ready () ->
  # Get the current position and initialize the map
  navigator.geolocation.getCurrentPosition ((position) ->
    startPos = position
    currentPos = position

    if localStorage['location']
      startPos = JSON.parse localStorage['location']

    updateNodes()

    styledMapType = new google.maps.StyledMapType chilled, { name: 'Chilled' }

    mapOptions =
      center: new google.maps.LatLng(startPos.coords.latitude, startPos.coords.longitude)
      zoom: 15
      mapTypeId: google.maps.MapTypeId.ROADMAP
      disableDefaultUI: true
      mapTypeId: 'Chilled'
      mapTypeControlOptions:
        mapTypeIds: [google.maps.MapTypeId.ROADMAP, 'map_style']

    map = new google.maps.Map(document.getElementById("map-canvas"), mapOptions)
    map.mapTypes.set 'map_style', styledMapType
    map.setMapTypeId 'map_style'

    marker = new google.maps.Marker
      position: mapOptions.center
      title: "Hello World!"
      map: map
  ), onError

  # Watch the geolocation over time
  navigator.geolocation.watchPosition (position) ->
    currentPos = position

    if localStorage['location']
      currentPos = JSON.parse localStorage['location']

    updateNodes()

    map.setCenter new google.maps.LatLng(currentPos.coords.latitude, currentPos.coords.longitude)

  # Sends a create node command to the server
  document.querySelector('#create-node').onclick = (event) ->
    nodeName = $('#node-name').val()
    radius = parseInt($('#radius').val())
    pubnub.publish
      channel: 'createNode'
      message: JSON.stringify
        uuid: uuid
        name: nodeName
        radius: radius
        coords:
          lat: currentPos.coords.latitude
          long: currentPos.coords.longitude
      callback: () ->
        updateNodes()

  # Bindings for sending chat messages
  $('#send-message').on 'click', (event) ->
    message = $('#message').val()

    if message != ''
      pubnub.publish
        channel: currentNode
        message: message
