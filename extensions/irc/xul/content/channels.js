/* ***** BEGIN LICENSE BLOCK *****
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
 * The Initial Developer of the Original Code is James Ross.
 * Portions created by the Initial Developer are Copyright (C) 2004
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   James Ross, <silver@warwickcompsoc.co.uk>
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

var client;
var network;
var channels = new Array();
var createChannelItem;
var serverChannelPrefixes;

var channelTreeShare = new Object();
var channelTreeView, channelTreeBoxObject, channelLoadLabel, channelLoadBar,
    channelLoadBarDesk, channelFilterText, channelSearchTopics, channelMinUsers,
    channelMaxUsers, channelJoinBtn, channelRefreshBtn;


// Create list of operations. These are handled by common code.
const OPS = new Array();
OPS.push({ key: "noop",   ignore: true   });
OPS.push({ key: "list",   canStop: false });
OPS.push({ key: "load",   canStop: true  });
OPS.push({ key: "filter", canStop: true  });


// Define constants for each operation.
// JavaScript won't let you delete things declared with "var", workaround:
// NOTE: This order MUST be the same as those above!
window.s = 0;
const OP_LIST   = ++s;  // A /list operation on the server.
const OP_LOAD   = ++s;  // Loading the saved file.
const OP_FILTER = ++s;  // Filtering the loaded list.


// Define constants for the valid states of each operation.
// All states before STATE_START must be idle (stopped) states.
// All states from STATE_START onwards must be busy (running) states.
s = 0;
const STATE_IDLE  = ++s;  // Not doing this operation.
const STATE_ERROR = ++s;  // Error occurred: don't try do to any more.
const STATE_START = ++s;  // Starting an operation.
const STATE_RUN   = ++s;  // Running...
const STATE_STOP  = ++s;  // Clean-up/ending operation.
delete window.s;


// Store all the operation data here.
var data = {
    list:   { state: STATE_IDLE },
    load:   { state: STATE_IDLE },
    filter: { state: STATE_IDLE }
};


// This should keep things responsive enough, for the user to click buttons and
// edit the filter text and options, without giving up too much time to letting
// Gecko catch up.
const PROCESS_TIME_MAX = 200;
const PROCESS_DELAY    =  50;

const colIDToSortKey = { chanColName: "name",
                         chanColUsers: "users",
                         chanColTopic: "topic" };
const sortKeyToColID = { name: "chanColName",
                         users: "chanColUsers",
                         topic: "chanColTopic" };

function onLoad()
{
    function ondblclick(event) { channelTreeView.onRouteDblClick(event); };
    function onkeypress(event) { channelTreeView.onRouteKeyPress(event); };
    function onfocus(event)    { channelTreeView.onRouteFocus(event); };
    function onblur(event)     { channelTreeView.onRouteBlur(event); };

    function doJoin()
    {
        if (joinChannel())
            window.close();
    };

    client = window.arguments[0].client;
    network = window.arguments[0].network;
    network.joinDialog = window;

    client.ceip.logEvent({type: "dialog", dialog: "channels", event: "open"});

    serverChannelPrefixes = network.primServ.channelTypes;

    window.dd = client.mainWindow.dd;
    window.ASSERT = client.mainWindow.ASSERT;
    window.toUnicode = client.mainWindow.toUnicode;
    window.getMsg = client.mainWindow.getMsg;
    window.MSG_CHANNEL_OPENED = client.mainWindow.MSG_CHANNEL_OPENED;
    window.MSG_FMT_JSEXCEPTION = client.mainWindow.MSG_FMT_JSEXCEPTION;
    window.MT_INFO = client.mainWindow.MT_INFO;

    // Import "MSG_CD_*"...
    for (var m in client.mainWindow)
    {
        if (m.substr(0, 7) == "MSG_CD_")
            window[m] = client.mainWindow[m];
    }

    // Set the <dialog>'s class so we can do platform-specific CSS.
    var dialog = document.getElementById("chatzilla-window");
    dialog.className = "platform-" + client.platform;

    var tree = document.getElementById("channelList");
    channelTreeBoxObject = tree.treeBoxObject;

    channelTreeView = new XULTreeView(channelTreeShare);
    channelTreeView.onRowCommand = doJoin;
    channelTreeView.cycleHeader = changeSort;
    channelTreeBoxObject.view = channelTreeView;

    channelLoadLabel = document.getElementById("loadLabel");
    channelLoadBar = document.getElementById("loadBar");
    channelLoadBarDesk = document.getElementById("loadBarDeck");
    channelFilterText = document.getElementById("filterText");
    channelSearchTopics = document.getElementById("searchTopics");
    channelMinUsers = document.getElementById("minUsers");
    channelMaxUsers = document.getElementById("maxUsers");
    channelJoinBtn = document.getElementById("joinBtn");
    channelRefreshBtn = document.getElementById("refreshNow");

    // If the new "search" binding is not working (i.e. doesn't exist)...
    if (!("searchButton" in channelFilterText))
    {
        // ...restore the text boxes to their former selves.
        channelFilterText.setAttribute("timeout", "500");
        channelFilterText.setAttribute("type", "timed");
        channelMinUsers.setAttribute("timeout", "500");
        channelMinUsers.setAttribute("type", "timed");
        channelMaxUsers.setAttribute("timeout", "500");
        channelMaxUsers.setAttribute("type", "timed");
    }

    // Sort by user count, decending.
    changeSort("chanColUsers");

    tree.addEventListener("dblclick", ondblclick, false);
    tree.addEventListener("keypress", onkeypress, false);
    tree.addEventListener("focus", onfocus, false);
    tree.addEventListener("blur", onblur, false);

    createChannelItem = new ChannelEntry("", "", MSG_CD_CREATE);
    createChannelItem.first = true;
    channelTreeView.childData.appendChild(createChannelItem);

    document.title = getMsg(MSG_CD_TITLE, [network.unicodeName,
                                           network.getURL()]);

    var opener = window.arguments[0].opener;
    if (opener)
    {
        // Force the window to be the right size now, not later.
        window.sizeToContent();

        // Position it centered over, but never up or left of parent.
        var sx = Math.max((opener.outerWidth  - window.outerWidth ) / 2, 0);
        var sy = Math.max((opener.outerHeight - window.outerHeight) / 2, 0);
        window.moveTo(opener.screenX + sx, opener.screenY + sy);
    }

    setTimeout(updateOperations, PROCESS_DELAY);
    startOperation(OP_LOAD);
}

function onUnload()
{
    client.ceip.logEvent({type: "dialog", dialog: "channels", event: "close"});
    delete network.joinDialog;
}

function onKeyPress(event)
{
    if (event.keyCode == event.DOM_VK_RETURN)
    {
        startOperation(OP_FILTER);
        if (joinChannel())
            window.close();
        event.stopPropagation();
        event.preventDefault();
    }
    else if (event.keyCode == event.DOM_VK_UP)
    {
        if (channelTreeView.selectedIndex > 0)
        {
            channelTreeView.selectedIndex = channelTreeView.selectedIndex - 1;
            ensureRowIsVisible();
        }
        event.preventDefault();
    }
    else if (event.keyCode == event.DOM_VK_DOWN)
    {
        if (channelTreeView.selectedIndex < channelTreeView.rowCount - 1)
        {
            channelTreeView.selectedIndex = channelTreeView.selectedIndex + 1;
            ensureRowIsVisible();
        }
        event.preventDefault();
    }
}

function onSelectionChange()
{
    var index = channelTreeView.selectedIndex;
    if (index == -1)
    {
        channelJoinBtn.disabled = true;
        return;
    }
    var row = channelTreeView.childData.locateChildByVisualRow(index);
    channelJoinBtn.disabled = ((index == 0) && !row.name);
}

function onFilter()
{
    startOperation(OP_FILTER);
}

function joinChannel()
{
    var index = channelTreeView.selectedIndex;
    if (index == -1)
        return false;
    var row = channelTreeView.childData.locateChildByVisualRow(index);
    if ((index == 0) && !row.name)
        return false;

    /* Calculate the row index AS IF the 'create' row is visible. We're going
     * to use this so that the index chosen by the user is always consistent,
     * whatever the visibility of the 'create' row - an index of 0 is ALWAYS
     * the 'create' row, and >= 1 is ALWAYS the searched rows.
     */
    var realIndex = index + (createChannelItem.isHidden ? 1 : 0);
    client.ceip.logEvent({type: "dialog", dialog: "channels", event: "join",
                          index: realIndex});

    network.dispatch("join", { channelName: row.name });

    return true;
}

