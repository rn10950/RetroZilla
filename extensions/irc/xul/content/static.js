/* -*- Mode: C++; tab-width: 4; indent-tabs-mode: nil; c-basic-offset: 4 -*-
 *
 * ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is ChatZilla.
 *
 * The Initial Developer of the Original Code is
 * Netscape Communications Corporation.
 * Portions created by the Initial Developer are Copyright (C) 1998
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Robert Ginda, <rginda@netscape.com>, original author
 *   Chiaki Koufugata chiaki@mozilla.gr.jp UI i18n
 *   Samuel Sieb, samuel@sieb.net, MIRC color codes, munger menu, and various
 *   James Ross, silver@warwickcompsoc.co.uk
 *   Gijs Kruitbosch, gijskruitbosch@gmail.com
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */

const __cz_version   = "0.9.85";
const __cz_condition = "green";
const __cz_suffix    = "";
const __cz_guid      = "59c81df5-4b7a-477b-912d-4e0fdf64e5f2";
const __cz_locale    = "0.9.85";

var warn;
var ASSERT;
var TEST;

if (DEBUG)
{
    _dd_pfx = "cz: ";
    warn = function (msg) { dumpln ("** WARNING " + msg + " **"); }
    TEST = ASSERT = function _assert(expr, msg) {
                 if (!expr) {
                     dd("** ASSERTION FAILED: " + msg + " **\n" +
                        getStackTrace() + "\n");
                     return false;
                 } else {
                     return true;
                 }
             }
}
else
    dd = warn = TEST = ASSERT = function (){};

var client = new Object();

client.TYPE = "IRCClient";
client.COMMAND_CHAR = "/";
client.STEP_TIMEOUT = 500;
client.MAX_MESSAGES = 200;
client.MAX_HISTORY = 50;
/* longest nick to show in display before forcing the message to a block level
 * element */
client.MAX_NICK_DISPLAY = 14;
/* longest word to show in display before abbreviating */
client.MAX_WORD_DISPLAY = 20;

client.NOTIFY_TIMEOUT = 5 * 60 * 1000; /* update notify list every 5 minutes */

// Check every minute which networks have away statuses that need an update.
client.AWAY_TIMEOUT = 60 * 1000;

client.SLOPPY_NETWORKS = true; /* true if msgs from a network can be displayed
                                * on the current object if it is related to
                                * the network (ie, /whois results will appear
                                * on the channel you're viewing, if that channel
                                * is on the network that the results came from)
                                */
client.DOUBLETAB_TIME = 500;
client.HIDE_CODES = true;      /* true if you'd prefer to show numeric response
                                * codes as some default value (ie, "===") */
client.DEFAULT_RESPONSE_CODE = "===";

/* Maximum number of channels we'll try to list without complaining */
client.SAFE_LIST_COUNT = 500;

/* Minimum number of users above or below the conference limit the user count
 * must go, before it is changed. This allows the user count to fluctuate
 * around the limit without continously going on and off.
 */
client.CONFERENCE_LOW_PASS = 10;

client.viewsArray = new Array();
client.activityList = new Object();
client.hostCompat = new Object();
client.inputHistory = new Array();
client.lastHistoryReferenced = -1;
client.incompleteLine = "";
client.lastTabUp = new Date();
client.awayMsgs = new Array();
client.awayMsgCount = 5;
client.statusMessages = new Array();

CIRCNetwork.prototype.INITIAL_CHANNEL = "";
CIRCNetwork.prototype.MAX_MESSAGES = 100;
CIRCNetwork.prototype.IGNORE_MOTD = false;
CIRCNetwork.prototype.RECLAIM_WAIT = 15000;
CIRCNetwork.prototype.RECLAIM_TIMEOUT = 400000;
CIRCNetwork.prototype.MIN_RECONNECT_MS = 15 * 1000;             // 15s
CIRCNetwork.prototype.MAX_RECONNECT_MS = 2 * 60 * 60 * 1000;    // 2h

CIRCServer.prototype.READ_TIMEOUT = 0;
CIRCServer.prototype.PRUNE_OLD_USERS = 0; // prune on user quit.

CIRCUser.prototype.MAX_MESSAGES = 200;

CIRCChannel.prototype.MAX_MESSAGES = 300;

CIRCChanUser.prototype.MAX_MESSAGES = 200;

function init()
{
    if (("initialized" in client) && client.initialized)
        return;

    client.initialized = false;

    client.networks = new Object();
    client.entities = new Object();
    client.eventPump = new CEventPump (200);

    if (DEBUG)
    {
        /* hook all events EXCEPT server.poll and *.event-end types
         * (the 4th param inverts the match) */
        client.debugHook =
            client.eventPump.addHook([{type: "poll", set:/^(server|dcc-chat)$/},
                                    {type: "event-end"}], event_tracer,
                                    "event-tracer", true /* negate */,
                                    false /* disable */);
    }

    initApplicationCompatibility();
    initMessages();
    if (client.host == "")
        showErrorDlg(getMsg(MSG_ERR_UNKNOWN_HOST, client.unknownUID));

    initCommands();
    initPrefs();
    initMunger();
    initNetworks();
    initMenus();
    initStatic();
    initHandlers();

    // Create DCC handler.
    client.dcc = new CIRCDCC(client);

    client.ident = new IdentServer(client);

    // Start log rotation checking first.  This will schedule the next check.
    checkLogFiles();
    // Start logging.  Nothing should call display() before this point.
    if (client.prefs["log"])
        client.openLogFile(client);

    // Make sure the userlist is on the correct side.
    updateUserlistSide(client.prefs["userlistLeft"]);

    client.display(MSG_WELCOME, "HELLO");
    client.dispatch("set-current-view", { view: client });

    importFromFrame("updateHeader");
    importFromFrame("setHeaderState");
    importFromFrame("changeCSS");
    importFromFrame("scrollToElement");
    importFromFrame("updateMotifSettings");
    importFromFrame("addUsers");
    importFromFrame("updateUsers");
    importFromFrame("removeUsers");

    processStartupScripts();

    client.commandManager.installKeys(document);
    createMenus();

    initIcons();

    client.busy = false;
    updateProgress();
    initOfflineIcon();
    client.isIdleAway = false;
    initIdleAutoAway(client.prefs["awayIdleTime"]);

    client.initialized = true;

    dispatch("help", { hello: true });
    dispatch("networks");

    // Do this after the standard commands are run or we'll log them too!
    initInstrumentation();
    client.ceip.logEvent({type: "client", event: "start"});

    setTimeout("dispatch('focus-input')", 0);
    setTimeout(processStartupURLs, 0);
}

function initStatic()
{
    client.mainWindow = window;

    try
    {
        var io = Components.classes['@mozilla.org/network/io-service;1'];
        client.iosvc = io.getService(Components.interfaces.nsIIOService);
    }
    catch (ex)
    {
        dd("IO service failed to initialize: " + ex);
    }
    
    try
    {
        const nsISound = Components.interfaces.nsISound;
        client.sound =
            Components.classes["@mozilla.org/sound;1"].createInstance(nsISound);

        client.soundList = new Object();
    }
    catch (ex)
    {
        dd("Sound failed to initialize: " + ex);
    }

    try
    {
        const nsIGlobalHistory = Components.interfaces.nsIGlobalHistory;
        const GHIST_CONTRACTID = "@mozilla.org/browser/global-history;1";
        client.globalHistory =
            Components.classes[GHIST_CONTRACTID].getService(nsIGlobalHistory);
    }
    catch (ex)
    {
        dd("Global History failed to initialize: " + ex);
    }

    try
    {
        const nsISDateFormat = Components.interfaces.nsIScriptableDateFormat;
        const DTFMT_CID = "@mozilla.org/intl/scriptabledateformat;1";
        client.dtFormatter =
            Components.classes[DTFMT_CID].createInstance(nsISDateFormat);

        // Mmmm, fun. This ONLY affects the ChatZilla window, don't worry!
        Date.prototype.toStringInt = Date.prototype.toString;
        Date.prototype.toString = function() {
            var dtf = client.dtFormatter;
            return dtf.FormatDateTime("", dtf.dateFormatLong,
                                      dtf.timeFormatSeconds,
                                      this.getFullYear(), this.getMonth() + 1,
                                      this.getDate(), this.getHours(),
                                      this.getMinutes(), this.getSeconds()
                                     );
        }
    }
    catch (ex)
    {
        dd("Locale-correct date formatting failed to initialize: " + ex);
    }

    // XXX Bug 335998: See cmdHideView for usage of this.
    client.hiddenDocument = document.implementation.createDocument(null, null, null);

    multilineInputMode(client.prefs["multiline"]);
    updateSpellcheck(client.prefs["inputSpellcheck"]);

    // Initialize userlist stuff
    // cache all the atoms to stop us crossing XPCOM boundaries *all the time*
    client.atomCache = new Object();
    var atomSvc = getService("@mozilla.org/atom-service;1", "nsIAtomService");
    var atoms = ["founder-true", "founder-false", "admin-true", "admin-false",
                 "op-true", "op-false", "halfop-true", "halfop-false",
                 "voice-true", "voice-false", "away-true", "away-false",
                 "unselected"];
    for (var i = 0; i < atoms.length; i++)
        client.atomCache[atoms[i]] = atomSvc.getAtom(atoms[i]);
    
    if (client.prefs["showModeSymbols"])
        setListMode("symbol");
    else
        setListMode("graphic");

    var tree = document.getElementById('user-list');
    tree.setAttribute("ondraggesture",
                      "nsDragAndDrop.startDrag(event, userlistDNDObserver);");

    setDebugMode(client.prefs["debugMode"]);

    var version = getVersionInfo();
    client.userAgent = getMsg(MSG_VERSION_REPLY, [version.cz, version.ua]);
    CIRCServer.prototype.VERSION_RPLY = client.userAgent;
    CIRCServer.prototype.HOST_RPLY = version.host;
    CIRCServer.prototype.SOURCE_RPLY = MSG_SOURCE_REPLY;

    client.statusBar = new Object();

    client.statusBar["server-nick"] = document.getElementById("server-nick");

    client.tabs = document.getElementById("views-tbar-inner");
    client.tabDragBar = document.getElementById("tabs-drop-indicator-bar");
    client.tabDragMarker = document.getElementById("tabs-drop-indicator");

    client.statusElement = document.getElementById("status-text");
    client.currentStatus = "";
    client.defaultStatus = MSG_DEFAULT_STATUS;

    client.progressPanel = document.getElementById("status-progress-panel");
    client.progressBar = document.getElementById("status-progress-bar");

    client.logFile = null;
    setInterval("onNotifyTimeout()", client.NOTIFY_TIMEOUT);
    // Call every minute, will check only the networks necessary.
    setInterval("onWhoTimeout()", client.AWAY_TIMEOUT);

    client.awayMsgs = [{ message: MSG_AWAY_DEFAULT }];
    var awayFile = new nsLocalFile(client.prefs["profilePath"]);
    awayFile.append("awayMsgs.txt");
    if (awayFile.exists())
    {
        var awayLoader = new TextSerializer(awayFile);
        if (awayLoader.open("<"))
        {
            // Load the first item from the file.
            var item = awayLoader.deserialize();
            if (isinstance(item, Array))
            {
                // If the first item is an array, it is the entire thing.
                client.awayMsgs = item;
            }
            else if (item != null)
            {
                /* Not an array, so we have the old format of a single object
                 * per entry.
                 */
                client.awayMsgs = [item];
                while ((item = awayLoader.deserialize()))
                    client.awayMsgs.push(item);
            }
            awayLoader.close();

            /* we have to close the file before we can move it,
             * hence the second if statement */
            if (item == null)
            {
                var invalidFile = new nsLocalFile(client.prefs["profilePath"]);
                invalidFile.append("awayMsgs.invalid");
                invalidFile.createUnique(FTYPE_FILE, 0600);
                var msg = getMsg(MSG_ERR_INVALID_FILE,
                                 [awayFile.leafName, invalidFile.leafName]);
                setTimeout("client.display(" + msg.quote() + ", MT_WARN)", 0);
                awayFile.moveTo(null, invalidFile.leafName);
            }
        }
    }

    // Get back input history from previous session:
    var inputHistoryFile = new nsLocalFile(client.prefs["profilePath"]);
    inputHistoryFile.append("inputHistory.txt");
    try
    {
        client.inputHistoryLogger = new TextLogger(inputHistoryFile.path,
                                                   client.MAX_HISTORY);
    }
    catch (ex)
    {
        msg = getMsg(MSG_ERR_INPUTHISTORY_NOT_WRITABLE, inputHistoryFile.path);
        setTimeout("client.display(" + msg.quote() + ", MT_ERROR)", 0);
        dd(formatException(ex));
        client.inputHistoryLogger = null;
    }
    if (client.inputHistoryLogger)
        client.inputHistory = client.inputHistoryLogger.read().reverse();

    // Set up URL collector.
    var urlsFile = new nsLocalFile(client.prefs["profilePath"]);
    urlsFile.append("urls.txt");
    try
    {
        client.urlLogger = new TextLogger(urlsFile.path,
                                          client.prefs["urls.store.max"]);
    }
    catch (ex)
    {
        msg = getMsg(MSG_ERR_URLS_NOT_WRITABLE, urlsFile.path);
        setTimeout("client.display(" + msg.quote() + ", MT_ERROR)", 0);
        dd(formatException(ex));
        client.urlLogger = null;
    }

    // Migrate old list preference to file.
    try
    {
        // Throws if the preference doesn't exist.
        if (client.urlLogger)
            var urls = client.prefManager.prefBranch.getCharPref("urls.list");
    }
    catch (ex)
    {
    }
    if (urls)
    {
        // Add the old URLs to the new file.
        urls = client.prefManager.stringToArray(urls);
        for (var i = 0; i < urls.length; i++)
            client.urlLogger.append(urls[i]);
        // Completely purge the old preference.
        client.prefManager.prefBranch.clearUserPref("urls.list");
    }

    client.defaultCompletion = client.COMMAND_CHAR + "help ";

    client.deck = document.getElementById('output-deck');
}

function getVersionInfo()
{
    var version = new Object();
    version.cz = __cz_version + (__cz_suffix ? "-" + __cz_suffix : "");
    version.ua = navigator.userAgent;

    var app = getService("@mozilla.org/xre/app-info;1", "nsIXULAppInfo");
    if (app)
    {
        // Use the XUL host app info, and Gecko build ID.
        if (app.ID == "{" + __cz_guid + "}")
        {
            /* We ARE the app, in other words, we're running in XULrunner.
             * Because of this, we must disregard app.(name|vendor|version).
             */

            // "XULRunner 1.7+"
            version.hostName = "XULRunner";
            version.hostVersion = app.platformVersion;
            version.host = version.hostName + " " + version.hostVersion;

            // "XULRunner 1.7+/2005071506"
            version.ua = version.host + "/" + app.platformBuildID;
            version.hostBuildID = app.platformBuildID;
        }
        else
        {
            // "Mozilla Firefox 1.0+"
            version.hostName = app.vendor + " " + app.name;
            version.hostVersion = app.version;
            version.host = version.hostName + " " + version.hostVersion;

            // "Firefox 1.0+/2005071506"
            if ("platformBuildID" in app) // 1.1 and up
                version.hostBuildID = app.platformBuildID;
            else if ("geckoBuildID" in app) // 1.0 - 1.1 trunk only
                version.hostBuildID = app.geckoBuildID;
            else // Uh oh!
                version.hostBuildID = "??????????";
            version.ua = app.name + " " + app.version + "/" +
                         version.hostBuildID;
        }
    }
    else
    {
        // Extract the revision number, and Gecko build ID.
        var ary = navigator.userAgent.match(/(rv:[^;)\s]+).*?Gecko\/(\d+)/);
        if (ary)
        {
            if (navigator.vendor)
                version.ua = navigator.vendor + " " + navigator.vendorSub; // FF 1.0
            else
                version.ua = client.entities.brandShortName + " " + ary[1]; // Suite
            version.ua += "/" + ary[2];
            version.hostBuildID = ary[2];
        }
        version.hostName = client.entities.brandShortName;
        version.hostVersion = "";
        version.host = version.hostName;
    }

    version.host += ", " + client.platform;

    return version;
}

function initApplicationCompatibility()
{
    // This function does nothing more than tweak the UI based on the host
    // application.

    // Set up simple host and platform information.
    client.host = "Unknown";
    // Do we need to copy the icons? (not necessary on Gecko 1.8 and onwards,
    // and install.js does it for us on SeaMonkey)
    client.hostCompat.needToCopyIcons = false;

    var app = getService("@mozilla.org/xre/app-info;1", "nsIXULAppInfo");
    // nsIXULAppInfo wasn't implemented before 1.8...
    if (app)
    {
        // Use the XULAppInfo.ID to find out what host we run on.
        switch (app.ID)
        {
            case "{ec8030f7-c20a-464f-9b0e-13a3a9e97384}":
                client.host = "Firefox";
                break;
            case "{" + __cz_guid + "}":
                // We ARE the app, in other words, we're running in XULRunner.
                client.host = "XULRunner";
                break;
            case "{92650c4d-4b8e-4d2a-b7eb-24ecf4f6b63a}": // SeaMonkey
                client.host = "Mozilla";
                break;
            case "{a463f10c-3994-11da-9945-000d60ca027b}": // Flock
                client.host = "Flock";
                break;
            case "{3db10fab-e461-4c80-8b97-957ad5f8ea47}": // Netscape
                client.host = "Netscape";
                break;
            case "songbird@songbirdnest.com": // Songbird
                client.host = "Songbird";
                break;
            default:
                client.unknownUID = app.ID;
                client.host = ""; // Unknown host, show an error later.
        }
    }
    else if ("getBrowserURL" in window)
    {
        var url = getBrowserURL();
        if (url == "chrome://navigator/content/navigator.xul")
        {
            client.host = "Mozilla";
        }
        else if (url == "chrome://browser/content/browser.xul")
        {
            client.hostCompat.needToCopyIcons = true;
            client.host = "Firefox";
        }
        else
        {
            client.host = ""; // We don't know this host. Show an error later.
            client.unknownUID = url;
        }
    }

    client.platform = "Unknown";
    if (navigator.platform.search(/mac/i) > -1)
        client.platform = "Mac";
    if (navigator.platform.search(/win/i) > -1)
        client.platform = "Windows";
    if (navigator.platform.search(/linux/i) > -1)
        client.platform = "Linux";
    if (navigator.platform.search(/os\/2/i) > -1)
        client.platform = "OS/2";

    client.hostPlatform = client.host + client.platform;

    CIRCServer.prototype.OS_RPLY = navigator.oscpu + " (" +
                                   navigator.platform + ")";

    // Windows likes \r\n line endings, as wussy-notepad can't cope with just
    // \n logs.
    if (client.platform == "Windows")
        client.lineEnd = "\r\n";
    else
        client.lineEnd = "\n";
}

