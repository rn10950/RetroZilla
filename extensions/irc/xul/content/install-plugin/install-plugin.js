var client;
var plugin;

function onLoad()
{
    client = window.arguments[0];
    client.installPluginDialog = window;
    window.getMsg = client.messageManager.getMsg;
    window.MSG_ALERT = client.mainWindow.MSG_ALERT;

    hookEvent("chk-name-auto",    "command", changeAutoName);
    hookEvent("txt-source",       "input",   sourceChange);
    hookEvent("btn-browse",       "command", browseForSource);

    // Center on CZ:
    var ow = client.mainWindow;
    window.sizeToContent();
    window.moveTo(ow.screenX + Math.max((ow.outerWidth  - window.outerWidth ) / 2, 0), 
                  ow.screenY + Math.max((ow.outerHeight - window.outerHeight) / 2, 0));
}

function changeAutoName(event)
{
    var useAutoName = document.getElementById("chk-name-auto");
    var pluginName = document.getElementById("txt-name");
    if (useAutoName.checked)
    {
        pluginName.setAttribute("disabled", "true");
        sourceChange(null);
    }
    else
    {
        pluginName.removeAttribute("disabled");
    }
}

function sourceChange(event)
{
    var useAutoName = document.getElementById("chk-name-auto");
    var pluginName = document.getElementById("txt-name");
    var sourceLoc = document.getElementById("txt-source");

    if (useAutoName.checked)
    {
        var ary = sourceLoc.value.match(/([^\/]+?)(\..{0,3}){0,2}$/);
        pluginName.value = (ary ? ary[1] : sourceLoc.value);
    }
}

function browseForSource(event)
{
    var rv = pickOpen(client.mainWindow.MSG_INSTALL_PLUGIN_SELECT_SOURCE,
                      "*.js;*.zip;*.jar");

    if (("file" in rv) && rv.file)
    {
        rv.path = rv.file.path;
        rv.spec = rv.picker.fileURL.spec;
    }

    if (rv.reason == 0)
    {
        var sourceLoc = document.getElementById("txt-source");
        sourceLoc.value = rv.spec;
        sourceChange(null);
    }
}

function doOK()
{
    var pluginName = document.getElementById("txt-name");
    var pluginSource = document.getElementById("txt-source");
    if (!pluginName.value)
    {
        alert(client.mainWindow.MSG_INSTALL_PLUGIN_ERR_SPEC_NAME);
        return false;
    }

    client.dispatch("install-plugin", {name: pluginName.value,
                                       url: pluginSource.value});
    delete client.installPluginDialog;
}

function doCancel()
{
    delete client.installPluginDialog;
}

function hookEvent(id, event, handler)
{
    var item = document.getElementById(id);
    item.addEventListener(event, handler, false);
}
