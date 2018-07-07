import React, { Component } from 'react';
import './App.css';
import scriptLoader from 'react-async-script-loader';
import escapeRegExp from 'escape-string-regexp';
import sortBy from 'sort-by';

let markers = [];
let infoWindows = [];
let placesToShow = []

class App extends Component {

  state = {
    placesData: require("./Places.json"), // Get places data
    map: {},
    searchQuery: ""
  }

  componentWillReceiveProps({isScriptLoadSucceed}) {
    // First insure the the google maps script has been loaded.
     if (isScriptLoadSucceed) {
      //Create the Map
      const neighborhood_Map = new window.google.maps.Map(document.getElementById('map-container'), {
        zoom: 13,
        // Initial Location
        center: new window.google.maps.LatLng(26.35130543, 50.11153396)
      });
      this.setState({map:neighborhood_Map});
    }

    placesToShow = this.state.placesData.sort(sortBy('title'))

  }

  createForsquareSearchRequest(place) {
    let url = ""
    const client_id = "DXLOHSCPVVI55J4DK31FTWN22KRTAAQYKY4ZANLAZYULNZFO"
    const client_secret = "TGGHZQOZWVWYIIDCFAX1OEH1K2Z2B2HUHRISOSAUNGXRAJEY"
    const v = "20180707"
    let ll = place.location.lat + "," + place.location.lng
    const limit = 1

    // Build the URL
    return url = `https://api.foursquare.com/v2/venues/search?client_id=${client_id}&client_secret=${client_secret}&ll=${ll}&v=${v}&limit=${limit}`
  }

  componentDidUpdate() {
    this.updateMarkers()
  }

  updateMarkers() {
    // Clear the markers
    markers.forEach(mark => { mark.setMap(null) })
    markers = []
    let theApp = this

    // Start Creating the markers
    placesToShow.forEach(function(place) {
      let marker = new window.google.maps.Marker({
        position: place.location,
        map: theApp.state.map,
        title: place.title,
        animation: window.google.maps.Animation.DROP
      })

      // Add click event that opens an infoWindow and bring data from 3rd party API
      marker.addListener('click', function() {
        // First close all infoWindows
        infoWindows.forEach(function(individualInfoWindow) { individualInfoWindow.close() })

        // Add a bouncing effect to the marker to show it has been clicked or selected
        this.setAnimation(window.google.maps.Animation.BOUNCE);
        setTimeout(() => {this.setAnimation(null);}, 400)

        // This function will build and open an infoWindow filled with info from Forsquare
        theApp.buildInfoWindow(this, place)
      });

      markers.push(marker)

    })

    // Set the map bounds
    let bounds = new window.google.maps.LatLngBounds();
    markers.forEach((marker) => bounds.extend(marker.position))
    theApp.state.map.fitBounds(bounds)
  }