function focusSearch()
{
    channelFilterText.focus();
}

function refreshList()
{
    startOperation(OP_LIST);
}

function updateProgress(label, pro)
{
    if (label)
    {
        channelLoadLabel.value = label;
    }
    else
    {
        var msg = getMsg(MSG_CD_SHOWING,
             [(channelTreeView.rowCount - (createChannelItem.isHidden ? 0 : 1)),
              channels.length]);
        channelLoadLabel.value = msg;
    }

    var loadBarDeckIndex = ((typeof pro == "undefined") ? 1 : 0);
    channelLoadBarDesk.selectedIndex = loadBarDeckIndex;

    if ((typeof pro == "undefined") || (pro == -1))
    {
        channelLoadBar.mode = "undetermined";
    }
    else
    {
        channelLoadBar.mode = "determined";
        channelLoadBar.value = pro;
    }
}

function changeSort(col)
{
    if (typeof col == "object")
        col = col.id;

    col = colIDToSortKey[col];
    // Users default to decending, others accending.
    var dir = (col == "users" ? -1 : 1);

    if (col == channelTreeShare.sortColumn)
        dir = -channelTreeShare.sortDirection;

    var colID = sortKeyToColID[channelTreeShare.sortColumn];
    var colNode = document.getElementById(colID);
    if (colNode)
    {
        colNode.removeAttribute("sortActive");
        colNode.removeAttribute("sortDirection");
    }

    channelTreeView.childData.setSortColumn(col, dir);

    colID = sortKeyToColID[channelTreeShare.sortColumn];
    colNode = document.getElementById(colID);
    if (colNode)
    {
        colNode.setAttribute("sortActive", "true");
        var sortDir = (dir > 0 ? "ascending" : "descending");
        colNode.setAttribute("sortDirection", sortDir);
    }
}


