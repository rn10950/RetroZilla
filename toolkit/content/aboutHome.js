/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// about:home JS

// XPCOM preferences integration
var prefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch);

var aboutHomeAutofocus = prefs.getBoolPref("rzHome.autofocus");
var searchEngineURL = prefs.getCharPref("keyword.URL");
var currentUsedVersion = prefs.getIntPref("retrozilla.version");

//check to see if custom search pref url exists
var prefServiceBranch = Components.classes["@mozilla.org/preferences-service;1"]
	.getService(Components.interfaces.nsIPrefService).getBranch("");
if(prefServiceBranch.getPrefType('rzHome.customsearch')){
	//key exist!
	var searchEngineURL = prefs.getCharPref("rzHome.customsearch");
} else {
	// use Google
	var searchEngineURL = "http://www.google.com/search?q=";
}

// autofocus function
function autoFocus() {
	document.getElementById("rzSearch").focus();
}

// update checker function
function checkForUpdate() {
    var img = document.createElement("img");
    img.onload = function() {
        // connected
		
		// add JS file with newest version # to page
		var h = document.getElementsByTagName('head').item(0);
		var newScript = document.createElement('script');
		newScript.src = "https://raw.githubusercontent.com/rn10950/RetroZilla/master/update/currentReleaseVersion.js";
		h.appendChild(newScript);
		// wait for script to load
		setTimeout(function () {
			//alert(currentReleaseVersion()); // used for debug
			//var currentUsedVersion = 1; // used for debug
			if(currentUsedVersion < currentReleaseVersion()) {
				// used version older or equal 
				//alert("using older version");  // used for debug
				document.getElementById("updateNotifier").setAttribute("class", "showUpdate");
			}
		}, 500);
    };
    img.onerror = function() {
        // not connected
    };
    img.src = "https://raw.githubusercontent.com/rn10950/RetroZilla/master/update/ping.gif";
}

// onload function (used to allow for autofocus)
window.onload = function() {
	if (aboutHomeAutofocus == true) {
		autoFocus();
	}
	//alert(currentUsedVersion);
	// set current year
	var d = new Date();
	var cYear = d.getFullYear();
	document.getElementById("currentYear").innerHTML = cYear;
	checkForUpdate();
};

// function that runs when the "Search" button is clicked
function rzSearch() {
	var searchQuery = document.getElementById("rzSearch").value;
	var searchURL = searchEngineURL + searchQuery;
	//alert("Location: " + searchURL); // for debug purposes
	window.location.replace(searchURL);
}