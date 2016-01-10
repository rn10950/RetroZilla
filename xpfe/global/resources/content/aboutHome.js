// set whether autofocus is enabled (will use browser pref in release)
var aboutHomeAutofocus = true;

// autofocus function
function autoFocus() {
	document.getElementById("rzSearch").focus();
}

window.onload = function() {
	if (aboutHomeAutofocus == true) {
		autoFocus();
	}
};