// ***** BEGIN OPERATIONS CODE *****


/* Return the static data about an operation (e.g. whether it can be
 * stopped, etc.). The data returned is always the same for a given op code.
 */
function getOperation(op)
{
    ASSERT(op in OPS, "Invalid op-code: " + op);
    return OPS[op];
}

/* Returns the live data about an operation (e.g. current state). Accepts
 * either the op ID or the static data (as returned from getOperation(op)).
 */
function getOperationData(op)
{
    if (typeof op == "object")
        return data[op.key];
    return data[getOperation(op).key];
}

// Returns the current state of an operation; accepts same as getOperationData.
function getOperationState(op)
{
    return getOperationData(op).state;
}

function startOperation(op)
{
    var ops = getOperation(op);
    if (ops.ignore)
        return;

    var dbg = "startOperation(" + ops.key + ")";
    var opData = getOperationData(ops);

    // STATE_ERROR operations must not do anything. Assert and bail.
    if (!ASSERT(opData.state != STATE_ERROR, dbg + " in STATE_ERROR"))
        return;

    // Check we can stop a non-idle operation.
    if (!ASSERT((opData.state == STATE_IDLE) || ops.canStop,
           dbg + " not in STATE_IDLE and can't stop"))
    {
        return;
    }

    // Stop the current operation.
    if (opData.state != STATE_IDLE)
        stopOperation(op);

    // Begin!
    var opData = getOperationData(op);
    opData.state = STATE_START;
    processOperation(op);
    ASSERT(opData.state == STATE_RUN, dbg + " didn't enter STATE_RUN");
}

function updateOperations()
{
    for (var i = 1; i < OPS.length; i++)
    {
        var state = getOperationState(i);
        if ((state == STATE_RUN) || (state == STATE_STOP))
            processOperation(i);
    }

    setTimeout(updateOperations, PROCESS_DELAY);
}