function initIcons()
{
    // Make sure we got the ChatZilla icon(s) in place first.
    const iconName = "chatzilla-window";
    const suffixes = [".ico", ".xpm", "16.xpm"];

    /* when installing on Mozilla, the XPI has the power to put the icons where
     * they are needed - in older versions of Firefox, it doesn't.
     */
    if (!client.hostCompat.needToCopyIcons)
        return;

    var sourceDir = getSpecialDirectory("ProfD");
    sourceDir.append("extensions");
    sourceDir.append("{" + __cz_guid + "}");
    sourceDir.append("chrome");
    sourceDir.append("icons");
    sourceDir.append("default");

    var destDir = getSpecialDirectory("AChrom");
    destDir.append("icons");
    destDir.append("default");
    if (!destDir.exists())
    {
        try
        {
            mkdir(destDir);
        }
        catch(ex)
        {
            return;
        }
    }

    for (var i = 0; i < suffixes.length; i++)
    {
        var iconDest = destDir.clone();
        iconDest.append(iconName + suffixes[i]);
        var iconSrc = sourceDir.clone();
        iconSrc.append(iconName + suffixes[i]);

        if (iconSrc.exists() && !iconDest.exists())
        {
            try
            {
                iconSrc.copyTo(iconDest.parent, iconDest.leafName);
            }
            catch(ex){}
        }
    }
}

function initInstrumentation()
{
    /* Make sure we assign the user a random key - this is not used for
     * anything except percentage chance of participation. The value is
     * 1 through 10000, inclusive. 0 indicates unset.
     */
    if (client.prefs["instrumentation.key"] == 0)
    {
        var rand = 1 + Math.floor(Math.random() * 10000);
        client.prefs["instrumentation.key"] = rand;
    }

    client.ceip = new CEIP();

    if (!client.prefs["instrumentation.ceip"])
    {
        /* We only want 1% of people to be asked here. Note: we select the 2nd
         * percentile so we don't ask the same people we used for the pings.
         */
        var key = client.prefs["instrumentation.key"];
        if ((key <= 100) || (key > 200))
            return;

        // User has not seen the info about this system. Show them the info.
        var cmdYes = "allow-ceip";
        var cmdNo = "deny-ceip";
        var btnYes = getMsg(MSG_CEIP_COMMAND_YES, cmdYes);
        var btnNo  = getMsg(MSG_CEIP_COMMAND_NO,  cmdNo);
        client.munger.getRule(".inline-buttons").enabled = true;
        client.display(getMsg(MSG_CEIP_MSG1, [btnYes, btnNo]));
        client.display(getMsg(MSG_CEIP_MSG2, [cmdYes, cmdNo]));
        client.munger.getRule(".inline-buttons").enabled = false;

        // Don't hide *client* if we're asking the user about the startup ping.
        client.lockView = true;
    }
}

function getFindData(e)
{
    // findNext() wrapper to add our findStart/findEnd events.
    function _cz_findNext() {
        // Send start notification.
        var ev = new CEvent("find", "findStart", e.sourceObject, "onFindStart");
        client.eventPump.routeEvent(ev);

        // Call the original findNext() and keep the result for later.
        var rv = this.__proto__.findNext();

        // Send end notification with result code.
        var ev = new CEvent("find", "findEnd", e.sourceObject, "onFindEnd");
        ev.findResult = rv;
        client.eventPump.routeEvent(ev);

        // Return the original findNext()'s result to keep up appearances.
        return rv;
    };

    // Getter for webBrowserFind property.
    function _cz_webBrowserFind() {
        return this._cz_wbf;
    };

    var findData = new nsFindInstData();
    findData.browser = e.sourceObject.frame;
    findData.rootSearchWindow = getContentWindow(e.sourceObject.frame);
    findData.currentSearchWindow = getContentWindow(e.sourceObject.frame);

    /* Wrap up the webBrowserFind object so we get called for findNext(). Use
     * __proto__ so that everything else is exactly like the original object.
     */
    findData._cz_wbf = { findNext: _cz_findNext };
    findData._cz_wbf.__proto__ = findData.webBrowserFind;

    /* Replace the nsFindInstData getter for webBrowserFind to call our
     * function which in turn returns our object (_cz_wbf).
     */
    findData.__defineGetter__("webBrowserFind", _cz_webBrowserFind);

    /* Yay, evil hacks! findData.init doesn't care about the findService, it
     * gets option settings from webBrowserFind. As we want the wrap option *on*
     * when we use /find foo, we set it on the findService there. However,
     * restoring the original value afterwards doesn't help, because init() here
     * overrides that value. Unless we make .init do something else, of course:
     */
    findData._init = findData.init;
    findData.init =
        function init()
        {
            this._init();
            const FINDSVC_ID = "@mozilla.org/find/find_service;1";
            var findService = getService(FINDSVC_ID, "nsIFindService");
            this.webBrowserFind.wrapFind = findService.wrapFind;
        };

    return findData;
}

function importFromFrame(method)
{
    client.__defineGetter__(method, import_wrapper);
    CIRCNetwork.prototype.__defineGetter__(method, import_wrapper);
    CIRCChannel.prototype.__defineGetter__(method, import_wrapper);
    CIRCUser.prototype.__defineGetter__(method, import_wrapper);
    CIRCDCCChat.prototype.__defineGetter__(method, import_wrapper);
    CIRCDCCFileTransfer.prototype.__defineGetter__(method, import_wrapper);

    function import_wrapper()
    {
        var dummy = function(){};

        if (!("frame" in this))
            return dummy;

        try
        {
            var window = getContentWindow(this.frame);
            if (window && "initialized" in window && window.initialized &&
                method in window)
            {
                return function import_wrapper_apply()
                {
                    window[method].apply(this, arguments);
                };
            }
        }
        catch (ex)
        {
            ASSERT(0, "Caught exception calling: " + method + "\n" + ex);
        }

        return dummy;
    };
}

function processStartupScripts()
{
    client.plugins = new Array();
    var scripts = client.prefs["initialScripts"];
    var basePath = getURLSpecFromFile(client.prefs["profilePath"]); 
    var baseURL = client.iosvc.newURI(basePath, null, null);
    for (var i = 0; i < scripts.length; ++i)
    {
        var url = client.iosvc.newURI(scripts[i], null, baseURL);
        if (url.scheme != "file" && url.scheme != "chrome")
        {
            display(getMsg(MSG_ERR_INVALID_SCHEME, scripts[i]), MT_ERROR);
            continue;
        }

        var path = getFileFromURLSpec(url.spec);

        if (!path.exists())
        {
            display(getMsg(MSG_ERR_ITEM_NOT_FOUND, url.spec), MT_WARN);
            continue;
        }

        if (path.isDirectory())
            loadPluginDirectory(path);
        else
            loadLocalFile(path);
    }
}

function loadPluginDirectory(localPath, recurse)
{
    if (typeof recurse == "undefined")
        recurse = 1;

    var initPath = localPath.clone();
    initPath.append("init.js");
    if (initPath.exists())
        loadLocalFile(initPath);

    if (recurse < 1)
        return;

    var enumer = localPath.directoryEntries;
    while (enumer.hasMoreElements())
    {
        var entry = enumer.getNext();
        entry = entry.QueryInterface(Components.interfaces.nsILocalFile);
        if (entry.isDirectory())
            loadPluginDirectory(entry, recurse - 1);
    }
}

function loadLocalFile(localFile)
{
    var url = getURLSpecFromFile(localFile);
    var glob = new Object();
    dispatch("load", {url: url, scope: glob});
}

function getPluginById(id)
{
    for (var i = 0; i < client.plugins.length; ++i)
    {
        if (client.plugins[i].id == id)
            return client.plugins[i];

    }

    return null;
}

function getPluginIndexById(id)
{
    for (var i = 0; i < client.plugins.length; ++i)
    {
        if (client.plugins[i].id == id)
            return i;

    }

    return -1;
}

function getPluginByURL(url)
{
    for (var i = 0; i < client.plugins.length; ++i)
    {
        if (client.plugins[i].url == url)
            return client.plugins[i];

    }

    return null;
}

function getPluginIndexByURL(url)
{
    for (var i = 0; i < client.plugins.length; ++i)
    {
        if (client.plugins[i].url == url)
            return i;

    }

    return -1;
}

function processStartupURLs()
{
    var wentSomewhere = false;

    if ("arguments" in window &&
        0 in window.arguments && typeof window.arguments[0] == "object" &&
        "url" in window.arguments[0])
    {
        var url = window.arguments[0].url;
        if (url.search(/^ircs?:\/?\/?\/?$/i) == -1)
        {
            /* if the url is not irc: irc:/, irc://, or ircs equiv then go to it. */
            gotoIRCURL(url);
            wentSomewhere = true;
        }
    }
    /* check to see whether the URL has been passed via the command line
       instead. */
    else if ("arguments" in window &&
        0 in window.arguments && typeof window.arguments[0] == "string")
    {
        var url = window.arguments[0]
        var urlMatches = url.match(/^ircs?:\/\/\/?(.*)$/)
        if (urlMatches)
        {
            if (urlMatches[1])
            {
                /* if the url is not "irc://", "irc:///" or an ircs equiv then
                   go to it. */
                gotoIRCURL(url);
                wentSomewhere = true;
            }
        }
        else if (url)
        {
            /* URL parameter is not blank, but does not not conform to the
               irc[s] scheme. */
            display(getMsg(MSG_ERR_INVALID_SCHEME, url), MT_ERROR);
        }
    }

    if (!wentSomewhere)
    {
        /* if we had nowhere else to go, connect to any default urls */
        var ary = client.prefs["initialURLs"];
        for (var i = 0; i < ary.length; ++i)
        {
            if (ary[i] && ary[i] == "irc:///")
            {
                // Clean out "default network" entries, which we don't
                // support any more; replace with the harmless irc:// URL.
                ary[i] = "irc://";
                client.prefs["initialURLs"].update();
            }
            if (ary[i] && ary[i] != "irc://")
                gotoIRCURL(ary[i]);
        }
    }

    if (client.viewsArray.length > 1 && !isStartupURL("irc://"))
        dispatch("delete-view", { view: client });

    /* XXX: If we have the "stop XBL breaking" hidden tab, remove it, to
     * stop XBL breaking later. Oh, the irony.
     */
    if (client.tabs.firstChild.hidden)
    {
        client.tabs.removeChild(client.tabs.firstChild);
        updateTabAttributes();
    }
}

function destroy()
{
    destroyPrefs();
}

function addStatusMessage(message)
{
    const DELAY_SCALE = 100;
    const DELAY_MINIMUM = 5000;

    var delay = message.length * DELAY_SCALE;
    if (delay < DELAY_MINIMUM)
        delay = DELAY_MINIMUM;

    client.statusMessages.push({ message: message, delay: delay });
    updateStatusMessages();
}

function updateStatusMessages()
{
    if (client.statusMessages.length == 0)
    {
        var status = client.currentStatus || client.defaultStatus;
        client.statusElement.setAttribute("label", status);
        client.statusElement.removeAttribute("notice");
        return;
    }

    var now = Number(new Date());
    var currentMsg = client.statusMessages[0];
    if ("expires" in currentMsg)
    {
        if (now >= currentMsg.expires)
        {
            client.statusMessages.shift();
            setTimeout(updateStatusMessages, 0);
        }
        else
        {
            setTimeout(updateStatusMessages, 1000);
        }
    }
    else
    {
        currentMsg.expires = now + currentMsg.delay;
        client.statusElement.setAttribute("label", currentMsg.message);
        client.statusElement.setAttribute("notice", "true");
        setTimeout(updateStatusMessages, currentMsg.delay);
    }
}


function setStatus(str)
{
    client.currentStatus = str;
    updateStatusMessages();
    return str;
}

client.__defineSetter__("status", setStatus);

function getStatus()
{
    return client.currentStatus;
}

client.__defineGetter__("status", getStatus);

function isVisible (id)
{
    var e = document.getElementById(id);

    if (!ASSERT(e,"Bogus id ``" + id + "'' passed to isVisible() **"))
        return false;

    return (e.getAttribute ("collapsed") != "true");
}

client.getConnectedNetworks =
function getConnectedNetworks()
{
    var rv = [];
    for (var n in client.networks)
    {
        if (client.networks[n].isConnected())
            rv.push(client.networks[n]);
    }
    return rv;
}

function combineNicks(nickList, max)
{
    if (!max)
        max = 4;

    var combinedList = [];

    for (var i = 0; i < nickList.length; i += max)
    {
        count = Math.min(max, nickList.length - i);
        var nicks = nickList.slice(i, i + count);
        var str = new String(nicks.join(" "));
        str.count = count;
        combinedList.push(str);
    }

    return combinedList;
}

function updateAllStalkExpressions()
{
    var list = client.prefs["stalkWords"];

    for (var name in client.networks)
    {
        if ("stalkExpression" in client.networks[name])
            updateStalkExpression(client.networks[name], list);
    }
}

function updateStalkExpression(network)
{
    function escapeChar(ch)
    {
        return "\\" + ch;
    };

    var list = client.prefs["stalkWords"];

    var ary = new Array();

    ary.push(network.primServ.me.unicodeName.replace(/[^\w\d]/g, escapeChar));

    for (var i = 0; i < list.length; ++i)
        ary.push(list[i].replace(/[^\w\d]/g, escapeChar));

    var re;
    if (client.prefs["stalkWholeWords"])
        re = "(^|[\\W\\s])((" + ary.join(")|(") + "))([\\W\\s]|$)";
    else
        re = "(" + ary.join(")|(") + ")";

    network.stalkExpression = new RegExp(re, "i");
}

function getDefaultFontSize()
{
    const PREF_CTRID = "@mozilla.org/preferences-service;1";
    const nsIPrefService = Components.interfaces.nsIPrefService;
    const nsIPrefBranch = Components.interfaces.nsIPrefBranch;

    var prefSvc = Components.classes[PREF_CTRID].getService(nsIPrefService);
    var prefBranch = prefSvc.getBranch(null);

    // PX size pref: font.size.variable.x-western
    var pxSize = 16;
    try
    {
        pxSize = prefBranch.getIntPref("font.size.variable.x-western");
    }
    catch(ex) { }

    var dpi = 96;
    try
    {
        // Get the DPI the fun way (make Mozilla do the work).
        var b = document.createElement("box");
        b.style.width = "1in";
        dpi = window.getComputedStyle(b, null).width.match(/^\d+/);
    }
    catch(ex)
    {
        try
        {
            // Get the DPI the fun way (make Mozilla do the work).
            b = document.createElementNS("box", XHTML_NS);
            b.style.width = "1in";
            dpi = window.getComputedStyle(b, null).width.match(/^\d+/);
        }
        catch(ex) { }
    }

    return Math.round((pxSize / dpi) * 72);
}

function getDefaultContext(cx)
{
    if (!cx)
        cx = new Object();
    /* Use __proto__ here and in all other get*Context so that the command can
     * tell the difference between getObjectDetails and actual parameters. See
     * cmdJoin for more details.
     */
    cx.__proto__ = getObjectDetails(client.currentObject);
    return cx;
}

function getMessagesContext(cx, element)
{
    if (!cx)
        cx = new Object();
    cx.__proto__ = getObjectDetails(client.currentObject);
    if (!element)
        element = document.popupNode;

    while (element)
    {
        switch (element.localName)
        {
            case "a":
                var href = element.getAttribute("href");
                cx.url = href;
                break;

            case "tr":
                // NOTE: msg-user is the canonicalName.
                cx.canonNick = element.getAttribute("msg-user");
                if (!cx.canonNick)
                    break;

                // Strip out a potential ME! suffix.
                var ary = cx.canonNick.match(/([^ ]+)/);
                cx.canonNick = ary[1];

                if (!cx.network)
                    break;

                if (cx.channel)
                    cx.user = cx.channel.getUser(cx.canonNick);
                else
                    cx.user = cx.network.getUser(cx.canonNick);

                if (cx.user)
                    cx.nickname = cx.user.unicodeName;
                else
                    cx.nickname = toUnicode(cx.canonNick, cx.network);
                break;
        }

        element = element.parentNode;
    }

    return cx;
}

function getTabContext(cx, element)
{
    if (!cx)
        cx = new Object();
    if (!element)
        element = document.popupNode;

    while (element)
    {
        if (element.localName == "tab")
        {
            cx.__proto__ = getObjectDetails(element.view);
            return cx;
        }
        element = element.parentNode;
    }

    return cx;
}

function getUserlistContext(cx)
{
    if (!cx)
        cx = new Object();
    cx.__proto__ = getObjectDetails(client.currentObject);
    if (!cx.channel)
        return cx;

    var user, tree = document.getElementById("user-list");
    cx.userList = new Array();
    cx.canonNickList = new Array();
    cx.nicknameList = getSelectedNicknames(tree);

    for (var i = 0; i < cx.nicknameList.length; ++i)
    {
        user = cx.channel.getUser(cx.nicknameList[i])
        cx.userList.push(user);
        cx.canonNickList.push(user.canonicalName);
        if (i == 0)
        {
            cx.user = user;
            cx.nickname = user.unicodeName;
            cx.canonNick = user.canonicalName;
        }
    }
    cx.userCount = cx.userList.length;

    return cx;
}

function getViewsContext(cx)
{
    function addView(view)
    {
        // We only need the view to have messages, so we accept hidden views.
        if (!("messages" in view))
            return;

        var url = view.getURL();
        if (url in urls)
            return;

        var label = view.viewName;
        if (!getTabForObject(view))
            label = getMsg(MSG_VIEW_HIDDEN, [label]);

        var types = ["IRCClient", "IRCNetwork", "IRCDCCChat",
                     "IRCDCCFileTransfer"];
        var typesNetwork = ["IRCNetwork", "IRCChannel", "IRCUser"];
        var group = String(arrayIndexOf(types, view.TYPE));
        if (arrayIndexOf(typesNetwork, view.TYPE) != -1)
            group = "1-" + getObjectDetails(view).network.viewName;

        var sort = group + "-" + view.viewName;
        if (view.TYPE == "IRCNetwork")
            sort = group;

        cx.views.push({url: url, label: label, group: group, sort: sort});
        urls[url] = true
    };

    function sortViews(a, b)
    {
        if (a.sort < b.sort)
            return -1;
        if (a.sort > b.sort)
            return 1;
        return 0;
    };

    if (!cx)
        cx = new Object();
    cx.__proto__ = getObjectDetails(client.currentObject);

    cx.views = new Array();
    var urls = new Object();

    /* XXX The code here works its way through all the open views *and* any
     * possibly visible objects in the object model. This is necessary because
     * occasionally objects get removed from the object model while still
     * having a view open. See bug 459318 for one such case. Note that we
     * won't be able to correctly switch to the "lost" view but showing it is
     * less confusing than not.
     */

    for (var i in client.viewsArray)
        addView(client.viewsArray[i].source);

    addView(client);
    for (var n in client.networks)
    {
        addView(client.networks[n]);
        for (var s in client.networks[n].servers) {
            var server = client.networks[n].servers[s];
            for (var c in server.channels)
                addView(server.channels[c]);
            for (var u in server.users)
                addView(server.users[u]);
        }
    }

    for (var u in client.dcc.users)
        addView(client.dcc.users[u]);
    for (var i = 0; i < client.dcc.chats.length; i++)
        addView(client.dcc.chats[i]);
    for (var i = 0; i < client.dcc.files.length; i++)
        addView(client.dcc.files[i]);

    cx.views.sort(sortViews);

    return cx;
}

