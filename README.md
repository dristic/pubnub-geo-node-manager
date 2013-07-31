Geo Node Manager
=====================
This repo is an example of using a geolocation based project with the PubNub API. The application allows users to create geo "nodes" which is essentially a coordinate in the world with a radius around it that users can interact in.

The client is all built in JavaScript using the Google Maps API and the geolocation API from the browser spec. The UX is mostly formatted for phones although also works on desktops. The server is all built in nodejs and uses PubNub.

The great thing about this project is that all the communication is done with PubNub. This means that the server can literally be hosted anywhere and does not need port 80 access to the outside world. With a system like this it is easy to build a scalable and replicated server network instead of relying on one server to do all the request / response.