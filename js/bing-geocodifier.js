// var BingGeocoder = require('tribune-bing-geocoder').BingGeocoder;
// var debounce = require('debounce');

// function debounce(delay, callback) {
//     var timeout = null;
//     return function () {
//         // if a timeout has been registered before then
//         // cancel it so that we can setup a fresh timeout
//         if (timeout) {
//             clearTimeout(timeout);
//         }
//         var args = arguments;
//         timeout = setTimeout(function () {
//             callback.apply(null, args);
//             timeout = null;
//         }, delay);
//     };
// }

var jsonp = {
    callbackCounter: 0,
    head: document.getElementsByTagName('head')[0],
    fetch: function(url, callback) {
        var fn = 'JSONPCallback_' + this.callbackCounter++;
        window[fn] = this.evalJSONP(callback);
        url = url.replace('=JSONPCallback', '=' + fn);

        var scriptTag = document.createElement('script');
        scriptTag.src = url;
        this.head.appendChild(scriptTag);

    },

    evalJSONP: function(callback) {
        this.head.removeChild(this.head.childNodes[this.head.childNodes.length - 1]);

        return function(data) {
            callback(data);
        };
    }
};

var BingGeocodifier = function(el, params) {
    this.el = document.getElementById(el);
    this.bingApiKey = params.key || null;
    // this.geocoder = new BingGeocoder(params.key);
    this.results = null;
    this.filters = params.filters || null;
    this.selectedResult = null;


    this.lookupForm = document.createElement("form");
    this.lookupForm.id = 'bing-geocodifier-form';
    this.lookupForm.className = 'geocodifier-form';
    this.textInput = document.createElement("input");
    this.textInput.setAttribute("type", "text");
    this.textInput.setAttribute("autocomplete", "off");
    this.textInput.className = "geocodify-input";

    if (params.defaultText) {
        this.textInput.setAttribute("placeholder", params.defaultText);
    } else {
        this.textInput.setAttribute("placeholder", "Search for a location");
    }

    this.dropdown = document.createElement("div");
    this.dropdown.className = "geocodify-dropdown hidden";
    this.id = "bing-geocodifier-dropdown";

    this.lookupForm.appendChild(this.textInput);
    this.lookupForm.appendChild(this.dropdown);
    this.el.appendChild(this.lookupForm);

    if (params.onClick) {
        this.onItemClick = params.onClick;
    }

    var self = this;

    this.lookupForm.addEventListener('keyup', this.onKeyUp.bind(this));
    this.lookupForm.addEventListener('click', this.onClick.bind(this));
};

BingGeocodifier.prototype.bingApiUrl = 'https://dev.virtualearth.net/REST/v1/Locations/';

BingGeocodifier.prototype.onItemClick = function(item) {

};

BingGeocodifier.prototype.onClick = function(e) {
    var target = e.target;

    if (target.tagName.toLowerCase() === 'li') {
        var siblings = target.parentNode.children,
            item, coords;

        for (var i = 0; i < siblings.length; i += 1) {
            if (target.parentNode.children[i] === e.target) {
                item = this.results[i];

                coords = item.geocodePoints[0].coordinates;

                this.fillTextInput(item);
            }
        }

    }
};


BingGeocodifier.prototype.fillTextInput = function(item) {
    // Don't call if this is already the value in the text box
    if (this.textInput.value !== item.name) {
        this.textInput.value = item.name;
        this.dropdown.classList.add("hidden");
        this.onItemClick(item, item.geocodePoints[0].coordinates);
    }
};

