pubnub = require 'pubnub'
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

pn = pubnub.init
  subscribe_key: 'sub-c-4a330ce2-ced1-11e2-9fea-02ee2ddab7fe'
  publish_key: 'pub-c-ceff350b-b55f-4747-abdf-6cf0867a8620'

pn.subscribe
  channel: 'test'
  callback: (message) ->
    message = JSON.parse message
    console.log message

# Hold all users and location

# Hold all nodes created
nodes = []

# Node class
class Node
  constructor: (@name, @lat, @long, @radius) ->
    @name = @name

  isNear: (lat, long) ->
    distance = calculateDistance @lat, @long, lat, long
    distance = Math.abs distance

    console.log distance

    # Radius is in meters, distance is in km
    if distance < (@radius / 1000)
      true
    else
      false

# create node internal function
createNode = (coords, name, radius) ->
  nodes.push new Node(name, coords.lat, coords.long, radius)
  console.log "Created node: #{name}"

# createNode
# {
#   coords: { lat: 123, long: 456 }
#   name: 'ABC'
# }
pn.subscribe
  channel: 'createNode'
  callback: (message) ->
    message = JSON.parse message
    console.log message
    exists = false
    for node in nodes
      if node.name is message.name
        exists = true

    unless exists
      createNode message.coords, message.name, message.radius
      message.uuid = null
      pn.publish
        channel: 'createNode'
        message: JSON.stringify message
    else
      pn.publish
        channel: message.uuid
        message: "Name #{message.name} is already taken."

# Use rest service for reporting position
app = connect()
app.use(connect.logger('dev'))

app.use connect.static('../client')

app.use '/nodes', connect.json()
app.use '/nodes', (req, res) ->
  data = req.body
  console.log data

  foundNodes = []
  for node in nodes
    if node.isNear data.location.latitude, data.location.longitude
      foundNodes.push
        name: node.name
        lat: node.lat
        long: node.long
        radius: node.radius

  res.end JSON.stringify foundNodes

app.listen(3001)
