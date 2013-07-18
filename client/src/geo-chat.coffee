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

uuid = PUBNUB.uuid()

pubnub = PUBNUB.init
  subscribe_key: 'sub-c-4a330ce2-ced1-11e2-9fea-02ee2ddab7fe'
  publish_key: 'pub-c-ceff350b-b55f-4747-abdf-6cf0867a8620'
  uuid: uuid

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

map = {}
nodes = []
createNode = (name, lat, long, radius) ->
  console.log "Creating #{name} #{lat} #{long}"
  opts =
    fillColor: 'blue'
    fillOpacity: 0.1
    strokeColor: 'blue'
    strokeWeight: 2
    map: map
    center: new google.maps.LatLng lat, long
    radius: radius
    title: name

  nodes.push new google.maps.Circle opts

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

startPos = {}
currentPos = {}
currentNode = ''
$(document).ready () ->
  navigator.geolocation.getCurrentPosition ((position) ->
    startPos = position

    if localStorage['location']
      startPos = JSON.parse localStorage['location']

    document.getElementById('startLocation').innerHTML = startPos.coords.latitude + " : " + startPos.coords.longitude

    $.ajax
      type: 'POST'
      url: 'http://localhost:3001/nodes'
      headers:
        'Content-Type': 'application/json'
      data: JSON.stringify
        name: 'Testing'
        location: startPos.coords
      success: (data) ->
        data = JSON.parse data
        console.log data

        $('#nodes').html("Nodes in your area: ")

        for node in data
          createNode node.name, node.lat, node.long, node.radius
          node = new Node node.name, node.radius, node.lat, node.long
          $('#nodes').append(node.el)

        $('#nodes a').off('click')
        $('#nodes a').on 'click', (event) ->
          target = $ event.target
          currentNode = target.text()

          pubnub.subscribe
            channel: currentNode
            callback: (message) ->
              console.log "Node returned #{message}"
              $('#messages').html($('#messages').html() + "#{message}<br />")
            presence: (message) ->
              console.log "Presence node #{message}"

    mapOptions =
      center: new google.maps.LatLng(startPos.coords.latitude, startPos.coords.longitude)
      zoom: 15
      mapTypeId: google.maps.MapTypeId.ROADMAP

    map = new google.maps.Map(document.getElementById("map-canvas"), mapOptions)

    marker = new google.maps.Marker
      position: mapOptions.center
      title: "Hello World!"
      map: map
  ), onError

  navigator.geolocation.watchPosition (position) ->
    currentPos = position

    document.getElementById('curLocation').innerHTML = currentPos.coords.latitude + " : " + currentPos.coords.longitude

    document.getElementById('distance').innerHTML = calculateDistance startPos.coords.latitude,
      startPos.coords.longitude,
      currentPos.coords.latitude,
      currentPos.coords.longitude

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

  # Create nodes on the map as they get created if they are within 10 km
  pubnub.subscribe
    channel: 'createNode'
    callback: (message) ->
      message = JSON.parse message

      unless message.uuid
        distance = calculateDistance startPos.coords.latitude, startPos.coords.longitude, message.coords.lat, message.coords.long

        if distance < 10
          createNode message.name, message.coords.lat, message.coords.long, message.radius

  # Bindings for sending chat messages
  $('#send-message').on 'click', (event) ->
    message = $('#message').val()

    if message != ''
      pubnub.publish
        channel: currentNode
        message: message
