PUBNUB = require 'pubnub'
connect = require 'connect'

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

pubnub = PUBNUB.init
  subscribe_key: 'sub-c-4a330ce2-ced1-11e2-9fea-02ee2ddab7fe'
  publish_key: 'pub-c-ceff350b-b55f-4747-abdf-6cf0867a8620'

# Hold all nodes created
nodes = []

# Node class
class Node
  constructor: (@name, @lat, @long, @radius, @message) ->
    # Add join message
    pubnub.subscribe
      channel: @name
      callback: (message) ->
        # Do nothing
      presence: (message) =>
        if message.action is 'join'
          pubnub.publish
            channel: @name
            message: "Node Message: #{@message}"

  isNear: (lat, long) ->
    distance = calculateDistance @lat, @long, lat, long
    distance = Math.abs distance

    console.log distance

    # Radius is in meters, distance is in km
    if distance > (@radius / 1000) and distance < (@radius / 1000) + (500 / 1000)
      true
    else
      false

  isInside: (lat, long) ->
    distance = calculateDistance @lat, @long, lat, long
    distance = Math.abs distance

    console.log distance

    # Radius is in meters, distance is in km
    if distance < (@radius / 1000)
      true
    else
      false

# create node internal function
createNode = (coords, name, radius, message) ->
  nodes.push new Node(name, coords.lat, coords.long, radius, message)
  console.log "Created node: #{name}"

# createNode
# {
#   coords: { lat: 123, long: 456 }
#   name: 'ABC'
# }
pubnub.subscribe
  channel: 'createNode'
  callback: (message) ->
    message = JSON.parse message
    console.log message
    exists = false
    for node in nodes
      if node.name is message.name
        exists = true

    unless exists is true
      createNode message.coords, message.name, message.radius, message.message
      message.uuid = null
      pubnub.publish
        channel: 'createNode'
        message: JSON.stringify message
    else
      pubnub.publish
        channel: message.uuid
        message: JSON.stringify
          error: "Name #{message.name} is already taken."

pubnub.subscribe
  channel: 'getNodes'
  callback: (message) ->
    data = JSON.parse message
    console.log 'getNodes', data

    nearNodes = []
    insideNodes = []
    for node in nodes
      if node.isNear data.location.latitude, data.location.longitude
        nearNodes.push
          name: node.name
          lat: node.lat
          long: node.long
          radius: node.radius
      if node.isInside data.location.latitude, data.location.longitude
        insideNodes.push
          name: node.name
          lat: node.lat
          long: node.long
          radius: node.radius

    console.log 'Publishing to', data.uuid
    pubnub.publish
      channel: data.uuid
      message: JSON.stringify
        type: 'getNodes'
        near: nearNodes
        inside: insideNodes

# Use rest service for serving the client
app = connect()
app.use(connect.logger('dev'))
app.use connect.static('client')
app.listen(process.env.PORT || 5000)