function processOperation(op)
{
    var ops = getOperation(op);
    if (ops.ignore)
        return;

    var dbg = "processOperation(" + ops.key + ")";
    var opData = getOperationData(ops);

    var fn = "processOp";
    fn += ops.key[0].toUpperCase() + ops.key.substr(1);
    if (opData.state == STATE_START)
        fn += "Start";
    else if (opData.state == STATE_RUN)
        fn += "Run";
    else if (opData.state == STATE_STOP)
        fn += "Stop";
    // assert and return if we're in a different state:
    else if (!ASSERT(false, dbg + " invalid state: " + opData.state))
        return;

    try
    {
        var newState = window[fn](opData);
        if (typeof newState != "undefined")
            opData.state = newState;
    }
    catch(ex)
    {
        /* If an error has occured, we display it (updateProgress) and then
         * halt our opperations to prevent further damage.
         */
        dd("Exception in channels.js: " + dbg + ": " + fn + ": " + formatException(ex));
        updateProgress(formatException(ex));
        opData.state = STATE_ERROR;
    }
}

function stopOperation(op)
{
    var ops = getOperation(op);
    if (ops.ignore)
        return;

    var dbg = "stopOperation(" + ops.key + ")";
    var opData = getOperationData(ops);

    // STATE_ERROR operations must not do anything. Assert and bail.
    if (!ASSERT(opData.state != STATE_ERROR, dbg + " in STATE_ERROR"))
        return;

    // Nothing to do for STATE_IDLE. We shouldn't really be here, so assert.
    if (!ASSERT(opData.state != STATE_IDLE, dbg + " in STATE_IDLE"))
        return;

    // Force the end and process synchronously.
    opData.state = STATE_STOP;
    processOperation(op);
    ASSERT(opData.state == STATE_IDLE, dbg + " didn't enter STATE_IDLE");
}

// *****  END OPERATIONS CODE  *****


// ***** BEGIN OPERATION HANDLERS *****

function processOpListStart(opData)
{
    // Doing the list should disable the refresh button.
    channelRefreshBtn.disabled = true;

    // Show a general message until we get some data.
    updateProgress(MSG_CD_FETCHING, -1);

    // Get the file we're going to save to, and start the /list.
    var file = getListFile();
    network.list("", file.path);

    return STATE_RUN;
}

function processOpListRun(opData)
{
    // Update the progress and end if /list done for "list only" state.
    updateProgress(getMsg(MSG_CD_FETCHED, network._list.count), -1);

    // Stop if the network's /list has finished.
    return (network._list.done ? STATE_STOP : STATE_RUN);
}

function processOpListStop(opData)
{
    // Reset refresh button.
    channelRefreshBtn.disabled = false;

    // Check that /list finished ok if we're just doing a list.
    if ("error" in network._list)
    {
        updateProgress(MSG_CD_ERROR_LIST);
    }
    else
    {
        updateProgress();
        if (getOperationState(OP_LOAD) == STATE_IDLE)
            startOperation(OP_LOAD);
    }

    return STATE_IDLE;
}

function processOpLoadStart(opData)
{
    var file = getListFile();
    if (!file.exists())
    {
        // We tried to do a load, but the file does not exist. Start a list to
        // fill up the file.
        startOperation(OP_LIST);

        // File still doesn't exist, just give up.
        if (!file.exists())
            return STATE_IDLE;
    }

    // Nuke contents.
    channelTreeView.selectedIndex = -1;
    channelTreeView.freeze();
    while (channelTreeView.childData.childData.length > 1)
        channelTreeView.childData.removeChildAtIndex(1);
    channelTreeView.thaw();

    // Nuke more stuff.
    channels = new Array();

    // And... here we go.
    opData.loadFile = new LocalFile(file, "<");
    opData.loadPendingData = "";
    opData.loadChunk = 10000;
    opData.loadedSoFar = 0;

    return STATE_RUN;
}