function getSelectedNicknames(tree)
{
    var rv = [];
    if (!tree || !tree.view || !tree.view.selection)
        return rv;
    var rangeCount = tree.view.selection.getRangeCount();

    // Loop through the selection ranges.
    for (var i = 0; i < rangeCount; ++i)
    {
        var start = {}, end = {};
        tree.view.selection.getRangeAt(i, start, end);

        // If they == -1, we've got no selection, so bail.
        if ((start.value == -1) && (end.value == -1))
            continue;
        /* Workaround: Because we use select(-1) instead of clearSelection()
         * (see bug 197667) the tree will then give us selection ranges
         * starting from -1 instead of 0! (See bug 319066.)
         */
        if (start.value == -1)
            start.value = 0;

        // Loop through the contents of the current selection range.
        for (var k = start.value; k <= end.value; ++k)
            rv.push(getNicknameForUserlistRow(k));
    }
    return rv;
}

function getFontContext(cx)
{
    if (!cx)
        cx = new Object();
    cx.__proto__ = getObjectDetails(client.currentObject);
    cx.fontSizeDefault = getDefaultFontSize();
    var view = client;

    if ("prefs" in cx.sourceObject)
    {
        cx.fontFamily = view.prefs["font.family"];
        if (cx.fontFamily.match(/^(default|(sans-)?serif|monospace)$/))
            delete cx.fontFamily;

        cx.fontSize = view.prefs["font.size"];
        if (cx.fontSize == 0)
            delete cx.fontSize;
    }

    return cx;
}

function msgIsImportant(msg, sourceNick, network)
{
    var plainMsg = removeColorCodes(msg);

    var re = network.stalkExpression;
    if (plainMsg.search(re) != -1 || sourceNick && sourceNick.search(re) == 0)
        return true;

    return false;
}

function ensureCachedCanonicalURLs(array)
{
    if ("canonicalURLs" in array)
        return;

    /* Caching this on the array is safe because the PrefManager constructs
     * a new array if the preference changes, but otherwise keeps the same
     * one around.
     */
    array.canonicalURLs = new Array();
    for (var i = 0; i < array.length; i++)
        array.canonicalURLs.push(makeCanonicalIRCURL(array[i]));
}

function isStartupURL(url)
{
    // We canonicalize all URLs before we do the (string) comparison.
    url = makeCanonicalIRCURL(url);
    var list = client.prefs["initialURLs"];
    ensureCachedCanonicalURLs(list);
    return arrayContains(list.canonicalURLs, url);
}

function cycleView(amount)
{
    var len = client.viewsArray.length;
    if (len <= 1)
        return;

    var tb = getTabForObject (client.currentObject);
    if (!tb)
        return;

    var vk = Number(tb.getAttribute("viewKey"));
    var destKey = (vk + amount) % len; /* wrap around */
    if (destKey < 0)
        destKey += len;

    dispatch("set-current-view", { view: client.viewsArray[destKey].source });
}

// Plays the sound for a particular event on a type of object.
function playEventSounds(type, event)
{
    if (!client.sound || !client.prefs["sound.enabled"])
        return;

    // Converts .TYPE values into the event object names.
    // IRCChannel => channel, IRCUser => user, etc.
    if (type.match(/^IRC/))
        type = type.substr(3, type.length).toLowerCase();

    var ev = type + "." + event;

    if (ev in client.soundList)
        return;

    if (!(("sound." + ev) in client.prefs))
        return;

    var s = client.prefs["sound." + ev];

    if (!s)
        return;

    if (client.prefs["sound.overlapDelay"] > 0)
    {
        client.soundList[ev] = true;
        setTimeout("delete client.soundList['" + ev + "']",
                   client.prefs["sound.overlapDelay"]);
    }

    if (event == "start")
    {
        blockEventSounds(type, "event");
        blockEventSounds(type, "chat");
        blockEventSounds(type, "stalk");
    }

    playSounds(s);
}

// Blocks a particular type of event sound occuring.
function blockEventSounds(type, event)
{
    if (!client.sound || !client.prefs["sound.enabled"])
        return;

    // Converts .TYPE values into the event object names.
    // IRCChannel => channel, IRCUser => user, etc.
    if (type.match(/^IRC/))
        type = type.substr(3, type.length).toLowerCase();

    var ev = type + "." + event;

    if (client.prefs["sound.overlapDelay"] > 0)
    {
        client.soundList[ev] = true;
        setTimeout("delete client.soundList['" + ev + "']",
                   client.prefs["sound.overlapDelay"]);
    }
}

function playSounds(list)
{
    var ary = list.split (" ");
    if (ary.length == 0)
        return;

    playSound(ary[0]);
    for (var i = 1; i < ary.length; ++i)
        setTimeout(playSound, 250 * i, ary[i]);
}

function playSound(file)
{
    if (!client.sound || !client.prefs["sound.enabled"] || !file)
        return;

    if (file == "beep")
    {
        client.sound.beep();
    }
    else
    {
        try
        {
            var uri = client.iosvc.newURI(file, null, null);
            client.sound.play(uri);
        }
        catch (ex)
        {
            // ignore exceptions from this pile of code.
        }
    }
}

/* timer-based mainloop */
function mainStep()
{
    try
    {
        var count = client.eventPump.stepEvents();
        if (count > 0)
            setTimeout("mainStep()", client.STEP_TIMEOUT);
        else
            setTimeout("mainStep()", client.STEP_TIMEOUT / 5);
    }
    catch(ex)
    {
        dd("Exception in mainStep!");
        dd(formatException(ex));
        setTimeout("mainStep()", client.STEP_TIMEOUT);
    }
}

function openQueryTab(server, nick)
{
    var user = server.addUser(nick);
    if (client.globalHistory)
        client.globalHistory.addPage(user.getURL());
    if (!("messages" in user))
    {
        var value = "";
        var same = true;
        for (var c in server.channels)
        {
            var chan = server.channels[c];
            if (!(user.canonicalName in chan.users))
                continue;
            /* This takes a boolean value for each channel (true - channel has
             * same value as first), and &&-s them all together. Thus, |same|
             * will tell us, at the end, if all the channels found have the
             * same value for charset.
             */
            if (value)
                same = same && (value == chan.prefs["charset"]);
            else
                value = chan.prefs["charset"];
        }
        /* If we've got a value, and it's the same accross all channels,
         * we use it as the *default* for the charset pref. If not, it'll
         * just keep the "defer" default which pulls it off the network.
         */
        if (value && same)
        {
            user.prefManager.prefRecords["charset"].defaultValue = value;
        }

        user.displayHere (getMsg(MSG_QUERY_OPENED, user.unicodeName));
    }
    user.whois();
    return user;
}

function arraySpeak (ary, single, plural)
{
    var rv = "";
    var and = MSG_AND;

    switch (ary.length)
    {
        case 0:
            break;

        case 1:
            rv = ary[0];
            if (single)
                rv += " " + single;
            break;

        case 2:
            rv = ary[0] + " " + and + " " + ary[1];
            if (plural)
                rv += " " + plural;
            break;

        default:
            for (var i = 0; i < ary.length - 1; ++i)
                rv += ary[i] + ", ";
            rv += and + " " + ary[ary.length - 1];
            if (plural)
                rv += " " + plural;
            break;
    }

    return rv;

}

function getObjectDetails (obj, rv)
{
    if (!rv)
        rv = new Object();

    if (!ASSERT(obj && typeof obj == "object",
                "INVALID OBJECT passed to getObjectDetails (" + obj + "). **"))
    {
        return rv;
    }

    rv.sourceObject = obj;
    rv.TYPE = obj.TYPE;
    rv.parent = ("parent" in obj) ? obj.parent : null;
    rv.user = null;
    rv.channel = null;
    rv.server = null;
    rv.network = null;

    switch (obj.TYPE)
    {
        case "IRCChannel":
            rv.viewType = MSG_CHANNEL;
            rv.channel = obj;
            rv.channelName = obj.unicodeName;
            rv.server = rv.channel.parent;
            rv.network = rv.server.parent;
            break;

        case "IRCUser":
            rv.viewType = MSG_USER;
            rv.user = obj;
            rv.userName = obj.unicodeName;
            rv.server = rv.user.parent;
            rv.network = rv.server.parent;
            break;

        case "IRCChanUser":
            rv.viewType = MSG_USER;
            rv.user = obj;
            rv.userName = obj.unicodeName;
            rv.channel = rv.user.parent;
            rv.server = rv.channel.parent;
            rv.network = rv.server.parent;
            break;

        case "IRCNetwork":
            rv.network = obj;
            rv.viewType = MSG_NETWORK;
            if ("primServ" in rv.network)
                rv.server = rv.network.primServ;
            else
                rv.server = null;
            break;

        case "IRCClient":
            rv.viewType = MSG_TAB;
            break;

        case "IRCDCCUser":
            //rv.viewType = MSG_USER;
            rv.user = obj;
            rv.userName = obj.unicodeName;
            break;

        case "IRCDCCChat":
            //rv.viewType = MSG_USER;
            rv.chat = obj;
            rv.user = obj.user;
            rv.userName = obj.unicodeName;
            break;

        case "IRCDCCFileTransfer":
            //rv.viewType = MSG_USER;
            rv.file = obj;
            rv.user = obj.user;
            rv.userName = obj.unicodeName;
            rv.fileName = obj.filename;
            break;

        default:
            /* no setup for unknown object */
            break;
    }

    if (rv.network)
        rv.networkName = rv.network.unicodeName;

    return rv;

}

function findDynamicRule (selector)
{
    var rules = frames[0].document.styleSheets[1].cssRules;

    if (isinstance(selector, RegExp))
        fun = "search";
    else
        fun = "indexOf";

    for (var i = 0; i < rules.length; ++i)
    {
        var rule = rules.item(i);
        if (rule.selectorText && rule.selectorText[fun](selector) == 0)
            return {sheet: frames[0].document.styleSheets[1], rule: rule,
                    index: i};
    }

    return null;
}

function addDynamicRule (rule)
{
    var rules = frames[0].document.styleSheets[1];

    var pos = rules.cssRules.length;
    rules.insertRule (rule, pos);
}

function getCommandEnabled(command)
{
    try {
        var dispatcher = document.commandDispatcher;
        var controller = dispatcher.getControllerForCommand(command);

        return controller.isCommandEnabled(command);
    }
    catch (e)
    {
        return false;
    }
}

function doCommand(command)
{
    try {
        var dispatcher = document.commandDispatcher;
        var controller = dispatcher.getControllerForCommand(command);
        if (controller && controller.isCommandEnabled(command))
            controller.doCommand(command);
    }
    catch (e)
    {
    }
}

function doCommandWithParams(command, params)
{
    try {
        var dispatcher = document.commandDispatcher;
        var controller = dispatcher.getControllerForCommand(command);
        controller.QueryInterface(Components.interfaces.nsICommandController);

        if (!controller || !controller.isCommandEnabled(command))
            return;

        var cmdparams = newObject("@mozilla.org/embedcomp/command-params;1",
                                  "nsICommandParams");
        for (var i in params)
            cmdparams.setISupportsValue(i, params[i]);

        controller.doCommandWithParams(command, cmdparams);
    }
    catch (e)
    {
    }
}

var testURLs =
    ["irc:", "irc://", "irc:///", "irc:///help", "irc:///help,needkey",
    "irc://irc.foo.org", "irc://foo:6666",
    "irc://foo", "irc://irc.foo.org/", "irc://foo:6666/", "irc://foo/",
    "irc://irc.foo.org/,needpass", "irc://foo/,isserver",
    "irc://moznet/,isserver", "irc://moznet/",
    "irc://foo/chatzilla", "irc://foo/chatzilla/",
    "irc://irc.foo.org/?msg=hello%20there",
    "irc://irc.foo.org/?msg=hello%20there&ignorethis",
    "irc://irc.foo.org/%23mozilla,needkey?msg=hello%20there&ignorethis",
    "invalids",
    "irc://irc.foo.org/,isnick"];

function doURLTest()
{
    for (var u in testURLs)
    {
        dd("testing url \"" + testURLs[u] + "\"");
        var o = parseIRCURL(testURLs[u]);
        if (!o)
            dd("PARSE FAILED!");
        else
            dd(dumpObjectTree(o));
        dd("---");
    }
}

var testIRCURLObjects =
    [
     [{}, "irc://"],
     [{host: "undernet"},                                    "irc://undernet/"],
     [{host: "irc.undernet.org"},                    "irc://irc.undernet.org/"],
     [{host: "irc.undernet.org", isserver: true},    "irc://irc.undernet.org/"],
     [{host: "undernet", isserver: true},           "irc://undernet/,isserver"],
     [{host: "irc.undernet.org", port: 6667},        "irc://irc.undernet.org/"],
     [{host: "irc.undernet.org", port: 1},         "irc://irc.undernet.org:1/"],
     [{host: "irc.undernet.org", port: 1, scheme: "ircs"},
                                                  "ircs://irc.undernet.org:1/"],
     [{host: "irc.undernet.org", port: 9999, scheme: "ircs"},
                                                    "ircs://irc.undernet.org/"],
     [{host: "undernet", needpass: true},           "irc://undernet/,needpass"],
     [{host: "undernet", pass: "cz"},                "irc://undernet/?pass=cz"],
     [{host: "undernet", charset: "utf-8"},    "irc://undernet/?charset=utf-8"],
     [{host: "undernet", target: "#foo"},              "irc://undernet/%23foo"],
     [{host: "undernet", target: "#foo", needkey: true},
                                               "irc://undernet/%23foo,needkey"],
     [{host: "undernet", target: "John", isnick: true},
                                                  "irc://undernet/John,isnick"],
     [{host: "undernet", target: "#foo", key: "cz"},
                                                "irc://undernet/%23foo?key=cz"],
     [{host: "undernet", charset: "utf-8"},    "irc://undernet/?charset=utf-8"],
     [{host: "undernet", target: "John", msg: "spam!"},
                                             "irc://undernet/John?msg=spam%21"],
     [{host: "undernet", target: "foo", isnick: true, msg: "spam!", pass: "cz"},
                               "irc://undernet/foo,isnick?msg=spam%21&pass=cz"]
    ];

function doObjectURLtest()
{
    var passed = 0, total = testIRCURLObjects.length;
    for (var i = 0; i < total; i++)
    {
        var obj = testIRCURLObjects[i][0];
        var url = testIRCURLObjects[i][1];
        var parsedURL = constructIRCURL(obj)
        if (url != parsedURL)
        {
            display("Parsed IRC Object incorrectly! Expected '" + url +
                    "', got '" + parsedURL, MT_ERROR);
        }
        else
        {
            passed++;
        }
    }
    display("Passed " + passed + " out of " + total + " tests (" +
            passed / total * 100 + "%).", MT_INFO);
}


function gotoIRCURL(url, e)
{
    var urlspec = url;
    if (typeof url == "string")
        url = parseIRCURL(url);

    if (!url)
    {
        window.alert(getMsg(MSG_ERR_BAD_IRCURL, urlspec));
        return;
    }

    if (!url.host)
    {
        /* focus the *client* view for irc:, irc:/, and irc:// (the only irc
         * urls that don't have a host.  (irc:/// implies a connect to the
         * default network.)
         */
        client.pendingViewContext = e;
        dispatch("client");
        delete client.pendingViewContext;
        return;
    }

    var network;

    if (url.isserver)
    {
        var alreadyThere = false;
        var gettingThere = false;
        for (var n in client.networks)
        {
            if ((client.networks[n].isConnected()) &&
                (client.networks[n].primServ.hostname == url.host) &&
                (client.networks[n].primServ.port == url.port))
            {
                /* already connected to this server/port */
                network = client.networks[n];
                gettingThere = true;
                // Have we actually had the 001 reply yet?
                alreadyThere = (client.networks[n].state == NET_ONLINE);
                break;
            }
        }

        if (!alreadyThere)
        {
            if (!gettingThere)
            {
                /*
                dd ("gotoIRCURL: not yet had connected to server" + url.host +
                    " trying to connect...");
                */

                // Do we have a password, if needed?
                var pass = "";
                if (url.needpass)
                {
                    if (url.pass)
                    {
                        pass = url.pass;
                    }
                    else
                    {
                        pass = promptPassword(getMsg(MSG_HOST_PASSWORD,
                                                     url.host));
                    }
                }

                client.pendingViewContext = e;
                var params = {hostname: url.host, port: url.port,
                              password: pass};
                var cmd = (url.scheme == "ircs" ? "sslserver" : "server");
                network = dispatch(cmd, params);
                delete client.pendingViewContext;
            }

            if (!url.target)
                return;

            if (!("pendingURLs" in network))
                network.pendingURLs = new Array();
            network.pendingURLs.unshift({ url: url, e: e });
            return;
        }
    }
    else
    {
        /* parsed as a network name */
        if (!(url.host in client.networks))
        {
            display(getMsg(MSG_ERR_UNKNOWN_NETWORK, url.host));
            return;
        }

        network = client.networks[url.host];
        if (network.state != NET_ONLINE)
        {
            /*
            dd ("gotoIRCURL: not already connected to " +
                "network " + url.host + " trying to connect...");
            */
            var secure = (url.scheme == "ircs" ? true : false);
            if (!network.isConnected())
            {
                client.pendingViewContext = e;
                client.connectToNetwork(network, secure);
                delete client.pendingViewContext;
            }

            if (!url.target)
                return;

            if (!("pendingURLs" in network))
                network.pendingURLs = new Array();
            network.pendingURLs.unshift({ url: url, e: e });
            return;
        }
    }

    /* already connected, do whatever comes next in the url */
    //dd ("gotoIRCURL: connected, time to finish parsing ``" + url + "''");
    if (url.target)
    {
        var targetObject;
        var ev;
        if (url.isnick)
        {
            /* url points to a person. */
            var nick = url.target;
            var ary = url.target.split("!");
            if (ary)
                nick = ary[0];

            client.pendingViewContext = e;
            targetObject = network.dispatch("query", {nickname: nick});
            delete client.pendingViewContext;
        }
        else
        {
            /* url points to a channel */
            var key;
            if (url.needkey)
            {
                if (url.key)
                    key = url.key;
                else
                    key = window.promptPassword(getMsg(MSG_URL_KEY, url.spec));
            }

            if (url.charset)
            {
                client.pendingViewContext = e;
                var d = { channelName: url.target, key: key,
                          charset: url.charset };
                targetObject = network.dispatch("join", d);
                delete client.pendingViewContext;
            }
            else
            {
                // Must do this the hard way... we have the server's format
                // for the channel name here, and all our commands only work
                // with the Unicode forms.
                var serv = network.primServ;
                var target = url.target;

                /* If we don't have a valid prefix, stick a "#" on it.
                 * NOTE: This is always a "#" so that URLs may be compared
                 * properly without involving the server (e.g. off-line).
                 */
                if ((arrayIndexOf(["#", "&", "+", "!"], target[0]) == -1) &&
                    (arrayIndexOf(serv.channelTypes, target[0]) == -1))
                {
                    target = "#" + target;
                }

                var chan = new CIRCChannel(serv, null, target);

                client.pendingViewContext = e;
                d = {channelToJoin: chan, key: key};
                targetObject = network.dispatch("join", d);
                delete client.pendingViewContext;
            }

            if (!targetObject)
                return;
        }

        if (url.msg)
        {
            client.pendingViewContext = e;
            var msg;
            if (url.msg.indexOf("\01ACTION") == 0)
            {
                msg = filterOutput(url.msg, "ACTION", targetObject);
                targetObject.display(msg, "ACTION", "ME!",
                                     client.currentObject);
            }
            else
            {
                msg = filterOutput(url.msg, "PRIVMSG", targetObject);
                targetObject.display(msg, "PRIVMSG", "ME!",
                                     client.currentObject);
            }
            targetObject.say(msg);
            dispatch("set-current-view", { view: targetObject });
            delete client.pendingViewContext;
        }
    }
    else
    {
        client.pendingViewContext = e;
        if (!network.messages)
            network.displayHere(getMsg(MSG_NETWORK_OPENED, network.unicodeName));
        dispatch("set-current-view", { view: network });
        delete client.pendingViewContext;
    }
}

