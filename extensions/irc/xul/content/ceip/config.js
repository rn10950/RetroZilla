var client;
var chkClient, chkCommand, lblUserId;

function doLoad()
{
    var opener = window.arguments[0];
    client = opener.client;
    client.ceip.dialog = window;

    // Store XUL elements we'll need.
    chkClient = document.getElementById("ceip-client");
    chkCommand = document.getElementById("ceip-command");
    lblUserId = document.getElementById("ceip-userid");

    // Load values from preferences.
    chkClient.checked = client.prefs["ceip.log.client"];
    chkCommand.checked = client.prefs["ceip.log.command"] ||
                         client.prefs["ceip.log.menu"] ||
                         client.prefs["ceip.log.dialog"];
    lblUserId.value = client.prefs["ceip.userid"];

    window.sizeToContent();
    var woffset = Math.max((opener.outerWidth  - window.outerWidth ) / 2, 0);
    var hoffset = Math.max((opener.outerHeight - window.outerHeight) / 2, 0);
    window.moveTo(opener.screenX + woffset, opener.screenY + hoffset);
}

function doUnload()
{
    delete client.ceip.dialog;
}

function doOK()
{
    // Stop us from ever asking the user about this now.
    if (!client.prefs["instrumentation.ceip"])
        client.prefs["instrumentation.ceip"] = true;

    // Save values into the preferences.
    client.prefs["ceip.log.client"] = chkClient.checked;
    client.prefs["ceip.log.command"] = chkCommand.checked;
    client.prefs["ceip.log.menu"] = chkCommand.checked;
    client.prefs["ceip.log.dialog"] = chkCommand.checked;
}