function processOpLoadRun(opData)
{
    // All states before STATE_START are "not running" states.
    var opListRunning = (getOperationState(OP_LIST) >= STATE_START);

    var end = Number(new Date()) + PROCESS_TIME_MAX;
    while (Number(new Date()) < end)
    {
        var nlIndex = opData.loadPendingData.indexOf("\n");
        if (nlIndex == -1)
        {
            opData.loadedSoFar += opData.loadChunk;
            var newChunk = opData.loadFile.read(opData.loadChunk);
            if (newChunk)
                opData.loadPendingData += newChunk;
            nlIndex = opData.loadPendingData.indexOf("\n");
            if (nlIndex == -1)
                break;
        }

        var line = opData.loadPendingData.substr(0, nlIndex);
        opData.loadPendingData = opData.loadPendingData.substr(nlIndex + 1);

        line = toUnicode(line, "UTF-8");
        var ary = line.match(/^([^ ]+) ([^ ]+) (.*)$/);
        if (ary && (ary[1] != "*"))
        {
            var chan = new ChannelEntry(ary[1], ary[2], ary[3]);
            channels.push(chan);
        }
    }

    var dataLeft = opData.loadFile.inputStream.available();

    // We shouldn't update the display when listing as well, as we're not
    // going to show anything useful (always 100% or near to it, and
    // replaces the 'fetching' message).
    if (!opListRunning)
    {
        var pro = opData.loadedSoFar / (opData.loadedSoFar + dataLeft);
        pro = Math.round(100 * pro);
        updateProgress(getMsg(MSG_CD_LOADED, channels.length), pro);
    }

    // Done if there is no more data, and we're not *expecting* any more.
    if ((dataLeft == 0) && !opListRunning)
        return STATE_STOP;

    return STATE_RUN;
}

function processOpLoadStop(opData)
{
    if (channels.length > 0)
        channelTreeView.childData.appendChildren(channels);
    opData.loadFile.close();
    delete opData.loadFile;
    delete opData.loadPendingData;
    delete opData.loadChunk;
    delete opData.loadedSoFar;
    delete opData.loadNeverComplete;
    updateProgress();

    startOperation(OP_FILTER);

    return STATE_IDLE;
}

function processOpFilterStart(opData)
{
    // Catch filtering with the same options on the same channels:
    var newOptions = {text: channelFilterText.value.toLowerCase(),
                      min: channelMinUsers.value * 1,
                      max: channelMaxUsers.value * 1,
                      listLen: channels.length,
                      searchTopics: channelSearchTopics.checked};

    if (("filterOptions" in window) &&
        equalsObject(window.filterOptions, newOptions))
    {
        return STATE_IDLE;
    }

    window.filterOptions = newOptions;

    opData.text = newOptions.text;
    opData.searchTopics = newOptions.searchTopics;
    opData.minUsers = newOptions.min;
    opData.maxUsers = newOptions.max;
    opData.exactMatch = null;
    opData.currentIndex = 0;
    opData.channelText = opData.text;

    // Log the filter, indicating which features the user is using.
    var filters = new Array();
    if (opData.channelText)
        filters.push("name");
    if (opData.searchTopics)
        filters.push("topics");
    if (opData.minUsers)
        filters.push("min-users");
    if (opData.maxUsers)
        filters.push("max-users");

    if (opData.channelText &&
        (arrayIndexOf(["#", "&", "+", "!"], opData.channelText[0]) == -1) &&
        (arrayIndexOf(serverChannelPrefixes, opData.channelText[0]) == -1))
    {
        opData.channelText = serverChannelPrefixes[0] + opData.channelText;
    }
    else
    {
        // Log that user has specified an explicit prefix.
        filters.push("prefix");
    }

    client.ceip.logEvent({type: "dialog", dialog: "channels", event: "filter",
                          filters: filters.join(",")});

    // Update special "create channel" row, and select it.
    createChannelItem.name = opData.channelText;
    if (createChannelItem.isHidden)
        createChannelItem.unHide();

    // Scroll to the top and select the "create channel" row.
    channelTreeView.selectedIndex = 0;
    channelTreeBoxObject.invalidateRow(0);
    channelTreeBoxObject.scrollToRow(0);
    ensureRowIsVisible();

    updateProgress(getMsg(MSG_CD_FILTERING, [0, channels.length]), 0);

    return STATE_RUN;
}