function updateProgress()
{
    var busy;
    var progress = -1;

    if ("busy" in client.currentObject)
        busy = client.currentObject.busy;

    if ("progress" in client.currentObject)
        progress = client.currentObject.progress;

    if (!busy)
        progress = 0;

    client.progressPanel.collapsed = !busy;
    client.progressBar.mode = (progress < 0 ? "undetermined" : "determined");
    if (progress >= 0)
        client.progressBar.value = progress;
}

function updateSecurityIcon()
{
    var o = getObjectDetails(client.currentObject);
    var securityButton = window.document.getElementById("security-button");
    securityButton.firstChild.value = "";
    securityButton.removeAttribute("level");
    securityButton.removeAttribute("tooltiptext");
    if (!o.server || !o.server.isConnected) // No server or connection?
    {
        securityButton.setAttribute("tooltiptext", MSG_SECURITY_INFO);
        return;
    }

    var securityState = o.server.connection.getSecurityState()
    switch (securityState[0])
    {
        case STATE_IS_SECURE:
            securityButton.firstChild.value = o.server.hostname;
            if (securityState[1] == STATE_SECURE_HIGH)
                securityButton.setAttribute("level", "high");
            else // Because low security is the worst we have when being secure
                securityButton.setAttribute("level", "low");

            // Add the tooltip:
            var issuer = o.server.connection.getCertificate().issuerOrganization;
            var tooltiptext = getMsg(MSG_SECURE_CONNECTION, issuer);
            securityButton.setAttribute("tooltiptext", tooltiptext);
            securityButton.firstChild.setAttribute("tooltiptext", tooltiptext);
            securityButton.lastChild.setAttribute("tooltiptext", tooltiptext);
            break;
        case STATE_IS_BROKEN:
            securityButton.setAttribute("level", "broken");
            // No break to make sure we get the correct tooltip
        case STATE_IS_INSECURE:
        default:
            securityButton.setAttribute("tooltiptext", MSG_SECURITY_INFO);
    }
}

function initOfflineIcon()
{
    const IOSVC2_CID = "@mozilla.org/network/io-service;1";
    const PRBool_CID = "@mozilla.org/supports-PRBool;1";
    const OS_CID = "@mozilla.org/observer-service;1";
    const nsISupportsPRBool = Components.interfaces.nsISupportsPRBool;

    client.offlineObserver = {
        _element: document.getElementById("offline-status"),
        _getNewIOSvc: function offline_getNewIOSvc()
        {
            try
            {
                return getService(IOSVC2_CID, "nsIIOService2");
            }
            catch (ex) {}

            // If it failed, it's probably just not there. We don't care.
            return null;
        },
        state: function offline_state()
        {
            return (client.iosvc.offline ? "offline" : "online");
        },
        observe: function offline_observe(subject, topic, state)
        {
            if ((topic == "offline-requested") &&
                (client.getConnectionCount() > 0))
            {
                var buttonAry = [MSG_REALLY_GO_OFFLINE, MSG_DONT_GO_OFFLINE];
                var rv = confirmEx(MSG_GOING_OFFLINE, buttonAry);
                if (rv == 1) // Don't go offline, please!
                {
                    subject.QueryInterface(nsISupportsPRBool);
                    subject.data = true;
                }
            }
            else if (topic == "network:offline-status-changed")
            {
                this.updateOfflineUI();
            }
        },
        updateOfflineUI: function offline_uiUpdate()
        {
            this._element.setAttribute("offlinestate", this.state());
            var tooltipMsgId = "MSG_OFFLINESTATE_" + this.state().toUpperCase();
            this._element.setAttribute("tooltiptext", window[tooltipMsgId]);
        },
        toggleOffline: function offline_toggle()
        {
            // Check whether people are OK with us going offline:
            if (!client.iosvc.offline && !this.canGoOffline())
                return;

            // Stop automatic management of the offline status, if existing.
            try
            {
                var ioSvc2 = this._getNewIOSvc();
                if (ioSvc2 && ("manageOfflineStatus" in ioSvc2))
                    ioSvc2.manageOfflineStatus = false;
            }
            catch (ex)
            {
                dd("Turning off managed offline status failed!\n" + ex);
            }

            // Actually change the offline state.
            client.iosvc.offline = !client.iosvc.offline;
            // Update the pref:
            this.updatePrefFromOffline();
        },
        canGoOffline: function offline_check()
        {
            try
            {
                var os = getService(OS_CID, "nsIObserverService");
                var canGoOffline = newObject(PRBool_CID, "nsISupportsPRBool");
                os.notifyObservers(canGoOffline, "offline-requested", null);
                // Someone called for a halt
                if (canGoOffline.data)
                    return false;
            }
            catch (ex)
            {
                dd("Exception when trying to ask if we could go offline:" + ex);
            }
            return true;
        },
        updateOfflineFromPref: function offline_syncFromPref()
        {
            // On toolkit, we might have smart management of offline mode.
            // Don't interfere.
            var ioSvc2 = this._getNewIOSvc();
            if (ioSvc2 && ioSvc2.manageOfflineStatus)
                return;

            // This is app-managed, or should be, on startup:
            if (client.host == "Mozilla")
                return;

            var isOffline = false;
            var prefSvc = getService("@mozilla.org/preferences-service;1",
                                     "nsIPrefBranch");
            // Let the app-specific hacks begin:
            try {
                if (client.host == "XULRunner")
                    isOffline = !prefSvc.getBoolPref("network.online");
                else // Toolkit based, but not standalone
                    isOffline = prefSvc.getBoolPref("browser.offline");
            }
            catch (ex) { /* Whatever. */ }

            // Actually do it:
            client.iosvc.offline = isOffline;
        },
        updatePrefFromOffline: function offline_syncToPref()
        {
            // This is app-managed, or should be.
            if (client.host == "Mozilla")
                return;

            var isOffline = client.iosvc.offline;
            var prefSvc = getService("@mozilla.org/preferences-service;1",
                                     "nsIPrefBranch");
            // Let the app-specific hacks begin:
            try {
                if (client.host == "XULRunner")
                    prefSvc.setBoolPref("network.online", !isOffline);
                else // Toolkit based, but not standalone
                    prefSvc.setBoolPref("browser.offline", isOffline);
            }
            catch (ex)
            {
                dd("Couldn't set offline pref! Error:" + ex);
            }
        }
    };

    try
    {
        var os = getService(OS_CID, "nsIObserverService");
        os.addObserver(client.offlineObserver, "offline-requested", false);
        os.addObserver(client.offlineObserver,
                       "network:offline-status-changed", false);
    }
    catch (ex)
    {
        dd("Exception when trying to register offline observers: " + ex);
    }

    var elem = client.offlineObserver._element;
    elem.setAttribute("onclick", "client.offlineObserver.toggleOffline()");
    client.offlineObserver.updateOfflineFromPref();
    client.offlineObserver.updateOfflineUI();

    // Don't leak:
    delete os;
    delete elem;
}

function uninitOfflineIcon()
{
    const OS_CID = "@mozilla.org/observer-service;1";
    try
    {
        var os = getService(OS_CID, "nsIObserverService");
        os.removeObserver(client.offlineObserver, "offline-requested", false);
        os.removeObserver(client.offlineObserver,
                          "network:offline-status-changed", false);
    }
    catch (ex)
    {
        dd("Exception when trying to unregister offline observers: " + ex);
    }
}

client.idleObserver = {
    QueryInterface: function io_qi(iid)
    {
        if (!iid || (!iid.equals(Components.interfaces.nsIObserver) &&
                     !iid.equals(Components.interfaces.nsISupports)))
        {
            throw Components.results.NS_ERROR_NO_INTERFACE;
        }
        return this;
    },
    observe: function io_observe(subject, topic, data)
    {
        if ((topic == "idle") && !client.prefs["away"])
        {
            if (!client.prefs["awayIdleMsg"])
                client.prefs["awayIdleMsg"] = MSG_AWAY_IDLE_DEFAULT;
            client.dispatch("idle-away", {reason: client.prefs["awayIdleMsg"]});
            client.isIdleAway = true;
        }
        else if ((topic == "back") && client.isIdleAway)
        {
            client.dispatch("idle-back");
            client.isIdleAway = false;
        }
    }
};

function initIdleAutoAway(timeout)
{
    // Don't try to do anything if we are disabled
    if (!timeout)
        return;

    var is = getService("@mozilla.org/widget/idleservice;1", "nsIIdleService");
    if (!is)
    {
        display(MSG_ERR_NO_IDLESERVICE, MT_WARN);
        client.prefs["autoIdleTime"] = 0;
        return;
    }

    try
    {
        is.addIdleObserver(client.idleObserver, timeout * 60);
    }
    catch (ex)
    {
        display(formatException(ex), MT_ERROR);
    }
}

function uninitIdleAutoAway(timeout)
{
    // Don't try to do anything if we were disabled before
    if (!timeout)
        return;

    var is = getService("@mozilla.org/widget/idleservice;1", "nsIIdleService");
    if (!is)
        return;

    try
    {
        is.removeIdleObserver(client.idleObserver, timeout * 60);
    }
    catch (ex)
    {
        display(formatException(ex), MT_ERROR);
    }
}