  buildInfoWindow(marker, place) {
    let infoWindow
    const thisApp = this

    // Below code makes 2 requests to Forsquare
    //  1) First request sends the location and get information about the first venue returned
    //  2) Second request uses the venue ID to get an image for that venue

    // Once we get venue information and image, we start building and opening the infoWindow

    // First search for a venue using current place
    // Build the URL to request venue information
    let url = this.createForsquareSearchRequest(place)
    fetch(url).then(function(response) {
      return response.json();
    }).then(function(myJSON) {

      // Create another request to get an image of the venue
      const imageRequest = `https://api.foursquare.com/v2/venues/${myJSON.response.venues[0].id}/photos?v=20180707&client_id=DXLOHSCPVVI55J4DK31FTWN22KRTAAQYKY4ZANLAZYULNZFO&client_secret=TGGHZQOZWVWYIIDCFAX1OEH1K2Z2B2HUHRISOSAUNGXRAJEY`
      fetch(imageRequest).then(function(imageResponse) {
        return imageResponse.json()
      }).then(function(imageResponseJSON) {
        // Build the image URL out of the recieved json response
        let imageURL = imageResponseJSON.response.photos.items[0].prefix + "width200" + imageResponseJSON.response.photos.items[0].suffix

        // Since both requests are successful and we have all the data, start building the InfoWindow
        let infoWindowHTMLContent = `<div style="width: 200px;">
                                        <img src="${imageURL}" alt="${myJSON.response.venues[0].name} Image" tabindex="0"/>
                                        <p tabindex="0"><strong>Name: </strong>${myJSON.response.venues[0].name}</p>
                                        <p tabindex="0"><strong>Category: </strong>${myJSON.response.venues[0].categories[0].name}</p>
                                    </div>`
        infoWindow = new window.google.maps.InfoWindow({
          content: infoWindowHTMLContent
        })

        infoWindows.push(infoWindow)      // Save the created InfoWindow in infoWindows array for easy access later
        infoWindow.open(thisApp, marker)  // Open the infoWindow

      }).catch(function(imageError) {
        // If the image was not fetched, create an infoWindow without the image.
        let infoWindowHTMLContent = `<div style="width: 200px;">
                                        <p tabindex="0"><strong>Name: </strong>${myJSON.response.venues[0].name}</p>
                                        <p tabindex="0"><strong>Category: </strong>${myJSON.response.venues[0].categories[0].name}</p>
                                     </div>`
        infoWindow = new window.google.maps.InfoWindow({
          content: infoWindowHTMLContent
        })
        infoWindows.push(infoWindow)      // Save the created InfoWindow in infoWindows array for easy access later
        infoWindow.open(thisApp, marker)  // Open the infoWindow
        console.log("Image was not fetched");
      })
    }).catch(function(error) {
      // If the first request to Forsquare failed, show an infoWindow that shows an error message to the user
      let infoWindowHTMLContent = `<p tabindex="0">Error while fetching data from Forsquare</p>`
      infoWindow = new window.google.maps.InfoWindow({
        content: infoWindowHTMLContent
      })
      infoWindows.push(infoWindow)      // Save the created InfoWindow in infoWindows array for easy access later
      infoWindow.open(thisApp, marker)  // Open the infoWindow
      console.log("The entire request to Forsquare failed")
    })
  }

  // FUNCTION: This function is called when a list item is clicked on.
  //           It maps the list item to its corresponding marker and then open that marker's infoWindow
  openMarker = (clickedListItem) => {
    // Find the marker to open
    // The clickedListItem variable is not the list item DOM object. It is the place taken from the application state.
    let markerToOpen = markers.filter((marker) => marker.title === clickedListItem.title)[0]

    // Trigger a click event to the marker to open the infoWindow
    window.google.maps.event.trigger(markerToOpen, 'click');
  }

  updateQuery = (queryString) => {
    const {placesData} = this.state
    placesToShow = placesData

    if (queryString) { // If the user is searching
      // Start filtering
      const match = new RegExp(escapeRegExp(queryString),'i')
      placesToShow = placesData.filter((place) => match.test(place.title))
    }
    else {
      placesToShow = placesData
    }

    // Sort the results after filtering
    placesToShow = placesToShow.sort(sortBy('title'))

    this.setState({ searchQuery: queryString })
    this.updateMarkers()
  }

  openMarkerOnKeyPress = (event, PressedListItem) => {
    if (event.charCode === 13) {
      // Find the marker to open
      // The clickedListItem variable is not the list item DOM object. It is the place taken from the application state.
      let markerToOpen = markers.filter((marker) => marker.title === PressedListItem.title)[0]

      // Trigger a click event to the marker to open the infoWindow
      window.google.maps.event.trigger(markerToOpen, 'click');
    }
  }

  render() {
    const {placesData, searchQuery} = this.state;
    return (
      <div className="App">
        <header className="App-header">
          <h1 className="App-title">My Neighborhood Map</h1>
        </header>

        <div className="sidenav">
          <input
            className="filter-field"
            type="text"
            placeholder="Search ..."
            maxLength="10"
            value={searchQuery}
            onChange={(event) => this.updateQuery(event.target.value)}
            role="search"
            tabIndex="1"
          />
          <ul>
          {placesToShow.map((place, index) =>
            <li
              key={index}
              tabIndex={index + 2}
              onClick={() => this.openMarker(place)}
              onKeyPress={(event) => this.openMarkerOnKeyPress(event, place)}
              aria-labelledby={place.title}
            >
            {place.title}
            </li>
          )}
          </ul>
        </div>
        <div id="map-container"></div>
      </div>
    );
  }
}

export default scriptLoader(
    [`https://maps.googleapis.com/maps/api/js?key=AIzaSyAFUK1zY-YpOxzfsEE8_GKkWk_fXIXdJzo&libraries=places`]
    )(App);