BingGeocodifier.prototype.onKeyUp = function(e) {

    switch(e.keyCode) {
        // escape, exit search drop down
        case 27:
            this.hideSearchDropDown();
            break;
        // enter
        case 13:
            e.stopPropagation();
            e.preventDefault();
            this.triggerKeySelect();
            break;
        // right arrow
        // Check if cursor is at the end of the selection string
        // If so, then autocomplete with the top returned result
        // (If that exists)
        case 39:
            if (this.textInput.selectionStart === this.textInput.value.length) {
               // this.triggerKeySelect();
            }
            break;
        // Up arrow
        case 38:
            e.stopPropagation();
            e.preventDefault();

            document.querySelector('.active').classList.remove('active');

            if (this.selectedResult && this.selectedResult > 0) {
                this.selectedResult--;
            } else {
                this.selectedResult = this.results.length - 1;
            }

            document.querySelectorAll('.geocodify-dropdown li')[this.selectedResult].classList.add('active');
            break;
        // Down arrow
        case 40:
            e.stopPropagation();
            e.preventDefault();

            document.querySelector('.active').classList.remove('active');

            if (this.selectedResult < this.results.length - 1) {
                this.selectedResult++;
            } else {
                this.selectedResult = 0;
            }

            document.querySelectorAll('.geocodify-dropdown li')[this.selectedResult].classList.add('active');
            break;
        // Any other keypress
        default:
            this.getGeocodeData();
    }
};

BingGeocodifier.prototype.triggerKeySelect = function() {
    if (this.results && this.results.length > -1) {
        var index = this.selectedResult,
            item = this.results[index];

        this.fillTextInput(item);
    }

};



BingGeocodifier.prototype.filterResults = function(bingdata) {
    var results = bingdata.resourceSets[0].resources,
        self = this;

    function filterResults (result) {
        return result.address[filter] === self.filters[filter];
    }

    for (var filter in this.filters) {
        results = results.filter(filterResults);
    }

    return results;
};


BingGeocodifier.prototype.buildAutofillList = function() {
    var results = this.results;

    if (results.length > 0) {
        this.selectedResult = 0;
        this.dropdown.innerHTML = "";
        var searchDropdownList = document.createElement("ul");

        for (var i = 0; i < results.length; i += 1) {
            var listItem = document.createElement("li");
            listItem.textContent = results[i].name;

            if (i === 0) {
                listItem.classList.add("active");
            }

            searchDropdownList.appendChild(listItem);

        }

        this.dropdown.appendChild(searchDropdownList);
        this.dropdown.classList.remove("hidden");
    } else {
        // hide if nothing is selected
        this.dropdown.classList.add("hidden");
    }
};


BingGeocodifier.prototype.getGeocodeData = function(e) {
    var self = this;


    if (this.textInput.value.trim() !== '') {
        var userVal = $("#bing-geocodifier-form input").val();

        // if coordinates
        if (userVal.indexOf(",") != -1 || userVal.indexOf(", ") != -1 ) {
            var coords = userVal.replace(' ','').split(',');

            if (coords.length == 2 && !isNaN(coords[0]) && !isNaN(coords[1]) && coords[0].length > 0 && coords[1].length > 0) {
                // move the map
                map.panTo(coords);
                $(".geocodify-dropdown").addClass("hidden");

                // add popup text if it exists
                // check for popup text
                var userPopupText = $("#popupText").val();

                if (userPopupText.length > 0) {
                    popupMarker = L.circleMarker(coords,{
                        'fillOpacity': 0,
                        'opacity': 0
                    }).bindPopup(userPopupText).addTo(map).openPopup();
                }

            } else {
                // if not coordiantes
                var toGeocode = this.textInput.value,
                    url = this.bingApiUrl + "?q=" + encodeURIComponent(toGeocode) + '&key=' + this.bingApiKey + "&maxResults=10&jsonp=JSONPCallback";


                jsonp.fetch(url, function(data) {
                    self.results = self.filterResults(data);
                    self.buildAutofillList();
                });

            }

            // self.buildAutofillList();
        }

    }
};

BingGeocodifier.prototype.hideSearchDropDown = function() {
    this.dropdown.innerHTML = "";
    this.dropdown.classList.add("hidden");
    this.textInput.value = '';
};

window.BingGeocodifier = BingGeocodifier;