function processOpFilterRun(opData)
{
    var end = Number(new Date()) + PROCESS_TIME_MAX;
    var more = false;

    // Save selection because freeze/thaw screws it up.
    // Note that we only save the item if it isn't the "create channel" row.
    var index = channelTreeView.selectedIndex;
    var item = null;
    if (index > 0)
        item = channelTreeView.childData.locateChildByVisualRow(index);

    channelTreeView.freeze();
    for (var i = opData.currentIndex; i < channels.length; i++)
    {
        var c = channels[i];

        var match = (c.nameLC.indexOf(opData.text) != -1) ||
                    (opData.searchTopics &&
                     (c.topicLC.indexOf(opData.text) != -1));

        if (opData.minUsers && (c.users < opData.minUsers))
            match = false;
        if (opData.maxUsers && (c.users > opData.maxUsers))
            match = false;

        if (c.isHidden && match)
            c.unHide();
        if (!c.isHidden && !match)
            c.hide();

        if (match && (c.nameLC == opData.channelText))
            opData.exactMatch = c;

        opData.currentIndex = i;
        if ((new Date()) > end)
        {
            more = true;
            break;
        }
    }
    channelTreeView.thaw();

    // No item selected by user, so use our exact match instead.
    if (!item && opData.exactMatch)
        item = opData.exactMatch;

    // Restore selected item.
    if (item)
        channelTreeView.selectedIndex = item.calculateVisualRow();
    else
        channelTreeView.selectedIndex = 0;

    ensureRowIsVisible();

    updateProgress(getMsg(MSG_CD_FILTERING,
                          [opData.currentIndex, channels.length]),
                   100 * opData.currentIndex / channels.length);

    return (more ? STATE_RUN : STATE_STOP);
}

function processOpFilterStop(opData)
{
    if (opData.exactMatch)
    {
        if (!createChannelItem.isHidden)
            createChannelItem.hide();
    }
    // If nothing is selected, select the "create channel" row.
    else if (channelTreeView.selectedIndex < 0)
    {
        channelTreeView.selectedIndex = 0;
    }

    ensureRowIsVisible();

    delete opData.text;
    delete opData.searchTopics;
    delete opData.minUsers;
    delete opData.maxUsers;
    delete opData.exactMatch;
    delete opData.currentIndex;
    delete opData.channelText;
    updateProgress();

    return STATE_IDLE;
}


// *****  END OPERATION HANDLERS  *****


function ensureRowIsVisible()
{
    if (channelTreeView.selectedIndex >= 0)
        channelTreeBoxObject.ensureRowIsVisible(channelTreeView.selectedIndex);
    else
        channelTreeBoxObject.ensureRowIsVisible(0);
}

function getListFile(temp)
{
    var file = new LocalFile(network.prefs["logFileName"]);
    if (temp)
        file.localFile.leafName = "list.temp";
    else
        file.localFile.leafName = "list.txt";
    return file.localFile;
}


// Tree ChannelEntry objects //
function ChannelEntry(name, users, topic)
{
    this.setColumnPropertyName("chanColName", "name");
    this.setColumnPropertyName("chanColUsers", "users");
    this.setColumnPropertyName("chanColTopic", "topic");

    // Nuke color codes and bold etc.
    topic = topic.replace(/[\x1F\x02\x0F\x16]/g, "");
    topic = topic.replace(/\x03\d{1,2}(?:,\d{1,2})?/g, "");

    this.name  = name;
    this.users = users;
    this.topic = topic;

    this.nameLC = this.name.toLowerCase();
    this.topicLC = this.topic.toLowerCase();
}

ChannelEntry.prototype = new XULTreeViewRecord(channelTreeShare);

ChannelEntry.prototype.sortCompare =
function chanentry_sortcmp(a, b)
{
    var sc = a._share.sortColumn;
    var sd = a._share.sortDirection;

    // Make sure the special 'first' row is always first.
    if ("first" in a)
        return -1;
    if ("first" in b)
        return 1;

    if (sc == "users")
    {
        // Force a numeric comparison.
        a = 1 * a[sc];
        b = 1 * b[sc];
    }
    else
    {
        // Case-insensitive, please.
        a = a[sc].toLowerCase();
        b = b[sc].toLowerCase();
    }

    if (a < b)
        return -1 * sd;

    if (a > b)
        return 1 * sd;

    return 0;
}