function updateAppMotif(motifURL)
{
    var node = document.firstChild;
    while (node && ((node.nodeType != node.PROCESSING_INSTRUCTION_NODE) ||
                    !(/name="dyn-motif"/).test(node.data)))
    {
        node = node.nextSibling;
    }

    motifURL = motifURL.replace(/"/g, "%22");
    var dataStr = "href=\"" + motifURL + "\" name=\"dyn-motif\"";
    try 
    {
        // No dynamic style node yet.
        if (!node)
        {
            node = document.createProcessingInstruction("xml-stylesheet", dataStr);
            document.insertBefore(node, document.firstChild);
        }
        else
        {
            node.data = dataStr;
        }
    }
    catch (ex)
    {
        dd(formatException(ex));
        var err = ex.name;
        // Mozilla 1.0 doesn't like document.insertBefore(...,
        // document.firstChild); though it has a prototype for it -
        // check for the right error:
        if (err == "NS_ERROR_NOT_IMPLEMENTED")
        {
            display(MSG_NO_DYNAMIC_STYLE, MT_INFO);
            updateAppMotif = function() {};
        }
    }
}

function updateSpellcheck(value)
{
    value = value.toString();
    document.getElementById("input").setAttribute("spellcheck", value);
    document.getElementById("multiline-input").setAttribute("spellcheck",
                                                            value);
}

function updateNetwork()
{
    var o = getObjectDetails (client.currentObject);

    var lag = MSG_UNKNOWN;
    var nick = "";
    if (o.server)
    {
        if (o.server.me)
            nick = o.server.me.unicodeName;
        lag = (o.server.lag != -1) ? o.server.lag.toFixed(2) : MSG_UNKNOWN;
    }
    client.statusBar["header-url"].setAttribute("value",
                                                 client.currentObject.getURL());
    client.statusBar["header-url"].setAttribute("href",
                                                 client.currentObject.getURL());
    client.statusBar["header-url"].setAttribute("name",
                                                 client.currentObject.unicodeName);
}

function updateTitle (obj)
{
    if (!(("currentObject" in client) && client.currentObject) ||
        (obj && obj != client.currentObject))
        return;

    var tstring = MSG_TITLE_UNKNOWN;
    var o = getObjectDetails(client.currentObject);
    var net = o.network ? o.network.unicodeName : "";
    var nick = "";
    client.statusBar["server-nick"].disabled = false;

    switch (client.currentObject.TYPE)
    {
        case "IRCNetwork":
            var serv = "", port = "";
            if (client.currentObject.isConnected())
            {
                serv = o.server.hostname;
                port = o.server.port;
                if (o.server.me)
                    nick = o.server.me.unicodeName;
                tstring = getMsg(MSG_TITLE_NET_ON, [nick, net, serv, port]);
            }
            else
            {
                nick = client.currentObject.INITIAL_NICK;
                tstring = getMsg(MSG_TITLE_NET_OFF, [nick, net]);
            }
            break;

        case "IRCChannel":
            var chan = "", mode = "", topic = "";
            if ("me" in o.parent)
            {
                nick = o.parent.me.unicodeName;
                if (o.parent.me.canonicalName in client.currentObject.users)
                {
                    var cuser = client.currentObject.users[o.parent.me.canonicalName];
                    if (cuser.isFounder)
                        nick = "~" + nick;
                    else if (cuser.isAdmin)
                        nick = "&" + nick;
                    else if (cuser.isOp)
                        nick = "@" + nick;
                    else if (cuser.isHalfOp)
                        nick = "%" + nick;
                    else if (cuser.isVoice)
                        nick = "+" + nick;
                }
            }
            else
            {
                nick = MSG_TITLE_NONICK;
            }
            chan = o.channel.unicodeName;
            mode = o.channel.mode.getModeStr();
            if (!mode)
                mode = MSG_TITLE_NO_MODE;
            topic = o.channel.topic ? o.channel.topic : MSG_TITLE_NO_TOPIC;
            var re = /\x1f|\x02|\x0f|\x16|\x03([0-9]{1,2}(,[0-9]{1,2})?)?/g;
            topic = topic.replace(re, "");

            tstring = getMsg(MSG_TITLE_CHANNEL, [nick, chan, mode, topic]);
            break;

        case "IRCUser":
            nick = client.currentObject.unicodeName;
            var source = "";
            if (client.currentObject.name)
            {
                source = "<" + client.currentObject.name + "@" +
                    client.currentObject.host +">";
            }
            tstring = getMsg(MSG_TITLE_USER, [nick, source]);
            nick = "me" in o.parent ? o.parent.me.unicodeName : MSG_TITLE_NONICK;
            break;

        case "IRCClient":
            nick = client.prefs["nickname"];
            break;

        case "IRCDCCChat":
            client.statusBar["server-nick"].disabled = true;
            nick = o.chat.me.unicodeName;
            tstring = getMsg(MSG_TITLE_DCCCHAT, o.userName);
            break;

        case "IRCDCCFileTransfer":
            client.statusBar["server-nick"].disabled = true;
            nick = o.file.me.unicodeName;
            var data = [o.file.progress, o.file.filename, o.userName];
            if (o.file.state.dir == 1)
                tstring = getMsg(MSG_TITLE_DCCFILE_SEND, data);
            else
                tstring = getMsg(MSG_TITLE_DCCFILE_GET, data);
            break;
    }

    if (0 && !client.uiState["tabstrip"])
    {
        var actl = new Array();
        for (var i in client.activityList)
            actl.push ((client.activityList[i] == "!") ?
                       (Number(i) + 1) + "!" : (Number(i) + 1));
        if (actl.length > 0)
            tstring = getMsg(MSG_TITLE_ACTIVITY,
                             [tstring, actl.join (MSG_COMMASP)]);
    }

    document.title = tstring;
    client.statusBar["server-nick"].setAttribute("label", nick);
}

// Where 'right' is orientation, not wrong/right:
function updateUserlistSide(shouldBeLeft)
{
    var listParent = document.getElementById("tabpanels-contents-box");
    var isLeft = (listParent.childNodes[0].id == "user-list-box");
    if (isLeft == shouldBeLeft)
        return;
    if (shouldBeLeft) // Move from right to left.
    {
        listParent.insertBefore(listParent.childNodes[1], listParent.childNodes[0]);
        listParent.insertBefore(listParent.childNodes[2], listParent.childNodes[0]);
        listParent.childNodes[1].setAttribute("collapse", "before");
    }
    else // Move from left to right.
    {
        listParent.appendChild(listParent.childNodes[1]);
        listParent.appendChild(listParent.childNodes[0]);
        listParent.childNodes[1].setAttribute("collapse", "after");
    }
    var userlist = document.getElementById("user-list")
    if (client.currentObject && (client.currentObject.TYPE == "IRCChannel"))
        userlist.view = client.currentObject.userList;
}

function multilineInputMode (state)
{
    var multiInput = document.getElementById("multiline-input");
    var multiInputBox = document.getElementById("multiline-box");
    var singleInput = document.getElementById("input");
    var singleInputBox = document.getElementById("singleline-box");
    var splitter = document.getElementById("input-splitter");
    var iw = document.getElementById("input-widgets");
    var h;

    client._mlMode = state;

    if (state)  /* turn on multiline input mode */
    {

        h = iw.getAttribute ("lastHeight");
        if (h)
            iw.setAttribute ("height", h); /* restore the slider position */

        singleInputBox.setAttribute ("collapsed", "true");
        splitter.setAttribute ("collapsed", "false");
        multiInputBox.setAttribute ("collapsed", "false");
        // multiInput should have the same direction as singleInput
        multiInput.setAttribute("dir", singleInput.getAttribute("dir"));
        multiInput.value = (client.input ? client.input.value : "");
        client.input = multiInput;
    }
    else  /* turn off multiline input mode */
    {
        h = iw.getAttribute ("height");
        iw.setAttribute ("lastHeight", h); /* save the slider position */
        iw.removeAttribute ("height");     /* let the slider drop */

        splitter.setAttribute ("collapsed", "true");
        multiInputBox.setAttribute ("collapsed", "true");
        singleInputBox.setAttribute ("collapsed", "false");
        // singleInput should have the same direction as multiInput
        singleInput.setAttribute("dir", multiInput.getAttribute("dir"));
        singleInput.value = (client.input ? client.input.value : "");
        client.input = singleInput;
    }

    client.input.focus();
}

function displayCertificateInfo()
{
    var o = getObjectDetails(client.currentObject);
    if (!o.server)
        return;

    if (!o.server.isSecure)
    {
        alert(getMsg(MSG_INSECURE_SERVER, o.server.hostname));
        return;
    }

    viewCert(o.server.connection.getCertificate());
}

function newInlineText (data, className, tagName)
{
    if (typeof tagName == "undefined")
        tagName = "html:span";

    var a = document.createElementNS(XHTML_NS, tagName);
    if (className)
        a.setAttribute ("class", className);

    switch (typeof data)
    {
        case "string":
            a.appendChild (document.createTextNode (data));
            break;

        case "object":
            for (var p in data)
                if (p != "data")
                    a.setAttribute (p, data[p]);
                else
                    a.appendChild (document.createTextNode (data[p]));
            break;

        case "undefined":
            break;

        default:
            ASSERT(0, "INVALID TYPE ('" + typeof data + "') passed to " +
                   "newInlineText.");
            break;

    }

    return a;

}

function stringToMsg (message, obj)
{
    var ary = message.split ("\n");
    var span = document.createElementNS(XHTML_NS, "html:span");
    var data = getObjectDetails(obj);

    if (ary.length == 1)
        client.munger.munge(ary[0], span, data);
    else
    {
        for (var l = 0; l < ary.length - 1; ++l)
        {
            client.munger.munge(ary[l], span, data);
            span.appendChild(document.createElementNS(XHTML_NS, "html:br"));
        }
        client.munger.munge(ary[l], span, data);
    }

    return span;
}

function getFrame()
{
    if (client.deck.childNodes.length == 0)
        return undefined;
    var panel = client.deck.selectedPanel;
    return getContentWindow(panel);
}

client.__defineGetter__ ("currentFrame", getFrame);

function setCurrentObject (obj)
{
    if (!ASSERT(obj.messages, "INVALID OBJECT passed to setCurrentObject **"))
        return;

    if ("currentObject" in client && client.currentObject == obj)
    {
        if (typeof client.pendingViewContext == "object")
            dispatch("create-tab-for-view", { view: obj });
        return;
    }

    // Set window.content to make screenreader apps find the chat content.
    if (obj.frame && getContentWindow(obj.frame))
        window.content = getContentWindow(obj.frame);

    var tb, userList;
    userList = document.getElementById("user-list");

    if ("currentObject" in client && client.currentObject)
        tb = getTabForObject(client.currentObject);
    if (tb)
        tb.setAttribute("state", "normal");

    client.currentObject = obj;

    // Update userlist:
    userList.view = null;
    if (obj.TYPE == "IRCChannel")
    {
        userList.view = obj.userList;
        updateUserList();
    }

    tb = dispatch("create-tab-for-view", { view: obj });
    if (tb)
    {
        tb.parentNode.selectedItem = tb;
        tb.setAttribute("state", "current");
    }

    var vk = Number(tb.getAttribute("viewKey"));
    delete client.activityList[vk];
    client.deck.selectedPanel = obj.frame;

    // Style userlist and the like:
    updateAppMotif(obj.prefs["motif.current"]);

    updateTitle();
    updateProgress();
    updateSecurityIcon();

    scrollDown(obj.frame, false);

    // Input area should have the same direction as the output area
    if (("frame" in client.currentObject) &&
        client.currentObject.frame &&
        getContentDocument(client.currentObject.frame) &&
        ("body" in getContentDocument(client.currentObject.frame)) &&
        getContentDocument(client.currentObject.frame).body)
    {
        var contentArea = getContentDocument(client.currentObject.frame).body;
        client.input.setAttribute("dir", contentArea.getAttribute("dir"));
    }
    client.input.focus();
}

function checkScroll(frame)
{
    var window = getContentWindow(frame);
    if (!window || !("document" in window))
        return false;

    return (window.document.height - window.innerHeight -
            window.pageYOffset) < 160;
}

function scrollDown(frame, force)
{
    var window = getContentWindow(frame);
    if (window && (force || checkScroll(frame)))
        window.scrollTo(0, window.document.height);
}

function advanceKeyboardFocus(amount)
{
    var contentWin = getContentWindow(client.currentObject.frame);
    var contentDoc = getContentDocument(client.currentObject.frame);
    var userList = document.getElementById("user-list");

    // Focus userlist, inputbox and outputwindow in turn:
    var focusableElems = [userList, client.input.inputField, contentWin];

    var elem = document.commandDispatcher.focusedElement;
    // Finding focus in the content window is "hard". It's going to be null
    // if the window itself is focused, and "some element" inside of it if the
    // user starts tabbing through.
    if (!elem || (elem.ownerDocument == contentDoc))
        elem = contentWin;

    var newIndex = (arrayIndexOf(focusableElems, elem) * 1 + 3 + amount) % 3;
    focusableElems[newIndex].focus();

    // Make it obvious this element now has focus.
    var outlinedElem;
    if (focusableElems[newIndex] == client.input.inputField)
        outlinedElem = client.input.parentNode.id;
    else if (focusableElems[newIndex] == userList)
        outlinedElem = "user-list-box"
    else
        outlinedElem = "browser-box";

    // Do magic, and make sure it gets undone at the right time:
    if (("focusedElemTimeout" in client) && client.focusedElemTimeout)
        clearTimeout(client.focusedElemTimeout);
    outlineFocusedElem(outlinedElem);
    client.focusedElemTimeout = setTimeout(outlineFocusedElem, 1000, "");
}

function outlineFocusedElem(id)
{
    var outlinedElements = ["user-list-box", "browser-box", "multiline-hug-box",
                            "singleline-hug-box"];
    for (var i = 0; i < outlinedElements.length; i++)
    {
        var elem = document.getElementById(outlinedElements[i]);
        if (outlinedElements[i] == id)
            elem.setAttribute("focusobvious", "true");
        else
            elem.removeAttribute("focusobvious");
    }
    client.focusedElemTimeout = 0;
}

/* valid values for |what| are "superfluous", "activity", and "attention".
 * final value for state is dependant on priority of the current state, and the
 * new state. the priority is: normal < superfluous < activity < attention.
 */
function setTabState(source, what, callback)
{
    if (typeof source != "object")
    {
        if (!ASSERT(source in client.viewsArray,
                    "INVALID SOURCE passed to setTabState"))
            return;
        source = client.viewsArray[source].source;
    }

    callback = callback || false;

    var tb = source.dispatch("create-tab-for-view", { view: source });
    var vk = Number(tb.getAttribute("viewKey"));

    var current = ("currentObject" in client && client.currentObject == source);

    /* We want to play sounds if they're from a non-current view, or we don't
     * have focus at all. Also make sure stalk matches always play sounds.
     * Also make sure we don't play on the 2nd half of the flash (Callback).
     */
    if (!callback && (!window.isFocused || !current || (what == "attention")))
    {
        if (what == "attention")
            playEventSounds(source.TYPE, "stalk");
        else if (what == "activity")
            playEventSounds(source.TYPE, "chat");
        else if (what == "superfluous")
            playEventSounds(source.TYPE, "event");
    }

    // Only change the tab's colour if it's not the active view.
    if (!current)
    {
        var state = tb.getAttribute("state");
        if (state == what)
        {
            /* if the tab state has an equal priority to what we are setting
             * then blink it */
            if (client.prefs["activityFlashDelay"] > 0)
            {
                tb.setAttribute("state", "normal");
                setTimeout(setTabState, client.prefs["activityFlashDelay"],
                           vk, what, true);
            }
        }
        else
        {
            if (state == "normal" || state == "superfluous" ||
               (state == "activity" && what == "attention"))
            {
                /* if the tab state has a lower priority than what we are
                 * setting, change it to the new state */
                tb.setAttribute("state", what);
                /* we only change the activity list if priority has increased */
                if (what == "attention")
                   client.activityList[vk] = "!";
                else if (what == "activity")
                    client.activityList[vk] = "+";
                else
                {
                   /* this is functionally equivalent to "+" for now */
                   client.activityList[vk] = "-";
                }
                updateTitle();
            }
            else
            {
                /* the current state of the tab has a higher priority than the
                 * new state.
                 * blink the new lower state quickly, then back to the old */
                if (client.prefs["activityFlashDelay"] > 0)
                {
                    tb.setAttribute("state", what);
                    setTimeout(setTabState,
                               client.prefs["activityFlashDelay"], vk,
                               state, true);
                }
            }
        }
    }
}

function notifyAttention (source)
{
    if (typeof source != "object")
        source = client.viewsArray[source].source;

    if (client.currentObject != source)
    {
        var tb = dispatch("create-tab-for-view", { view: source });
        var vk = Number(tb.getAttribute("viewKey"));

        tb.setAttribute ("state", "attention");
        client.activityList[vk] = "!";
        updateTitle();
    }

    if (client.prefs["notify.aggressive"])
        window.getAttention();

}

function setDebugMode(mode)
{
    if (mode.indexOf("t") != -1)
        client.debugHook.enabled = true;
    else
        client.debugHook.enabled = false;

    if (mode.indexOf("c") != -1)
        client.dbgContexts = true;
    else
        delete client.dbgContexts;

    if (mode.indexOf("d") != -1)
        client.dbgDispatch = true;
    else
        delete client.dbgDispatch;
}

function setListMode(mode)
{
    var elem = document.getElementById("user-list");
    if (mode)
        elem.setAttribute("mode", mode);
    else
        elem.removeAttribute("mode");
    if (elem && elem.view && elem.treeBoxObject)
    {
        elem.treeBoxObject.clearStyleAndImageCaches();
        elem.treeBoxObject.invalidate();
    }
}

function updateUserList()
{
    var node, chan;

    node = document.getElementById("user-list");
    if (!node.view)
        return;

    if (("currentObject" in client) && client.currentObject &&
        client.currentObject.TYPE == "IRCChannel")
    {
        reSortUserlist(client.currentObject);
    }
}

function reSortUserlist(channel)
{
    if (!channel || !channel.userList)
        return;
    channel.userList.childData.reSort();
}

function getNicknameForUserlistRow(index)
{
    // This wouldn't be so hard if APIs didn't change so much... see bug 221619
    var userlist = document.getElementById("user-list");
    if (userlist.columns)
        var col = userlist.columns.getNamedColumn("usercol");
    else
        col = "usercol";
    return userlist.view.getCellText(index, col);
}

function getFrameForDOMWindow(window)
{
    var frame;
    for (var i = 0; i < client.deck.childNodes.length; i++)
    {
        frame = client.deck.childNodes[i];
        if (getContentWindow(frame) == window)
            return frame;
    }
    return undefined;
}

function replaceColorCodes(msg)
{
    // Find things that look like URLs and escape the color code inside of those
    // to prevent munging the URLs resulting in broken links. Leave codes at
    // the start of the URL alone.
    msg = msg.replace(new RegExp(client.linkRE.source, "g"), function(url, _foo, scheme) {
        if (!client.checkURLScheme(scheme))
            return url;
        return url.replace(/%[BC][0-9A-Fa-f]/g, function(hex, index) {
            // as JS does not support lookbehind and we don't want to consume the
            // preceding character, we test for an existing %% manually
            var needPercent = ("%" == url.substr(index - 1, 1)) || (index == 0);
            return (needPercent ? "" : "%") + hex;
        });
    });
    
    // mIRC codes: underline, bold, Original (reset), colors, reverse colors.
    msg = msg.replace(/(^|[^%])%U/g, "$1\x1f");
    msg = msg.replace(/(^|[^%])%B/g, "$1\x02");
    msg = msg.replace(/(^|[^%])%O/g, "$1\x0f");
    msg = msg.replace(/(^|[^%])%C/g, "$1\x03");
    msg = msg.replace(/(^|[^%])%R/g, "$1\x16");
    // %%[UBOCR] --> %[UBOCR].
    msg = msg.replace(/%(%[UBOCR])/g, "$1");

    return msg;
}

function decodeColorCodes(msg)
{
    // %[UBOCR] --> %%[UBOCR].
    msg = msg.replace(/(%[UBOCR])/g, "%$1");
    // Put %-codes back in place of special character codes.
    msg = msg.replace(/\x1f/g, "%U");
    msg = msg.replace(/\x02/g, "%B");
    msg = msg.replace(/\x0f/g, "%O");
    msg = msg.replace(/\x03/g, "%C");
    msg = msg.replace(/\x16/g, "%R");

    return msg;
}

function removeColorCodes(msg)
{
    msg = msg.replace(/[\x1f\x02\x0f\x16]/g, "");
    // We need this to be global:
    msg = msg.replace(new RegExp(client.colorRE.source, "g"), "");
    return msg;
}

client.progressListener = new Object();

client.progressListener.QueryInterface =
function qi(iid)
{
    return this;
}

client.progressListener.onStateChange =
function client_statechange (webProgress, request, stateFlags, status)
{
    const nsIWebProgressListener = Components.interfaces.nsIWebProgressListener;
    const START = nsIWebProgressListener.STATE_START;
    const STOP = nsIWebProgressListener.STATE_STOP;
    const IS_NETWORK = nsIWebProgressListener.STATE_IS_NETWORK;
    const IS_DOCUMENT = nsIWebProgressListener.STATE_IS_DOCUMENT;

    var frame;

    // We only care about the initial start of loading, not the loading of
    // and page sub-components (IS_DOCUMENT, etc.).
    if ((stateFlags & START) && (stateFlags & IS_NETWORK) &&
        (stateFlags & IS_DOCUMENT))
    {
        frame = getFrameForDOMWindow(webProgress.DOMWindow);
        if (!frame)
        {
            dd("can't find frame for window (start)");
            try
            {
                webProgress.removeProgressListener(this);
            }
            catch(ex)
            {
                dd("Exception removing progress listener (start): " + ex);
            }
        }
    }
    // We only want to know when the *network* stops, not the page's
    // individual components (STATE_IS_REQUEST/STATE_IS_DOCUMENT/somesuch).
    else if ((stateFlags & STOP) && (stateFlags & IS_NETWORK))
    {
        frame = getFrameForDOMWindow(webProgress.DOMWindow);
        if (!frame)
        {
            dd("can't find frame for window (stop)");
            try
            {
                webProgress.removeProgressListener(this);
            }
            catch(ex)
            {
                dd("Exception removing progress listener (stop): " + ex);
            }
        }
        else
        {
            var cwin = getContentWindow(frame);
            if (cwin && "initOutputWindow" in cwin)
            {
                cwin.getMsg = getMsg;
                cwin.initOutputWindow(client, frame.source, onMessageViewClick);
                cwin.changeCSS(frame.source.getFontCSS("data"), "cz-fonts");
                scrollDown(frame, true);

                try
                {
                    webProgress.removeProgressListener(this);
                }
                catch(ex)
                {
                    dd("Exception removing progress listener (done): " + ex);
                }
            }
            // XXX: For about:blank it won't find initOutputWindow. Cope.
            else if (!cwin || !cwin.location ||
                     (cwin.location.href != "about:blank"))
            {
                // This should totally never ever happen. It will if we get in a
                // fight with xpcnativewrappers, though. Oops:
                dd("Couldn't find a content window or its initOutputWindow " + 
                   "function. This is BAD!");
            }
        }
    }
}

client.progressListener.onProgressChange =
function client_progresschange (webProgress, request, currentSelf, totalSelf,
                                currentMax, selfMax)
{
}

client.progressListener.onLocationChange =
function client_locationchange (webProgress, request, uri)
{
}

client.progressListener.onStatusChange =
function client_statuschange (webProgress, request, status, message)
{
}

client.progressListener.onSecurityChange =
function client_securitychange (webProgress, request, state)
{
}

function syncOutputFrame(obj, nesting)
{
    const nsIWebProgress = Components.interfaces.nsIWebProgress;
    const WINDOW = nsIWebProgress.NOTIFY_STATE_WINDOW;
    const NETWORK = nsIWebProgress.NOTIFY_STATE_NETWORK;
    const ALL = nsIWebProgress.NOTIFY_ALL;

    var iframe = obj.frame;

    function tryAgain(nLevel)
    {
        syncOutputFrame(obj, nLevel);
    };

    if (typeof nesting != "number")
        nesting = 0;

    if (nesting > 10)
    {
        dd("Aborting syncOutputFrame, taken too many tries.");
        return;
    }

    try
    {
        if (getContentDocument(iframe) && ("webProgress" in iframe))
        {
            var url = obj.prefs["outputWindowURL"];
            iframe.addProgressListener(client.progressListener, ALL);
            iframe.loadURI(url);
        }
        else
        {
            setTimeout(tryAgain, 500, nesting + 1);
        }
    }
    catch (ex)
    {
        dd("caught exception showing session view, will try again later.");
        dd(dumpObjectTree(ex) + "\n");
        setTimeout(tryAgain, 500, nesting + 1);
    }
}

function createMessages(source)
{
    playEventSounds(source.TYPE, "start");

    source.messages = document.createElementNS(XHTML_NS, "html:table");
    source.messages.setAttribute("class", "msg-table");
    source.messages.setAttribute("view-type", source.TYPE);
    source.messages.setAttribute("role", "log");
    source.messages.setAttribute("aria-live", "polite");

    var tbody = document.createElementNS(XHTML_NS, "html:tbody");
    source.messages.appendChild (tbody);
    source.messageCount = 0;
}

/* Gets the <tab> element associated with a view object.
 * If |create| is present, and true, tab is created if not found.
 */
function getTabForObject(source, create)
{
    var name;

    if (!ASSERT(source, "UNDEFINED passed to getTabForObject"))
        return null;

    if (!ASSERT("viewName" in source, "INVALID OBJECT in getTabForObject"))
        return null;

    name = source.viewName;

    var tb, id = "tb[" + name + "]";
    var matches = 1;

    for (var i in client.viewsArray)
    {
        if (client.viewsArray[i].source == source)
        {
            tb = client.viewsArray[i].tb;
            break;
        }
        else
            if (client.viewsArray[i].tb.getAttribute("id") == id)
                id = "tb[" + name + "<" + (++matches) + ">]";
    }

    /* If we found a <tab>, are allowed to create it, and have a pending view
     * context, then we're expected to move the existing tab according to said
     * context. We do that by removing the tab here, and below the creation
     * code (which is not run) we readd it in the correct location.
     */
    if (tb && create && (typeof client.pendingViewContext == "object"))
    {
        /* If we're supposed to insert before ourselves, or the next <tab>,
         * then bail out (since it's a no-op).
         */
        var tabBefore = client.pendingViewContext.tabInsertBefore;
        if (tabBefore)
        {
            var tbAfter = tb.nextSibling;
            while (tbAfter && tbAfter.collapsed && tbAfter.hidden)
                tbAfter = tbAfter.nextSibling;
            if ((tabBefore == tb) || (tabBefore == tbAfter))
                return tb;
        }

        var viewKey = Number(tb.getAttribute("viewKey"));
        arrayRemoveAt(client.viewsArray, viewKey);
        for (i = viewKey; i < client.viewsArray.length; i++)
            client.viewsArray[i].tb.setAttribute("viewKey", i);
        client.tabs.removeChild(tb);
    }
    else if (tb || (!tb && !create))
    {
        /* Either: we have a tab and don't want it moved, or didn't find one
         * and don't wish to create one.
         */
        return tb;
    }

    // Didn't found a <tab>, but we're allowed to create one.
    if (!tb && create)
    {
        if (!("messages" in source) || source.messages == null)
            createMessages(source);

        tb = document.createElement("tab");
        tb.setAttribute("ondraggesture",
                        "nsDragAndDrop.startDrag(event, tabDNDObserver);");
        tb.setAttribute("href", source.getURL());
        tb.setAttribute("name", source.unicodeName);
        tb.setAttribute("onclick", "onTabClick(event, " + id.quote() + ");");
        // This wouldn't be here if there was a supported CSS property for it.
        tb.setAttribute("crop", "center");
        tb.setAttribute("context", "context:tab");
        tb.setAttribute("tooltip", "xul-tooltip-node");
        tb.setAttribute("class", "tab-bottom view-button");
        tb.setAttribute("id", id);
        tb.setAttribute("state", "normal");
        tb.setAttribute("label", name + (matches > 1 ? "<" + matches + ">" : ""));
        tb.view = source;

        var browser = document.createElement("browser");
        browser.setAttribute("class", "output-container");
        browser.setAttribute("type", "content");
        browser.setAttribute("flex", "1");
        browser.setAttribute("tooltip", "html-tooltip-node");
        //browser.setAttribute("onload", "scrollDown(true);");
        browser.setAttribute("onclick",
                             "return onMessageViewClick(event)");
        browser.setAttribute("onmousedown",
                             "return onMessageViewMouseDown(event)");
        browser.setAttribute("oncontextmenu",
                             "return onMessageViewContextMenu(event)");
        browser.setAttribute("ondragover",
                             "nsDragAndDrop.dragOver(event, " +
                             "contentDropObserver);");
        browser.setAttribute("ondragdrop",
                             "nsDragAndDrop.drop(event, contentDropObserver);");
        browser.setAttribute("ondraggesture",
                             "nsDragAndDrop.startDrag(event, " +
                             "contentAreaDNDObserver);");
        browser.source = source;
        source.frame = browser;
        ASSERT(client.deck, "no deck?");
        client.deck.appendChild(browser);
        syncOutputFrame(source);

        if (!("userList" in source) && (source.TYPE == "IRCChannel"))
        {
            source.userListShare = new Object();
            source.userList = new XULTreeView(source.userListShare);
            source.userList.getRowProperties = ul_getrowprops;
            source.userList.getCellProperties = ul_getcellprops;
            source.userList.childData.setSortDirection(1);
        }
    }

    var beforeTab = null;
    if (typeof client.pendingViewContext == "object")
    {
        var c = client.pendingViewContext;
        /* If we have a <tab> to insert before, and it is still in the tabs,
         * move the newly-created <tab> into the right place.
         */
        if (c.tabInsertBefore && (c.tabInsertBefore.parentNode == client.tabs))
            beforeTab = c.tabInsertBefore;
    }

    if (beforeTab)
    {
        var viewKey = beforeTab.getAttribute("viewKey");
        arrayInsertAt(client.viewsArray, viewKey, {source: source, tb: tb});
        for (i = viewKey; i < client.viewsArray.length; i++)
            client.viewsArray[i].tb.setAttribute("viewKey", i);
        client.tabs.insertBefore(tb, beforeTab);
    }
    else
    {
        client.viewsArray.push({source: source, tb: tb});
        tb.setAttribute("viewKey", client.viewsArray.length - 1);
        client.tabs.appendChild(tb);
    }

    updateTabAttributes();

    return tb;
}

function updateTabAttributes()
{
    /* XXX: Workaround for Gecko bugs 272646 and 261826. Note that this breaks
     * the location of the spacers before and after the tabs but, due to our
     * own <spacer>, their flex was not being utilised anyway.
     */
    var tabOrdinal = 0;
    for (var tab = client.tabs.firstChild; tab; tab = tab.nextSibling)
        tab.ordinal = tabOrdinal++;

    /* XXX: Workaround for tabbox.xml not coping with updating attributes when
     * tabs are moved. We correct the "first-tab", "last-tab", "beforeselected"
     * and "afterselected" attributes.
     *
     * "last-tab" and "beforeselected" are updated on each valid (non-collapsed
     * and non-hidden) tab found, to avoid having to work backwards as well as
     * forwards. "first-tab" and "afterselected" are just set the once each.
     * |foundSelected| tracks where we are in relation to the selected tab.
     */
    var tabAttrs = {
        "first-tab": null,
        "last-tab": null,
        "beforeselected": null,
        "afterselected": null
    };
    var foundSelected = "before";
    for (tab = client.tabs.firstChild; tab; tab = tab.nextSibling)
    {
        if (tab.collapsed || tab.hidden)
            continue;

        if (!tabAttrs["first-tab"])
            tabAttrs["first-tab"] = tab;
        tabAttrs["last-tab"] = tab;

        if ((foundSelected == "before") && tab.selected)
            foundSelected = "on";
        else if (foundSelected == "on")
            foundSelected = "after";

        if (foundSelected == "before")
            tabAttrs["beforeselected"] = tab;
        if ((foundSelected == "after") && !tabAttrs["afterselected"])
            tabAttrs["afterselected"] = tab;
    }

    // After picking a tab for each attribute, apply them to the tabs.
    for (tab = client.tabs.firstChild; tab; tab = tab.nextSibling)
    {
        for (var attr in tabAttrs)
        {
            if (tabAttrs[attr] == tab)
                tab.setAttribute(attr, "true");
            else
                tab.removeAttribute(attr);
        }
    }
}

// Properties getter for user list tree view
function ul_getrowprops(index, properties)
{
    if ((index < 0) || (index >= this.childData.childData.length) ||
        !properties)
    {
        return;
    }

    // See bug 432482 - work around Gecko deficiency.
    if (!this.selection.isSelected(index))
        properties.AppendElement(client.atomCache["unselected"]);
}

// Properties getter for user list tree view
function ul_getcellprops(index, column, properties)
{
    if ((index < 0) || (index >= this.childData.childData.length) ||
        !properties)
    {
        return;
    }

    // See bug 432482 - work around Gecko deficiency.
    if (!this.selection.isSelected(index))
        properties.AppendElement(client.atomCache["unselected"]);

    var userObj = this.childData.childData[index]._userObj;

    properties.AppendElement(client.atomCache["voice-" + userObj.isVoice]);
    properties.AppendElement(client.atomCache["op-" + userObj.isOp]);
    properties.AppendElement(client.atomCache["halfop-" + userObj.isHalfOp]);
    properties.AppendElement(client.atomCache["admin-" + userObj.isAdmin]);
    properties.AppendElement(client.atomCache["founder-" + userObj.isFounder]);
    properties.AppendElement(client.atomCache["away-" + userObj.isAway]);
}

var contentDropObserver = new Object();

contentDropObserver.onDragOver =
function cdnd_dover(aEvent, aFlavour, aDragSession)
{
    if (aEvent.getPreventDefault())
        return;

    if (aDragSession.sourceDocument == aEvent.view.document)
    {
        aDragSession.canDrop = false;
        return;
    }
}

contentDropObserver.onDrop =
function cdnd_drop(aEvent, aXferData, aDragSession)
{
    var url = transferUtils.retrieveURLFromData(aXferData.data,
                                                aXferData.flavour.contentType);
    if (!url || url.search(client.linkRE) == -1)
        return;

    if (url.search(/\.css$/i) != -1  && confirm(getMsg(MSG_TABDND_DROP, url)))
        dispatch("motif", {"motif": url});
    else if (url.search(/^ircs?:\/\//i) != -1)
        dispatch("goto-url", {"url": url});
}

contentDropObserver.getSupportedFlavours =
function cdnd_gsf()
{
    var flavourSet = new FlavourSet();
    flavourSet.appendFlavour("text/x-moz-url");
    flavourSet.appendFlavour("application/x-moz-file", "nsIFile");
    flavourSet.appendFlavour("text/unicode");
    return flavourSet;
}

/* Drag and Drop handler for the <tabs> element.
 *
 * XXX: Some of the code below has to work around specific limitations in how
 * the nsDragAndDrop.js wrapper works. The wrapper greatly simplifies the DnD
 * code, though, so it's still worth using.
 * 
 * XXX: canDrop checks if there is a supported flavour of data because
 * nsDragAndDrop does not. This will prevent the drag service from thinking
 * we accept any old data when we don't.
 * 
 * XXX: nsDragAndDrop.checkCanDrop does this:
 *     mDragSession.canDrop = mDragSession.sourceNode != aEvent.target;
 *     mDragSession.canDrop &= aDragDropObserver.canDrop(...);
 * As a result, canDrop cannot override the false canDrop value when the source
 * and target are the same (i.e. the same <tab>). Thus, we override this check
 * inside onDragOver instead, which is called after canDrop (even if that says
 * it can't be dropped, luckily). As a result, after nsDragAndDrop has called
 * canDrop and onDragOver, the drag service's canDrop value is true iff there
 * is a supported flavour.
 * 
 * XXX: onDrop is the only place which checks we're getting an IRC URL, as
 * accessing the drag data at any other time is both tedious and could
 * significantly impact the performance of the drag (getting the data can be
 * very slow).
 */
var tabsDropObserver = new Object();

tabsDropObserver.canDrop =
function tabdnd_candrop(aEvent, aDragSession)
{
    if (aEvent.getPreventDefault())
        return false;

    // See comment above |var tabsDropObserver|.
    var flavourSet = this.getSupportedFlavours();
    for (var flavour in flavourSet.flavourTable)
    {
        if (aDragSession.isDataFlavorSupported(flavour))
            return true;
    }
    return false;
}

tabsDropObserver.onDragOver =
function tabdnd_dover(aEvent, aFlavour, aDragSession)
{
    if (aEvent.getPreventDefault())
        return;

    // See comment above |var tabsDropObserver|.
    if (aDragSession.sourceNode == aEvent.target)
        aDragSession.canDrop = true;

    // If we're not accepting the drag, don't show the marker either.
    if (!aDragSession.canDrop)
    {
        client.tabDragBar.collapsed = true;
        return;
    }

    /* Locate the tab we're about to drop onto. We split tabs in half, dropping
     * on the side closest to the mouse, or after the last tab if the mouse is
     * somewhere beyond all the tabs.
     */
    var ltr = (window.getComputedStyle(client.tabs, null).direction == "ltr");
    var newPosition = client.tabs.firstChild.boxObject.x;
    for (var dropTab = client.tabs.firstChild; dropTab;
         dropTab = dropTab.nextSibling)
    {
        if (dropTab.collapsed || dropTab.hidden)
            continue;
        var bo = dropTab.boxObject;
        if ((ltr && (aEvent.screenX < bo.screenX + bo.width / 2)) ||
            (!ltr && (aEvent.screenX > bo.screenX + bo.width / 2)))
        {
            break;
        }
        newPosition = bo.x + bo.width;
    }

    // Reposition the drop marker and show it. In that order.
    client.tabDragMarker.style.MozMarginStart = newPosition + "px";
    client.tabDragBar.collapsed = false;
}

tabsDropObserver.onDragExit =
function tabdnd_dexit(aEvent, aDragSession)
{
    if (aEvent.getPreventDefault())
        return;

    /* We've either stopped being part of a drag operation, or the dragging is
     * somewhere away from us.
     */
    client.tabDragBar.collapsed = true;
}

tabsDropObserver.onDrop =
function tabdnd_drop(aEvent, aXferData, aDragSession)
{
    // See comment above |var tabsDropObserver|.
    var url = transferUtils.retrieveURLFromData(aXferData.data,
                                                aXferData.flavour.contentType);
    if (!url || !(url.match(/^ircs?:/) || url.match(/^x-irc-dcc-(chat|file):/)))
        return;

    // Find the tab to insertBefore() the new one.
    var ltr = (window.getComputedStyle(client.tabs, null).direction == "ltr");
    for (var dropTab = client.tabs.firstChild; dropTab;
         dropTab = dropTab.nextSibling)
    {
        if (dropTab.collapsed || dropTab.hidden)
            continue;
        var bo = dropTab.boxObject;
        if ((ltr && (aEvent.screenX < bo.screenX + bo.width / 2)) ||
            (!ltr && (aEvent.screenX > bo.screenX + bo.width / 2)))
        {
            break;
        }
    }

    // Check if the URL is already in the views.
    for (var i = 0; i < client.viewsArray.length; i++)
    {
        var view = client.viewsArray[i].source;
        if (view.getURL() == url)
        {
            client.pendingViewContext = { tabInsertBefore: dropTab };
            dispatch("create-tab-for-view", { view: view });
            delete client.pendingViewContext;
            return;
        }
    }

    // URL not found in tabs, so force it into life - this may connect/rejoin.
    if (url.substring(0, 3) == "irc")
        gotoIRCURL(url, { tabInsertBefore: dropTab });
}

tabsDropObserver.getSupportedFlavours =
function tabdnd_gsf()
{
    var flavourSet = new FlavourSet();
    flavourSet.appendFlavour("text/x-moz-url");
    flavourSet.appendFlavour("text/unicode");
    return flavourSet;
}

var tabDNDObserver = new Object();

tabDNDObserver.onDragStart =
function tabdnd_dstart (aEvent, aXferData, aDragAction)
{
    var tb = aEvent.currentTarget;
    var href = tb.getAttribute("href");
    var name = tb.getAttribute("name");

    aXferData.data = new TransferData();
    /* x-moz-url has the format "<url>\n<name>", goodie */
    aXferData.data.addDataForFlavour("text/x-moz-url", href + "\n" + name);
    aXferData.data.addDataForFlavour("text/unicode", href);
    aXferData.data.addDataForFlavour("text/html", "<a href='" + href + "'>" +
                                     name + "</a>");
}

var userlistDNDObserver = new Object();

userlistDNDObserver.onDragStart =
function userlistdnd_dstart(event, transferData, dragAction)
{
    var col = new Object(), row = new Object(), cell = new Object();
    var tree = document.getElementById('user-list');
    tree.treeBoxObject.getCellAt(event.clientX, event.clientY, row, col, cell);
    // Check whether we're actually on a normal row and cell
    if (!cell.value || (row.value == -1))
        return;

    var nickname = getNicknameForUserlistRow(row.value);
    transferData.data = new TransferData();
    transferData.data.addDataForFlavour("text/unicode", nickname);
}

function deleteTab(tb)
{
    if (!ASSERT(tb.hasAttribute("viewKey"),
                "INVALID OBJECT passed to deleteTab (" + tb + ")"))
    {
        return null;
    }

    var key = Number(tb.getAttribute("viewKey"));

    // Re-index higher tabs.
    for (var i = key + 1; i < client.viewsArray.length; i++)
        client.viewsArray[i].tb.setAttribute("viewKey", i - 1);
    arrayRemoveAt(client.viewsArray, key);
    client.tabs.removeChild(tb);
    updateTabAttributes();

    return key;
}

function filterOutput(msg, msgtype, dest)
{
    if ("outputFilters" in client)
    {
        for (var f in client.outputFilters)
        {
            if (client.outputFilters[f].enabled)
                msg = client.outputFilters[f].func(msg, msgtype, dest);
        }
    }

    return msg;
}

function updateTimestamps(view)
{
    if (!("messages" in view))
        return;

    view._timestampLast = "";
    var node = view.messages.firstChild.firstChild;
    var nested;
    while (node)
    {
        if(node.className == "msg-nested-tr")
        {
            nested = node.firstChild.firstChild.firstChild.firstChild;
            while (nested)
            {
                updateTimestampFor(view, nested);
                nested = nested.nextSibling;
            }
        }
        else
        {
            updateTimestampFor(view, node);
        }
        node = node.nextSibling;
    }
}

function updateTimestampFor(view, displayRow, forceOldStamp)
{
    var time = new Date(1 * displayRow.getAttribute("timestamp"));
    var tsCell = displayRow.firstChild;
    if (!tsCell)
        return;

    var fmt;
    if (view.prefs["timestamps"])
        fmt = strftime(view.prefs["timestamps.display"], time);

    while (tsCell.lastChild)
        tsCell.removeChild(tsCell.lastChild);

    var needStamp = fmt && (forceOldStamp || !view.prefs["collapseMsgs"] ||
                            (fmt != view._timestampLast));
    if (needStamp)
        tsCell.appendChild(document.createTextNode(fmt));
    if (!forceOldStamp)
        view._timestampLast = fmt;
}

client.updateMenus =
function c_updatemenus(menus)
{
    // Don't bother if the menus aren't even created yet.
    if (!client.initialized)
        return null;

    return this.menuManager.updateMenus(document, menus);
}

client.checkURLScheme =
function c_checkURLScheme(url)
{
    if (!("schemes" in client))
    {
        var pfx = "@mozilla.org/network/protocol;1?name=";
        var len = pfx.length;

        client.schemes = new Object();
        for (var c in Components.classes)
        {
            if (c.indexOf(pfx) == 0)
                client.schemes[c.substr(len)] = true;
        }
    }
    return (url in client.schemes);
}

client.adoptNode =
function cli_adoptnode(node, doc)
{
    try
    {
        doc.adoptNode(node);
    }
    catch(ex)
    {
        dd(formatException(ex));
        var err = ex.name;
        // TypeError from before adoptNode was added; NOT_IMPL after.
        if ((err == "TypeError") || (err == "NS_ERROR_NOT_IMPLEMENTED"))
            client.adoptNode = cli_adoptnode_noop;
    }
    return node;
}

function cli_adoptnode_noop(node, doc)
{
    return node;
}

client.addNetwork =
function cli_addnet(name, serverList, temporary)
{
    client.networks[name] =
        new CIRCNetwork(name, serverList, client.eventPump, temporary);
}

client.removeNetwork =
function cli_removenet(name)
{
    // Allow network a chance to clean up any mess.
    if (typeof client.networks[name].destroy == "function")
        client.networks[name].destroy();

    delete client.networks[name];
}

client.connectToNetwork =
function cli_connect(networkOrName, requireSecurity)
{
    var network;
    var name;


    if (isinstance(networkOrName, CIRCNetwork))
    {
        network = networkOrName;
    }
    else
    {
        name = networkOrName;

        if (!(name in client.networks))
        {
            display(getMsg(MSG_ERR_UNKNOWN_NETWORK, name), MT_ERROR);
            return null;
        }

        network = client.networks[name];
    }
    name = network.unicodeName;

    if (!("messages" in network))
        network.displayHere(getMsg(MSG_NETWORK_OPENED, name));

    dispatch("set-current-view", { view: network });

    if (network.isConnected())
    {
        network.display(getMsg(MSG_ALREADY_CONNECTED, name));
        return network;
    }

    if (network.state != NET_OFFLINE)
        return network;

    if (network.prefs["nickname"] == DEFAULT_NICK)
        network.prefs["nickname"] = prompt(MSG_ENTER_NICK, DEFAULT_NICK);

    if (!("connecting" in network))
        network.display(getMsg(MSG_NETWORK_CONNECTING, name));

    network.connect(requireSecurity);

    network.updateHeader();
    client.updateHeader();
    updateTitle();

    return network;
}


client.getURL =
function cli_geturl ()
{
    return "irc://";
}

client.load =
function cli_load(url, scope)
{
    if (!("_loader" in client))
    {
        const LOADER_CTRID = "@mozilla.org/moz/jssubscript-loader;1";
        const mozIJSSubScriptLoader =
            Components.interfaces.mozIJSSubScriptLoader;

        var cls;
        if ((cls = Components.classes[LOADER_CTRID]))
            client._loader = cls.getService(mozIJSSubScriptLoader);
    }

    return client._loader.loadSubScript(url, scope);
}

client.sayToCurrentTarget =
function cli_say(msg, isInteractive)
{
    if ("say" in client.currentObject)
    {
        client.currentObject.dispatch("say", {message: msg}, isInteractive);
        return;
    }

    switch (client.currentObject.TYPE)
    {
        case "IRCClient":
            dispatch("eval", {expression: msg}, isInteractive);
            break;

        default:
            if (msg != "")
                display(MSG_ERR_NO_DEFAULT, MT_ERROR);
            break;
    }
}

CIRCNetwork.prototype.__defineGetter__("prefs", net_getprefs);
function net_getprefs()
{
    if (!("_prefs" in this))
    {
        this._prefManager = getNetworkPrefManager(this);
        this._prefs = this._prefManager.prefs;
    }

    return this._prefs;
}

CIRCNetwork.prototype.__defineGetter__("prefManager", net_getprefmgr);
function net_getprefmgr()
{
    if (!("_prefManager" in this))
    {
        this._prefManager = getNetworkPrefManager(this);
        this._prefs = this._prefManager.prefs;
    }

    return this._prefManager;
}

CIRCServer.prototype.__defineGetter__("prefs", srv_getprefs);
function srv_getprefs()
{
    return this.parent.prefs;
}

CIRCServer.prototype.__defineGetter__("prefManager", srv_getprefmgr);
function srv_getprefmgr()
{
    return this.parent.prefManager;
}

CIRCChannel.prototype.__defineGetter__("prefs", chan_getprefs);
function chan_getprefs()
{
    if (!("_prefs" in this))
    {
        this._prefManager = getChannelPrefManager(this);
        this._prefs = this._prefManager.prefs;
    }

    return this._prefs;
}

CIRCChannel.prototype.__defineGetter__("prefManager", chan_getprefmgr);
function chan_getprefmgr()
{
    if (!("_prefManager" in this))
    {
        this._prefManager = getChannelPrefManager(this);
        this._prefs = this._prefManager.prefs;
    }

    return this._prefManager;
}

CIRCUser.prototype.__defineGetter__("prefs", usr_getprefs);
function usr_getprefs()
{
    if (!("_prefs" in this))
    {
        this._prefManager = getUserPrefManager(this);
        this._prefs = this._prefManager.prefs;
    }

    return this._prefs;
}

CIRCUser.prototype.__defineGetter__("prefManager", usr_getprefmgr);
function usr_getprefmgr()
{
    if (!("_prefManager" in this))
    {
        this._prefManager = getUserPrefManager(this);
        this._prefs = this._prefManager.prefs;
    }

    return this._prefManager;
}

CIRCDCCUser.prototype.__defineGetter__("prefs", dccusr_getprefs);
function dccusr_getprefs()
{
    if (!("_prefs" in this))
    {
        this._prefManager = getDCCUserPrefManager(this);
        this._prefs = this._prefManager.prefs;
    }

    return this._prefs;
}

CIRCDCCUser.prototype.__defineGetter__("prefManager", dccusr_getprefmgr);
function dccusr_getprefmgr()
{
    if (!("_prefManager" in this))
    {
        this._prefManager = getDCCUserPrefManager(this);
        this._prefs = this._prefManager.prefs;
    }

    return this._prefManager;
}

CIRCDCCChat.prototype.__defineGetter__("prefs", dccchat_getprefs);
function dccchat_getprefs()
{
    return this.user.prefs;
}

CIRCDCCChat.prototype.__defineGetter__("prefManager", dccchat_getprefmgr);
function dccchat_getprefmgr()
{
    return this.user.prefManager;
}

CIRCDCCFileTransfer.prototype.__defineGetter__("prefs", dccfile_getprefs);
function dccfile_getprefs()
{
    return this.user.prefs;
}

CIRCDCCFileTransfer.prototype.__defineGetter__("prefManager", dccfile_getprefmgr);
function dccfile_getprefmgr()
{
    return this.user.prefManager;
}

// This is a copy of the splitting done in CIRCServer.prototype.messageTo
// Please keep this in mind when editing:
CIRCServer.prototype.splitLinesForSending =
function my_splitlinesforsending(line)
{
    var lines = line.split("\n");
    var realLines = new Array();
    for (var i = 0; i < lines.length; i++)
    {
        if (lines[i])
        {
            while (lines[i].length > this.maxLineLength)
            {
                var extraLine = lines[i].substr(0, this.maxLineLength - 5);
                var pos = extraLine.lastIndexOf(" ");

                if ((pos >= 0) && (pos >= this.maxLineLength - 15))
                {
                    // Smart-split.
                    extraLine = lines[i].substr(0, pos) + "...";
                    lines[i] = "..." + lines[i].substr(extraLine.length - 2);
                }
                else
                {
                    // Dump-split.
                    extraLine = lines[i].substr(0, this.maxLineLength);
                    lines[i] = lines[i].substr(extraLine.length);
                }
                realLines.push(extraLine);
            }
            realLines.push(lines[i]);
        }
    }
    return realLines;
}

/* Displays a network-centric message on the most appropriate view.
 *
 * When |client.SLOPPY_NETWORKS| is |true|, messages will be displayed on the
 * *current* view instead of the network view, if the current view is part of
 * the same network.
 */
CIRCNetwork.prototype.display =
function net_display(message, msgtype, sourceObj, destObj)
{
    var o = getObjectDetails(client.currentObject);
    if (client.SLOPPY_NETWORKS && client.currentObject != this &&
        o.network == this && o.server && o.server.isConnected)
    {
        client.currentObject.display(message, msgtype, sourceObj, destObj);
    }
    else
    {
        this.displayHere(message, msgtype, sourceObj, destObj);
    }
}

/* Displays a channel-centric message on the most appropriate view.
 *
 * If the channel view already exists (visible or hidden), messages are added
 * to it; otherwise, messages go to the *network* view.
 */
CIRCChannel.prototype.display =
function chan_display(message, msgtype, sourceObj, destObj)
{
    if ("messages" in this)
        this.displayHere(message, msgtype, sourceObj, destObj);
    else
        this.parent.parent.displayHere(message, msgtype, sourceObj, destObj);
}

/* Displays a user-centric message on the most appropriate view.
 *
 * If the user view already exists (visible or hidden), messages are added to
 * it; otherwise, it goes to the *current* view if the current view is part of
 * the same network, or the *network* view if not.
 */
CIRCUser.prototype.display =
function usr_display(message, msgtype, sourceObj, destObj)
{
    if ("messages" in this)
    {
        this.displayHere(message, msgtype, sourceObj, destObj);
    }
    else
    {
        var o = getObjectDetails(client.currentObject);
        if (o.server && o.server.isConnected &&
            o.network == this.parent.parent &&
            client.currentObject.TYPE != "IRCUser")
            client.currentObject.display(message, msgtype, sourceObj, destObj);
        else
            this.parent.parent.displayHere(message, msgtype, sourceObj,
                                           destObj);
    }
}

/* Displays a DCC user/file transfer-centric message on the most appropriate view.
 *
 * If the DCC user/file transfer view already exists (visible or hidden),
 * messages are added to it; otherwise, messages go to the *current* view.
 */
CIRCDCCChat.prototype.display =
CIRCDCCFileTransfer.prototype.display =
function dcc_display(message, msgtype, sourceObj, destObj)
{
    if ("messages" in this)
        this.displayHere(message, msgtype, sourceObj, destObj);
    else
        client.currentObject.display(message, msgtype, sourceObj, destObj);
}

function feedback(e, message, msgtype, sourceObj, destObj)
{
    if ("isInteractive" in e && e.isInteractive)
        display(message, msgtype, sourceObj, destObj);
}

CIRCChannel.prototype.feedback =
CIRCNetwork.prototype.feedback =
CIRCUser.prototype.feedback =
CIRCDCCChat.prototype.feedback =
CIRCDCCFileTransfer.prototype.feedback =
client.feedback =
function this_feedback(e, message, msgtype, sourceObj, destObj)
{
    if ("isInteractive" in e && e.isInteractive)
        this.displayHere(message, msgtype, sourceObj, destObj);
}

function display (message, msgtype, sourceObj, destObj)
{
    client.currentObject.display (message, msgtype, sourceObj, destObj);
}

client.getFontCSS =
CIRCNetwork.prototype.getFontCSS =
CIRCChannel.prototype.getFontCSS =
CIRCUser.prototype.getFontCSS =
CIRCDCCChat.prototype.getFontCSS =
CIRCDCCFileTransfer.prototype.getFontCSS =
function this_getFontCSS(format)
{
    /* Wow, this is cool. We just put together a CSS-rule string based on the
     * font preferences. *This* is what CSS is all about. :)
     * We also provide a "data: URL" format, to simplify other code.
     */
    var css;
    var fs;
    var fn;

    if (this.prefs["font.family"] != "default")
        fn = "font-family: " + this.prefs["font.family"] + ";";
    else
        fn = "font-family: inherit;";
    if (this.prefs["font.size"] != 0)
        fs = "font-size: " + this.prefs["font.size"] + "pt;";
    else
        fs = "font-size: medium;";

    css = "body.chatzilla-body { " + fs + fn + " }";

    if (format == "data")
        return "data:text/css," + encodeURIComponent(css);
    return css;
}

client.display =
client.displayHere =
CIRCNetwork.prototype.displayHere =
CIRCChannel.prototype.displayHere =
CIRCUser.prototype.displayHere =
CIRCDCCChat.prototype.displayHere =
CIRCDCCFileTransfer.prototype.displayHere =
function __display(message, msgtype, sourceObj, destObj)
{
    // We need a message type, assume "INFO".
    if (!msgtype)
        msgtype = MT_INFO;

    var msgprefix = "";
    if (msgtype.indexOf("/") != -1)
    {
        var ary = msgtype.match(/^(.*)\/(.*)$/);
        msgtype = ary[1];
        msgprefix = ary[2];
    }

    var blockLevel = false; /* true if this row should be rendered at block
                             * level, (like, if it has a really long nickname
                             * that might disturb the rest of the layout)     */
    var o = getObjectDetails(this);           /* get the skinny on |this|     */

    // Get the 'me' object, so we can be sure to get the attributes right.
    var me;
    if ("me" in this)
        me = this.me;
    else if (o.server && "me" in o.server)
        me = o.server.me;

    // Let callers get away with "ME!" and we have to substitute here.
    if (sourceObj == "ME!")
        sourceObj = me;
    if (destObj == "ME!")
        destObj = me;

    // Get the TYPE of the source object.
    var fromType = (sourceObj && sourceObj.TYPE) ? sourceObj.TYPE : "unk";
    // Is the source a user?
    var fromUser = (fromType.search(/IRC.*User/) != -1);
    // Get some sort of "name" for the source.
    var fromAttr = "";
    if (sourceObj)
    {
        if ("canonicalName" in sourceObj)
            fromAttr = sourceObj.canonicalName;
        else if ("name" in sourceObj)
            fromAttr = sourceObj.name;
        else
            fromAttr = sourceObj.viewName;
    }

    // Get the dest TYPE too...
    var toType = (destObj) ? destObj.TYPE : "unk";
    // Is the dest a user?
    var toUser = (toType.search(/IRC.*User/) != -1);
    // Get a dest name too...
    var toAttr = "";
    if (destObj)
    {
        if ("canonicalName" in destObj)
            toAttr = destObj.canonicalName;
        else if ("name" in destObj)
            toAttr = destObj.name;
        else
            toAttr = destObj.viewName;
    }
        
    // Is the message 'to' or 'from' somewhere other than this view
    var toOther = ((sourceObj == me) && destObj && (destObj != this));
    var fromOther = (toUser && (destObj == me) && (sourceObj != this) &&
                     // Need extra check for DCC users:
                     !((this.TYPE == "IRCDCCChat") && (this.user == sourceObj)));

    // Attach "ME!" if appropriate, so motifs can style differently.
    if ((sourceObj == me) && !toOther)
        fromAttr = fromAttr + " ME!";
    if (destObj && destObj == me)
        toAttr = me.canonicalName + " ME!";

    /* isImportant means to style the messages as important, and flash the
     * window, getAttention means just flash the window. */
    var isImportant = false, getAttention = false, isSuperfluous = false;
    var viewType = this.TYPE;
    var code;
    var time = new Date();

    var timeStamp = strftime(this.prefs["timestamps.log"], time);

    // Statusbar text, and the line that gets saved to the log.
    var statusString;
    var logStringPfx = timeStamp + " ";
    var logStrings = new Array();

    if (fromUser)
    {
        statusString = getMsg(MSG_FMT_STATUS,
                              [timeStamp,
                               sourceObj.unicodeName + "!" +
                               sourceObj.name + "@" + sourceObj.host]);
    }
    else
    {
        var name;
        if (sourceObj)
            name = sourceObj.viewName;
        else
            name = this.viewName;

        statusString = getMsg(MSG_FMT_STATUS,
                              [timeStamp, name]);
    }

    // The table row, and it's attributes.
    var msgRow = document.createElementNS(XHTML_NS, "html:tr");
    msgRow.setAttribute("class", "msg");
    msgRow.setAttribute("msg-type", msgtype);
    msgRow.setAttribute("msg-prefix", msgprefix);
    msgRow.setAttribute("msg-dest", toAttr);
    msgRow.setAttribute("dest-type", toType);
    msgRow.setAttribute("view-type", viewType);
    msgRow.setAttribute("statusText", statusString);
    msgRow.setAttribute("timestamp", Number(time));
    if (fromAttr)
    {
        if (fromUser)
        {
            msgRow.setAttribute("msg-user", fromAttr);
            // Set some mode information for channel users
            if (fromType == 'IRCChanUser')
                msgRow.setAttribute("msg-user-mode", sourceObj.modes.join(" "));
        }
        else
        {
            msgRow.setAttribute("msg-source", fromAttr);
        }
    }
    if (toOther)
        msgRow.setAttribute("to-other", toOther);
    if (fromOther)
        msgRow.setAttribute("from-other", fromOther);

    // Timestamp cell.
    var msgRowTimestamp = document.createElementNS(XHTML_NS, "html:td");
    msgRowTimestamp.setAttribute("class", "msg-timestamp");

    var canMergeData;
    var msgRowSource, msgRowType, msgRowData;
    if (fromUser && msgtype.match(/^(PRIVMSG|ACTION|NOTICE|WALLOPS)$/))
    {
        var nick = sourceObj.unicodeName;
        var decorSt = "";
        var decorEn = "";

        // Set default decorations.
        if (msgtype == "ACTION")
        {
            decorSt = "* ";
        }
        else
        {
            decorSt = "<";
            decorEn = ">";
        }

        var nickURL;
        if ((sourceObj != me) && ("getURL" in sourceObj))
            nickURL = sourceObj.getURL();
        if (toOther && ("getURL" in destObj))
            nickURL = destObj.getURL();

        if (sourceObj != me)
        {
            // Not from us...
            if (destObj == me)
            {
                // ...but to us. Messages from someone else to us.

                getAttention = true;
                this.defaultCompletion = "/msg " + nick + " ";

                // If this is a private message, and it's not in a query view,
                // use *nick* instead of <nick>.
                if ((msgtype != "ACTION") && (this.TYPE != "IRCUser"))
                {
                    decorSt = "*";
                    decorEn = "*";
                }
            }
            else
            {
                // ...or to us. Messages from someone else to channel or similar.

                if ((typeof message == "string") && me)
                    isImportant = msgIsImportant(message, nick, o.network);
                else if (message.hasAttribute("isImportant") && me)
                    isImportant = true;

                if (isImportant)
                {
                    this.defaultCompletion = nick +
                        client.prefs["nickCompleteStr"] + " ";
                }
            }
        }
        else
        {
            // Messages from us, to somewhere other than this view
            if (toOther)
            {
                nick = destObj.unicodeName;
                decorSt = ">";
                decorEn = "<";
            }
        }

        // Log the nickname in the same format as we'll let the user copy.
        // If the message has a prefix, show it after a "/".
        if (msgprefix)
            logStringPfx += decorSt + nick + "/" + msgprefix + decorEn + " ";
        else
            logStringPfx += decorSt + nick + decorEn + " ";

        if (!("lastNickDisplayed" in this) || this.lastNickDisplayed != nick)
        {
            this.lastNickDisplayed = nick;
            this.mark = (("mark" in this) && this.mark == "even") ? "odd" : "even";
        }

        msgRowSource = document.createElementNS(XHTML_NS, "html:td");
        msgRowSource.setAttribute("class", "msg-user");

        // Make excessive nicks get shunted.
        if (nick && (nick.length > client.MAX_NICK_DISPLAY))
            blockLevel = true;

        if (decorSt)
            msgRowSource.appendChild(newInlineText(decorSt, "chatzilla-decor"));
        if (nickURL)
        {
            var nick_anchor = document.createElementNS(XHTML_NS, "html:a");
            nick_anchor.setAttribute("class", "chatzilla-link");
            nick_anchor.setAttribute("href", nickURL);
            nick_anchor.appendChild(newInlineText(nick));
            msgRowSource.appendChild(nick_anchor);
        }
        else
        {
            msgRowSource.appendChild(newInlineText(nick));
        }
        if (msgprefix)
        {
            /* We don't style the "/" with chatzilla-decor because the one
             * thing we don't want is it disappearing!
             */
            msgRowSource.appendChild(newInlineText("/", ""));
            msgRowSource.appendChild(newInlineText(msgprefix,
                                                   "chatzilla-prefix"));
        }
        if (decorEn)
            msgRowSource.appendChild(newInlineText(decorEn, "chatzilla-decor"));
        canMergeData = this.prefs["collapseMsgs"];
    }
    else if (msgprefix)
    {
        decorSt = "<";
        decorEn = ">";

        logStringPfx += decorSt + "/" + msgprefix + decorEn + " ";

        msgRowSource = document.createElementNS(XHTML_NS, "html:td");
        msgRowSource.setAttribute("class", "msg-user");

        msgRowSource.appendChild(newInlineText(decorSt, "chatzilla-decor"));
        msgRowSource.appendChild(newInlineText("/", ""));
        msgRowSource.appendChild(newInlineText(msgprefix, "chatzilla-prefix"));
        msgRowSource.appendChild(newInlineText(decorEn, "chatzilla-decor"));
        canMergeData = this.prefs["collapseMsgs"];
    }
    else
    {
        isSuperfluous = true;
        if (!client.debugHook.enabled && msgtype in client.responseCodeMap)
        {
            code = client.responseCodeMap[msgtype];
        }
        else
        {
            if (!client.debugHook.enabled && client.HIDE_CODES)
                code = client.DEFAULT_RESPONSE_CODE;
            else
                code = "[" + msgtype + "]";
        }

        /* Display the message code */
        msgRowType = document.createElementNS(XHTML_NS, "html:td");
        msgRowType.setAttribute("class", "msg-type");

        msgRowType.appendChild(newInlineText(code));
        logStringPfx += code + " ";
    }

    if (message)
    {
        msgRowData = document.createElementNS(XHTML_NS, "html:td");
        msgRowData.setAttribute("class", "msg-data");

        var tmpMsgs = message;
        if (typeof message == "string")
        {
            msgRowData.appendChild(stringToMsg(message, this));
        }
        else
        {
            msgRowData.appendChild(message);
            tmpMsgs = tmpMsgs.innerHTML.replace(/<[^<]*>/g, "");
        }
        tmpMsgs = tmpMsgs.split(/\r?\n/);
        for (var l = 0; l < tmpMsgs.length; l++)
            logStrings[l] = logStringPfx + tmpMsgs[l];
    }

    if ("mark" in this)
        msgRow.setAttribute("mark", this.mark);

    if (isImportant)
    {
        if ("importantMessages" in this)
        {
            var importantId = "important" + (this.importantMessages++);
            msgRow.setAttribute("id", importantId);
        }
        msgRow.setAttribute("important", "true");
        msgRow.setAttribute("aria-live", "assertive");
    }

    // Timestamps first...
    msgRow.appendChild(msgRowTimestamp);
    // Now do the rest of the row, after block-level stuff.
    if (msgRowSource)
        msgRow.appendChild(msgRowSource);
    else
        msgRow.appendChild(msgRowType);
    if (msgRowData)
        msgRow.appendChild(msgRowData);
    updateTimestampFor(this, msgRow);

    if (blockLevel)
    {
        /* putting a div here crashes mozilla, so fake it with nested tables
         * for now */
        var tr = document.createElementNS(XHTML_NS, "html:tr");
        tr.setAttribute ("class", "msg-nested-tr");
        var td = document.createElementNS(XHTML_NS, "html:td");
        td.setAttribute ("class", "msg-nested-td");
        td.setAttribute ("colspan", "3");

        tr.appendChild(td);
        var table = document.createElementNS(XHTML_NS, "html:table");
        table.setAttribute ("class", "msg-nested-table");
        table.setAttribute("role", "presentation");

        td.appendChild (table);
        var tbody =  document.createElementNS(XHTML_NS, "html:tbody");

        tbody.appendChild(msgRow);
        table.appendChild(tbody);
        msgRow = tr;
    }

    // Actually add the item.
    addHistory (this, msgRow, canMergeData);

    // Update attention states...
    if (isImportant || getAttention)
    {
        setTabState(this, "attention");
        if (client.prefs["notify.aggressive"])
            window.getAttention();
    }
    else
    {
        if (isSuperfluous)
        {
            setTabState(this, "superfluous");
        }
        else
        {
            setTabState(this, "activity");
        }
    }

    // Copy Important Messages [to network view].
    if (isImportant && client.prefs["copyMessages"] && (o.network != this))
    {
        if (importantId)
        {
            // Create the linked inline button
            var msgspan = document.createElementNS(XHTML_NS, "html:span");
            msgspan.setAttribute("isImportant", "true");

            var cmd = "jump-to-anchor " + importantId + " " + this.unicodeName;
            var prefix = getMsg(MSG_JUMPTO_BUTTON, [this.unicodeName, cmd]);

            // Munge prefix as a button
            client.munger.getRule(".inline-buttons").enabled = true;
            client.munger.munge(prefix + " ", msgspan, o);

            // Munge rest of message normally
            client.munger.getRule(".inline-buttons").enabled = false;
            client.munger.munge(message, msgspan, o);

            o.network.displayHere(msgspan, msgtype, sourceObj, destObj);
        }
        else
        {
            o.network.displayHere(message, msgtype, sourceObj, destObj);
        }
    }

    // Log file time!
    if (this.prefs["log"])
    {
        if (!this.logFile)
            client.openLogFile(this);

        try
        {
            var LE = client.lineEnd;
            for (var l = 0; l < logStrings.length; l++)
                this.logFile.write(fromUnicode(logStrings[l] + LE, "utf-8"));
        }
        catch (ex)
        {
            // Stop logging before showing any messages!
            this.prefs["log"] = false;
            dd("Log file write error: " + formatException(ex));
            this.displayHere(getMsg(MSG_LOGFILE_WRITE_ERROR, getLogPath(this)),
                             "ERROR");
        }
    }
}

function addHistory (source, obj, mergeData)
{
    if (!("messages" in source) || (source.messages == null))
        createMessages(source);

    var tbody = source.messages.firstChild;
    var appendTo = tbody;

    var needScroll = false;

    if (mergeData)
    {
        var inobj = obj;
        // This gives us the non-nested row when there is nesting.
        if (inobj.className == "msg-nested-tr")
            inobj = inobj.firstChild.firstChild.firstChild.firstChild;

        var thisUserCol = inobj.firstChild;
        while (thisUserCol && !thisUserCol.className.match(/^(msg-user|msg-type)$/))
            thisUserCol = thisUserCol.nextSibling;

        var thisMessageCol = inobj.firstChild;
        while (thisMessageCol && !(thisMessageCol.className == "msg-data"))
            thisMessageCol = thisMessageCol.nextSibling;

        var ci = findPreviousColumnInfo(source.messages);
        var nickColumns = ci.nickColumns;
        var rowExtents = ci.extents;
        var nickColumnCount = nickColumns.length;

        var lastRowSpan, sameNick, sameDest, haveSameType, needSameType;
        var isAction, collapseActions;
        if (nickColumnCount == 0) // No message to collapse to.
        {
            sameNick = sameDest = needSameType = haveSameType = false;
            lastRowSpan = 0;
        }
        else // 1 or more messages, check for doubles
        {
            var lastRow = nickColumns[nickColumnCount - 1].parentNode;
            // What was the span last time?
            lastRowSpan = Number(nickColumns[0].getAttribute("rowspan"));
            // Are we the same user as last time?
            sameNick = (lastRow.getAttribute("msg-user") ==
                        inobj.getAttribute("msg-user"));
            // Do we have the same prefix as last time?
            samePrefix = (lastRow.getAttribute("msg-prefix") ==
                          inobj.getAttribute("msg-prefix"));
            // Do we have the same destination as last time?
            sameDest = (lastRow.getAttribute("msg-dest") ==
                        inobj.getAttribute("msg-dest"));
            // Is this message the same type as the last one?
            haveSameType = (lastRow.getAttribute("msg-type") ==
                            inobj.getAttribute("msg-type"));
            // Is either of the messages an action? We may not want to collapse
            // depending on the collapseActions pref
            isAction = ((inobj.getAttribute("msg-type") == "ACTION") ||
                        (lastRow.getAttribute("msg-type") == "ACTION"));
            // Do we collapse actions?
            collapseActions = source.prefs["collapseActions"];

            // Does the motif collapse everything, regardless of type?
            // NOTE: the collapseActions pref can override this for actions
            needSameType = !(("motifSettings" in source) &&
                             source.motifSettings &&
                             ("collapsemore" in source.motifSettings));
        }

        if (sameNick && samePrefix && sameDest &&
            (haveSameType || !needSameType) &&
            (!isAction || collapseActions))
        {
            obj = inobj;
            if (ci.nested)
                appendTo = source.messages.firstChild.lastChild.firstChild.firstChild.firstChild;

            if (obj.getAttribute("important"))
            {
                nickColumns[nickColumnCount - 1].setAttribute("important",
                                                              true);
            }

            // Remove nickname column from new row.
            obj.removeChild(thisUserCol);

            // Expand previous grouping's nickname cell(s) to fill-in the gap.
            for (var i = 0; i < nickColumns.length; ++i)
                nickColumns[i].setAttribute("rowspan", rowExtents.length + 1);
        }
    }

    if ("frame" in source)
        needScroll = checkScroll(source.frame);
    if (obj)
        appendTo.appendChild(client.adoptNode(obj, appendTo.ownerDocument));

    if (source.MAX_MESSAGES)
    {
        if (typeof source.messageCount != "number")
            source.messageCount = 1;
        else
            source.messageCount++;

        if (source.messageCount > source.MAX_MESSAGES)
            removeExcessMessages(source);
    }

    if (needScroll)
    {
        scrollDown(source.frame, true);
        setTimeout(scrollDown, 500, source.frame, false);
        setTimeout(scrollDown, 1000, source.frame, false);
        setTimeout(scrollDown, 2000, source.frame, false);
    }
}

function removeExcessMessages(source)
{
    var window = getContentWindow(source.frame);
    var rows = source.messages.rows;
    var lastItemOffset = rows[rows.length - 1].offsetTop;
    var tbody = source.messages.firstChild;
    while (source.messageCount > source.MAX_MESSAGES)
    {
        if (tbody.firstChild.className == "msg-nested-tr")
        {
            var table = tbody.firstChild.firstChild.firstChild;
            var toBeRemoved = source.messageCount - source.MAX_MESSAGES;
            // If we can remove the entire table, do that...
            if (table.rows.length <= toBeRemoved)
            {
                tbody.removeChild(tbody.firstChild);
                source.messageCount -= table.rows.length;
                table = null; // Don't hang onto this.
                continue;
            }
            // Otherwise, remove rows from this table instead:
            tbody = table.firstChild;
        }
        var nextLastNode = tbody.firstChild.nextSibling;
        // If the next node has only 2 childNodes,
        // assume we're dealing with collapsed msgs,
        // and move the nickname element:
        if (nextLastNode.childNodes.length == 2)
        {
            var nickElem = tbody.firstChild.childNodes[1];
            var rowspan = nickElem.getAttribute("rowspan") - 1;
            tbody.firstChild.removeChild(nickElem);
            nickElem.setAttribute("rowspan", rowspan);
            nextLastNode.insertBefore(nickElem, nextLastNode.lastChild);
        }
        tbody.removeChild(tbody.firstChild);
        --source.messageCount;
    }
    var oldestItem = rows[0];
    if (oldestItem.className == "msg-nested-tr")
        oldestItem = rows[0].firstChild.firstChild.firstChild.firstChild;
    updateTimestampFor(source, oldestItem, true);

    // Scroll by as much as the lowest item has moved up:
    lastItemOffset -= rows[rows.length - 1].offsetTop;
    var y = window.pageYOffset;
    if (!checkScroll(source.frame) && (y > lastItemOffset))
        window.scrollBy(0, -lastItemOffset);
}

function findPreviousColumnInfo(table)
{
    // All the rows in the grouping (for merged rows).
    var extents = new Array();
    // Get the last row in the table.
    var tr = table.firstChild.lastChild;
    // Bail if there's no rows.
    if (!tr)
        return {extents: [], nickColumns: [], nested: false};
    // Get message type.
    if (tr.className == "msg-nested-tr")
    {
        var rv = findPreviousColumnInfo(tr.firstChild.firstChild);
        rv.nested = true;
        return rv;
    }
    // Now get the read one...
    var className = (tr && tr.childNodes[1]) ? tr.childNodes[1].getAttribute("class") : "";
    // Keep going up rows until you find the first in a group.
    // This will go up until it hits the top of a multiline/merged block.
    while (tr && tr.childNodes[1] && className.search(/msg-user|msg-type/) == -1)
    {
        extents.push(tr);
        tr = tr.previousSibling;
        if (tr && tr.childNodes[1])
            className = tr.childNodes[1].getAttribute("class");
    }

    // If we ran out of rows, or it's not a talking line, we're outta here.
    if (!tr || className != "msg-user")
        return {extents: [], nickColumns: [], nested: false};

    extents.push(tr);

    // Time to collect the nick data...
    var nickCol = tr.firstChild;
    // All the cells that contain nickname info.
    var nickCols = new Array();
    while (nickCol)
    {
        // Just collect nickname column cells.
        if (nickCol.getAttribute("class") == "msg-user")
            nickCols.push(nickCol);
        nickCol = nickCol.nextSibling;
    }

    // And we're done.
    return {extents: extents, nickColumns: nickCols, nested: false};
}

function getLogPath(obj)
{
    // If we're logging, return the currently-used URL.
    if (obj.logFile)
        return getURLSpecFromFile(obj.logFile.path);
    // If not, return the ideal URL.
    return getURLSpecFromFile(obj.prefs["logFileName"]);
}

client.getConnectionCount =
function cli_gccount ()
{
    var count = 0;

    for (var n in client.networks)
    {
        if (client.networks[n].isConnected())
            ++count;
    }

    return count;
}

client.quit =
function cli_quit (reason)
{
    var net, netReason;
    for (var n in client.networks)
    {
        net = client.networks[n];
        if (net.isConnected())
        {
            netReason = (reason ? reason : net.prefs["defaultQuitMsg"]);
            netReason = (netReason ? netReason : client.userAgent);
            net.quit(netReason);
        }
    }
}

client.wantToQuit =
function cli_wantToQuit(reason, deliberate)
{

    var close = true;
    if (client.prefs["warnOnClose"] && !deliberate)
    {
        const buttons = [MSG_QUIT_ANYWAY, MSG_DONT_QUIT];
        var checkState = { value: true };
        var rv = confirmEx(MSG_CONFIRM_QUIT, buttons, 0, MSG_WARN_ON_EXIT,
                           checkState);
        close = (rv == 0);
        client.prefs["warnOnClose"] = checkState.value;
    }

    if (close)
    {
        client.userClose = true;
        display(MSG_CLOSING);
        client.quit(reason);
    }
}

/* gets a tab-complete match for the line of text specified by |line|.
 * wordStart is the position within |line| that starts the word being matched,
 * wordEnd marks the end position.  |cursorPos| marks the position of the caret
 * in the textbox.
 */
client.performTabMatch =
function gettabmatch_usr (line, wordStart, wordEnd, word, cursorPos)
{
    if (wordStart != 0 || line[0] != client.COMMAND_CHAR)
        return null;

    var matches = client.commandManager.listNames(word.substr(1), CMD_CONSOLE);
    if (matches.length == 1 && wordEnd == line.length)
    {
        matches[0] = client.COMMAND_CHAR + matches[0] + " ";
    }
    else
    {
        for (var i in matches)
            matches[i] = client.COMMAND_CHAR + matches[i];
    }

    return matches;
}

client.openLogFile =
function cli_startlog (view)
{
    function getNextLogFileDate()
    {
        var d = new Date();
        d.setMilliseconds(0);
        d.setSeconds(0);
        d.setMinutes(0);
        switch (view.smallestLogInterval)
        {
            case "h":
                return d.setHours(d.getHours() + 1);
            case "d":
                d.setHours(0);
                return d.setDate(d.getDate() + 1);
            case "m":
                d.setHours(0);
                d.setDate(1);
                return d.setMonth(d.getMonth() + 1);
            case "y":
                d.setHours(0);
                d.setDate(1);
                d.setMonth(0);
                return d.setFullYear(d.getFullYear() + 1);
        }
        //XXXhack: This should work...
        return Infinity;
    };

    const NORMAL_FILE_TYPE = Components.interfaces.nsIFile.NORMAL_FILE_TYPE;

    try
    {
        var file = new LocalFile(view.prefs["logFileName"]);
        if (!file.localFile.exists())
        {
            // futils.umask may be 0022. Result is 0644.
            file.localFile.create(NORMAL_FILE_TYPE, 0666 & ~futils.umask);
        }
        view.logFile = fopen(file.localFile, ">>");
        // If we're here, it's safe to say when we should re-open:
        view.nextLogFileDate = getNextLogFileDate();
    }
    catch (ex)
    {
        view.prefs["log"] = false;
        dd("Log file open error: " + formatException(ex));
        view.displayHere(getMsg(MSG_LOGFILE_ERROR, getLogPath(view)), MT_ERROR);
        return;
    }

    if (!("logFileWrapping" in view) || !view.logFileWrapping)
        view.displayHere(getMsg(MSG_LOGFILE_OPENED, getLogPath(view)));
    view.logFileWrapping = false;
}

client.closeLogFile =
function cli_stoplog(view, wrapping)
{
    if ("frame" in view && !wrapping)
        view.displayHere(getMsg(MSG_LOGFILE_CLOSING, getLogPath(view)));

    view.logFileWrapping = Boolean(wrapping);

    if (view.logFile)
    {
        view.logFile.close();
        view.logFile = null;
    }
}

function checkLogFiles()
{
    // For every view that has a logfile, check if we need a different file
    // based on the current date and the logfile preference. We close the
    // current logfile, and display will open the new one based on the pref
    // when it's needed.

    var d = new Date();
    for (var n in client.networks)
    {
        var net = client.networks[n];
        if (net.logFile && (d > net.nextLogFileDate))
            client.closeLogFile(net, true);
        if (("primServ" in net) && net.primServ && ("channels" in net.primServ))
        {
            for (var c in net.primServ.channels)
            {
                var chan = net.primServ.channels[c];
                if (chan.logFile && (d > chan.nextLogFileDate))
                    client.closeLogFile(chan, true);
            }
        }
        if ("users" in net)
        {
            for (var u in net.users)
            {
                var user = net.users[u];
                if (user.logFile && (d > user.nextLogFileDate))
                    client.closeLogFile(user, true);
            }
        }
    }

    for (var dc in client.dcc.chats)
    {
        var dccChat = client.dcc.chats[dc];
        if (dccChat.logFile && (d > dccChat.nextLogFileDate))
            client.closeLogFile(dccChat, true);
    }
    for (var df in client.dcc.files)
    {
        var dccFile = client.dcc.files[df];
        if (dccFile.logFile && (d > dccFile.nextLogFileDate))
            client.closeLogFile(dccFile, true);
    }

    // Don't forget about the client tab:
    if (client.logFile && (d > client.nextLogFileDate))
        client.closeLogFile(client, true);

    /* We need to calculate the correct time for the next check. This is
     * attempting to hit 2 seconds past the hour. We need the timezone offset
     * here for when it is not a whole number of hours from UTC.
     */
    var shiftedDate = d.getTime() + d.getTimezoneOffset() * 60000;
    setTimeout("checkLogFiles()", 3602000 - (shiftedDate % 3600000));
}

CIRCChannel.prototype.getLCFunction =
CIRCNetwork.prototype.getLCFunction =
CIRCUser.prototype.getLCFunction    =
CIRCDCCChat.prototype.getLCFunction =
CIRCDCCFileTransfer.prototype.getLCFunction =
function getlcfn()
{
    var details = getObjectDetails(this);
    var lcFn;

    if (details.server)
    {
        lcFn = function(text)
            {
                return details.server.toLowerCase(text);
            }
    }

    return lcFn;
}

CIRCChannel.prototype.performTabMatch =
CIRCNetwork.prototype.performTabMatch =
CIRCUser.prototype.performTabMatch    =
CIRCDCCChat.prototype.performTabMatch =
CIRCDCCFileTransfer.prototype.performTabMatch =
function gettabmatch_other (line, wordStart, wordEnd, word, cursorpos, lcFn)
{
    if (wordStart == 0 && line[0] == client.COMMAND_CHAR)
    {
        return client.performTabMatch(line, wordStart, wordEnd, word,
                                      cursorpos);
    }

    var matchList = new Array();
    var users;
    var channels;
    var userIndex = -1;

    var details = getObjectDetails(this);

    if (details.channel && word == details.channel.unicodeName[0])
    {
        /* When we have #<tab>, we just want the current channel,
           if possible. */
        matchList.push(details.channel.unicodeName);
    }
    else
    {
        /* Ok, not #<tab> or no current channel, so get the full list. */

        if (details.channel)
            users = details.channel.users;

        if (details.server)
        {
            channels = details.server.channels;
            for (var c in channels)
                matchList.push(channels[c].unicodeName);
            if (!users)
                users = details.server.users;
        }

        if (users)
        {
            userIndex = matchList.length;
            for (var n in users)
                matchList.push(users[n].unicodeName);
        }
    }

    var matches = matchEntry(word, matchList, lcFn);

    var list = new Array();
    for (var i = 0; i < matches.length; i++)
        list.push(matchList[matches[i]]);

    if (list.length == 1)
    {
        if (users && (userIndex >= 0) && (matches[0] >= userIndex))
        {
            if (wordStart == 0)
                list[0] += client.prefs["nickCompleteStr"];
        }

        if (wordEnd == line.length)
        {
            /* add a space if the word is at the end of the line. */
            list[0] += " ";
        }
    }

    return list;
}
