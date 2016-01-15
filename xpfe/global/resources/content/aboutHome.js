/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// about:home JS

// XPCOM preferences integration
var prefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch);

var aboutHomeAutofocus = prefs.getBoolPref("rzHome.autofocus");
var searchEngineURL = prefs.getCharPref("keyword.URL");

var searchURL = "http://www.google.com/search?q=";

// autofocus function
function autoFocus() {
	document.getElementById("rzSearch").focus();
}

// onload function (used to allow for autofocus)
window.onload = function() {
	if (aboutHomeAutofocus == true) {
		autoFocus();
	}
};

// function that runs when the "Search" button is clicked
function rzSearch() {
	var searchQuery = document.getElementById("rzSearch").value;
	var searchURL = searchEngineURL + searchQuery;
	window.location.replace(searchURL);
}