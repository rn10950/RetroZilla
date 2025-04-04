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
 *   Chiaki Koufugata, chiaki@mozilla.gr.jp, UI i18n
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

const CMD_CONSOLE    = 0x01;
const CMD_NEED_NET   = 0x02;
const CMD_NEED_SRV   = 0x04;
const CMD_NEED_CHAN  = 0x08;
const CMD_NEED_USER  = 0x10;
const CMD_NO_HELP    = 0x20;

function initCommands()
{
    var cmdary =
        [/* "real" commands */
         ["about",             cmdAbout,                           CMD_CONSOLE],
         ["alias",             cmdAlias,                           CMD_CONSOLE],
         ["attach",            cmdAttach,                          CMD_CONSOLE],
         ["away",              cmdAway,                            CMD_CONSOLE],
         ["back",              cmdAway,                            CMD_CONSOLE],
         ["ban",               cmdBanOrExcept,     CMD_NEED_CHAN | CMD_CONSOLE],
         ["cancel",            cmdCancel,                          CMD_CONSOLE],
         ["charset",           cmdCharset,                         CMD_CONSOLE],
         ["channel-motif",     cmdMotif,           CMD_NEED_CHAN | CMD_CONSOLE],
         ["channel-pref",      cmdPref,            CMD_NEED_CHAN | CMD_CONSOLE],
         ["cmd-undo",          "cmd-docommand cmd_undo",                     0],
         ["cmd-redo",          "cmd-docommand cmd_redo",                     0],
         ["cmd-cut",           "cmd-docommand cmd_cut",                      0],
         ["cmd-copy",          "cmd-docommand cmd_copy",                     0],
         ["cmd-paste",         "cmd-docommand cmd_paste",                    0],
         ["cmd-delete",        "cmd-docommand cmd_delete",                   0],
         ["cmd-selectall",     "cmd-docommand cmd_selectAll",                0],
         ["cmd-copy-link-url", "cmd-docommand cmd_copyLink",                 0],
         ["cmd-mozilla-prefs",   "cmd-docommand cmd_mozillaPrefs",           0],
         ["cmd-prefs",           "cmd-docommand cmd_chatzillaPrefs",         0],
         ["cmd-chatzilla-prefs", "cmd-docommand cmd_chatzillaPrefs",         0],
         ["cmd-chatzilla-opts",  "cmd-docommand cmd_chatzillaPrefs",         0],
         ["cmd-docommand",     cmdDoCommand,                                 0],
         ["create-tab-for-view", cmdCreateTabForView,                        0],
         ["custom-away",       cmdAway,                                      0],
         ["op",                cmdChanUserMode,    CMD_NEED_CHAN | CMD_CONSOLE],
         ["dcc-accept",        cmdDCCAccept,                       CMD_CONSOLE],
         ["dcc-accept-list",  cmdDCCAutoAcceptList, CMD_NEED_NET | CMD_CONSOLE],
         ["dcc-accept-list-add", cmdDCCAutoAcceptAdd,
                                                    CMD_NEED_NET | CMD_CONSOLE],
         ["dcc-accept-list-remove", cmdDCCAutoAcceptDel,
                                                    CMD_NEED_NET | CMD_CONSOLE],
         ["dcc-chat",          cmdDCCChat,          CMD_NEED_SRV | CMD_CONSOLE],
         ["dcc-close",         cmdDCCClose,                        CMD_CONSOLE],
         ["dcc-decline",       cmdDCCDecline,                      CMD_CONSOLE],
         ["dcc-list",          cmdDCCList,                         CMD_CONSOLE],
         ["dcc-send",          cmdDCCSend,          CMD_NEED_SRV | CMD_CONSOLE],
         ["dcc-show-file",     cmdDCCShowFile,                     CMD_CONSOLE],
         ["delayed",           cmdDelayed,                         CMD_CONSOLE],
         ["deop",              cmdChanUserMode,    CMD_NEED_CHAN | CMD_CONSOLE],
         ["describe",          cmdDescribe,         CMD_NEED_SRV | CMD_CONSOLE],
         ["hop",               cmdChanUserMode,    CMD_NEED_CHAN | CMD_CONSOLE],
         ["dehop",             cmdChanUserMode,    CMD_NEED_CHAN | CMD_CONSOLE],
         ["voice",             cmdChanUserMode,    CMD_NEED_CHAN | CMD_CONSOLE],
         ["devoice",           cmdChanUserMode,    CMD_NEED_CHAN | CMD_CONSOLE],
         ["ceip",              cmdCEIP,                            CMD_CONSOLE],
         ["clear-view",        cmdClearView,                       CMD_CONSOLE],
         ["client",            cmdClient,                          CMD_CONSOLE],
         ["commands",          cmdCommands,                        CMD_CONSOLE],
         ["ctcp",              cmdCTCP,             CMD_NEED_SRV | CMD_CONSOLE],
         ["default-charset",   cmdCharset,                         CMD_CONSOLE],
         ["delete-view",       cmdDeleteView,                      CMD_CONSOLE],
         ["desc",              cmdDesc,                            CMD_CONSOLE],
         ["disable-plugin",    cmdAblePlugin,                      CMD_CONSOLE],
         ["disconnect",        cmdDisconnect,       CMD_NEED_SRV | CMD_CONSOLE],
         ["disconnect-all",    cmdDisconnectAll,                   CMD_CONSOLE],
         ["echo",              cmdEcho,                            CMD_CONSOLE],
         ["enable-plugin",     cmdAblePlugin,                      CMD_CONSOLE],
         ["eval",              cmdEval,                            CMD_CONSOLE],
         ["evalsilent",        cmdEval,                            CMD_CONSOLE],
         ["except",            cmdBanOrExcept,     CMD_NEED_CHAN | CMD_CONSOLE],
         ["find",              cmdFind,                                      0],
         ["find-again",        cmdFindAgain,                                 0],
         ["focus-input",       cmdFocusInput,                                0],
         ["font-family",       cmdFont,                            CMD_CONSOLE],
         ["font-family-other", cmdFont,                                      0],
         ["font-size",         cmdFont,                            CMD_CONSOLE],
         ["font-size-other",   cmdFont,                                      0],
         ["goto-startup",      cmdGotoStartup,                     CMD_CONSOLE],
         ["goto-url",          cmdGotoURL,                                   0],
         ["goto-url-newwin",   cmdGotoURL,                                   0],
         ["goto-url-newtab",   cmdGotoURL,                                   0],
         ["goto-url-external", cmdGotoURL,                                   0],
         ["help",              cmdHelp,                            CMD_CONSOLE],
         ["hide-view",         cmdHideView,                        CMD_CONSOLE],
         ["idle-away",         cmdAway,                                      0],
         ["idle-back",         cmdAway,                                      0],
         ["ignore",            cmdIgnore,           CMD_NEED_NET | CMD_CONSOLE],
         ["input-text-direction", cmdInputTextDirection,                     0],
         ["install-plugin",    cmdInstallPlugin,                   CMD_CONSOLE],
         ["invite",            cmdInvite,           CMD_NEED_SRV | CMD_CONSOLE],
         ["join",              cmdJoin,             CMD_NEED_SRV | CMD_CONSOLE],
         ["join-charset",      cmdJoin,             CMD_NEED_SRV | CMD_CONSOLE],
         ["jump-to-anchor",    cmdJumpToAnchor,                   CMD_NEED_NET],
         ["kick",              cmdKick,            CMD_NEED_CHAN | CMD_CONSOLE],
         ["kick-ban",          cmdKick,            CMD_NEED_CHAN | CMD_CONSOLE],
         ["knock",             cmdKnock,            CMD_NEED_SRV | CMD_CONSOLE],
         ["leave",             cmdLeave,           CMD_NEED_CHAN | CMD_CONSOLE],
         ["links",             cmdSimpleCommand,    CMD_NEED_SRV | CMD_CONSOLE],
         ["list",              cmdList,             CMD_NEED_SRV | CMD_CONSOLE],
         ["list-plugins",      cmdListPlugins,                     CMD_CONSOLE],
         ["load",              cmdLoad,                            CMD_CONSOLE],
         ["log",               cmdLog,                             CMD_CONSOLE],
         ["map",               cmdSimpleCommand,    CMD_NEED_SRV | CMD_CONSOLE],
         ["match-users",       cmdMatchUsers,      CMD_NEED_CHAN | CMD_CONSOLE],
         ["me",                cmdMe,                              CMD_CONSOLE],
         ["motd",              cmdSimpleCommand,    CMD_NEED_SRV | CMD_CONSOLE],
         ["mode",              cmdMode,             CMD_NEED_SRV | CMD_CONSOLE],
         ["motif",             cmdMotif,                           CMD_CONSOLE],
         ["msg",               cmdMsg,              CMD_NEED_SRV | CMD_CONSOLE],
         ["name",              cmdName,                            CMD_CONSOLE],
         ["names",             cmdNames,            CMD_NEED_SRV | CMD_CONSOLE],
         ["network",           cmdNetwork,                         CMD_CONSOLE],
         ["network-motif",     cmdMotif,            CMD_NEED_NET | CMD_CONSOLE],
         ["network-pref",      cmdPref,             CMD_NEED_NET | CMD_CONSOLE],
         ["networks",          cmdNetworks,                        CMD_CONSOLE],
         ["nick",              cmdNick,                            CMD_CONSOLE],
         ["notice",            cmdNotice,           CMD_NEED_SRV | CMD_CONSOLE],
         ["notify",            cmdNotify,           CMD_NEED_SRV | CMD_CONSOLE],
         ["open-at-startup",   cmdOpenAtStartup,                   CMD_CONSOLE],
         ["oper",              cmdOper,             CMD_NEED_SRV | CMD_CONSOLE],
         ["ping",              cmdPing,             CMD_NEED_SRV | CMD_CONSOLE],
         ["plugin-pref",       cmdPref,                            CMD_CONSOLE],
         ["pref",              cmdPref,                            CMD_CONSOLE],
         ["print",             cmdPrint,                           CMD_CONSOLE],
         ["query",             cmdQuery,            CMD_NEED_SRV | CMD_CONSOLE],
         ["quit",              cmdQuit,                            CMD_CONSOLE],
         ["quote",             cmdQuote,            CMD_NEED_NET | CMD_CONSOLE],
         ["reload-plugin",     cmdReload,                          CMD_CONSOLE],
         ["rlist",             cmdRlist,            CMD_NEED_SRV | CMD_CONSOLE],
         ["reconnect",         cmdReconnect,        CMD_NEED_NET | CMD_CONSOLE],
         ["reconnect-all",     cmdReconnectAll,                    CMD_CONSOLE],
         ["rejoin",            cmdRejoin,
                                   CMD_NEED_SRV |  CMD_NEED_CHAN | CMD_CONSOLE],
         ["reload-ui",         cmdReloadUI,                                  0],
         ["save",              cmdSave,                            CMD_CONSOLE],
         ["say",               cmdSay,                             CMD_CONSOLE],
         ["server",            cmdServer,                          CMD_CONSOLE],
         ["set-current-view",  cmdSetCurrentView,                            0],
         ["stats",             cmdSimpleCommand,    CMD_NEED_SRV | CMD_CONSOLE],
         ["squery",            cmdSquery,           CMD_NEED_SRV | CMD_CONSOLE],
         ["sslserver",         cmdSSLServer,                       CMD_CONSOLE],
         ["ssl-exception",     cmdSSLException,                              0],
         ["stalk",             cmdStalk,                           CMD_CONSOLE],
         ["supports",          cmdSupports,         CMD_NEED_SRV | CMD_CONSOLE],
         ["sync-font",         cmdSync,                                      0],
         ["sync-header",       cmdSync,                                      0],
         ["sync-log",          cmdSync,                                      0],
         ["sync-motif",        cmdSync,                                      0],
         ["sync-timestamp",    cmdSync,                                      0],
         ["sync-window",       cmdSync,                                      0],
         ["testdisplay",       cmdTestDisplay,                     CMD_CONSOLE],
         ["text-direction",    cmdTextDirection,                             0],
         ["time",              cmdTime,             CMD_NEED_SRV | CMD_CONSOLE],
         ["timestamps",        cmdTimestamps,                      CMD_CONSOLE],
         ["toggle-ui",         cmdToggleUI,                        CMD_CONSOLE],
         ["toggle-pref",       cmdTogglePref,                                0],
         ["topic",             cmdTopic,           CMD_NEED_CHAN | CMD_CONSOLE],
         ["unalias",           cmdAlias,                           CMD_CONSOLE],
         ["unignore",          cmdIgnore,           CMD_NEED_NET | CMD_CONSOLE],
         ["unban",             cmdBanOrExcept,     CMD_NEED_CHAN | CMD_CONSOLE],
         ["unexcept",          cmdBanOrExcept,     CMD_NEED_CHAN | CMD_CONSOLE],
         ["unstalk",           cmdUnstalk,                         CMD_CONSOLE],
         ["urls",              cmdURLs,                            CMD_CONSOLE],
         ["user",              cmdUser,                            CMD_CONSOLE],
         ["userhost",          cmdUserhost,         CMD_NEED_SRV | CMD_CONSOLE],
         ["userip",            cmdUserip,           CMD_NEED_SRV | CMD_CONSOLE],
         ["usermode",          cmdUsermode,                        CMD_CONSOLE],
         ["user-motif",        cmdMotif,           CMD_NEED_USER | CMD_CONSOLE],
         ["user-pref",         cmdPref,            CMD_NEED_USER | CMD_CONSOLE],
         ["version",           cmdVersion,          CMD_NEED_SRV | CMD_CONSOLE],
         ["who",               cmdWho,              CMD_NEED_SRV | CMD_CONSOLE],
         ["whois",             cmdWhoIs,            CMD_NEED_SRV | CMD_CONSOLE],
         ["whowas",            cmdWhoWas,           CMD_NEED_SRV | CMD_CONSOLE],
         ["wii",               cmdWhoIsIdle,        CMD_NEED_SRV | CMD_CONSOLE],

         /* aliases */
         ["exit",             "quit",                              CMD_CONSOLE],
         ["j",                "join",                              CMD_CONSOLE],
         ["pass",             "quote PASS",                        CMD_CONSOLE],
         ["part",             "leave",                             CMD_CONSOLE],
         ["raw",              "quote",                             CMD_CONSOLE],
         // Shortcuts to useful URLs:
         ["faq",              "goto-url-newtab faq",                         0],
         ["homepage",         "goto-url-newtab homepage",                    0],
         // Used to display a nickname in the menu only.
         ["label-user",       "echo",                                        0],
         ["label-user-multi", "echo",                                        0],
         // These are all the font family/size menu commands...
         ["font-family-default",    "font-family default",                   0],
         ["font-family-serif",      "font-family serif",                     0],
         ["font-family-sans-serif", "font-family sans-serif",                0],
         ["font-family-monospace",  "font-family monospace",                 0],
         ["font-size-default",      "font-size default",                     0],
         ["font-size-small",        "font-size small",                       0],
         ["font-size-medium",       "font-size medium",                      0],
         ["font-size-large",        "font-size large",                       0],
         ["font-size-bigger",       "font-size bigger",                      0],
         // This next command is not visible; it maps to Ctrl-=, which is what
         // you get when the user tries to do Ctrl-+ (previous command's key).
         ["font-size-bigger2",      "font-size bigger",                      0],
         ["font-size-smaller",      "font-size smaller",                     0],
         ["toggle-oas",       "open-at-startup toggle",                      0],
         ["toggle-ccm",       "toggle-pref collapseMsgs",                    0],
         ["toggle-copy",      "toggle-pref copyMessages",                    0],
         ["toggle-usort",     "toggle-pref sortUsersByMode",                 0],
         ["toggle-umode",     "toggle-pref showModeSymbols",                 0],
         ["toggle-timestamps","timestamps toggle",                           0],
         ["motif-dark",       "motif dark",                                  0],
         ["motif-light",      "motif light",                                 0],
         ["sync-output",      "evalsilent syncOutputFrame(this)",            0],
         ["userlist",         "toggle-ui userlist",                CMD_CONSOLE],
         ["tabstrip",         "toggle-ui tabstrip",                CMD_CONSOLE],
         ["statusbar",        "toggle-ui status",                  CMD_CONSOLE],
         ["header",           "toggle-ui header",                  CMD_CONSOLE],

         // text-direction aliases
         ["rtl",              "text-direction rtl",                CMD_CONSOLE],
         ["ltr",              "text-direction ltr",                CMD_CONSOLE],
         ["toggle-text-dir",  "text-direction toggle",                       0],
         ["irtl",             "input-text-direction rtl",          CMD_CONSOLE],
         ["iltr",             "input-text-direction ltr",          CMD_CONSOLE],
         // Instrumentation aliases
         ["allow-ceip",       "ceip on; ceip",                               0],
         ["deny-ceip",        "ceip off",                                    0],
         // Services aliases
         ["cs",               "quote cs",                                    0],
         ["ms",               "quote ms",                                    0],
         ["ns",               "quote ns",                                    0]
        ];

    // set the stringbundle associated with these commands.
    cmdary.stringBundle = client.defaultBundle;

    client.commandManager = new CommandManager(client.defaultBundle);
    client.commandManager.defaultFlags = CMD_NO_HELP | CMD_CONSOLE;
    client.commandManager.isCommandSatisfied = isCommandSatisfied;
    client.commandManager.defineCommands(cmdary);

    var restList = ["reason", "action", "text", "message", "params", "font",
                    "expression", "ircCommand", "prefValue", "newTopic", "file",
                    "password", "commandList", "commands", "description"];
    var stateList = ["connect"];

    client.commandManager.argTypes.__aliasTypes__(restList, "rest");
    client.commandManager.argTypes.__aliasTypes__(stateList, "state");
    client.commandManager.argTypes["plugin"] = parsePlugin;
}

function isCommandSatisfied(e, command)
{
    if (typeof command == "undefined")
        command = e.command;
    else if (typeof command == "string")
        command = this.commands[command];

    if (command.flags & CMD_NEED_USER)
    {
        if (!("user" in e) || !e.user)
        {
            e.parseError = getMsg(MSG_ERR_NEED_USER, command.name);
            return false;
        }
    }

    if (command.flags & CMD_NEED_CHAN)
    {
        if (!("channel" in e) || !e.channel)
        {
            e.parseError = getMsg(MSG_ERR_NEED_CHANNEL, command.name);
            return false;
        }
    }

    if (command.flags & CMD_NEED_SRV)
    {
        if (!("server" in e) || !e.server)
        {
            e.parseError = getMsg(MSG_ERR_NEED_SERVER, command.name);
            return false;
        }

        if (e.network.state != NET_ONLINE)
        {
            e.parseError = MSG_ERR_NOT_CONNECTED;
            return false;
        }
    }

    if (command.flags & (CMD_NEED_NET | CMD_NEED_SRV | CMD_NEED_CHAN))
    {
        if (!("network" in e) || !e.network)
        {
            e.parseError = getMsg(MSG_ERR_NEED_NETWORK, command.name);
            return false;
        }
    }

    return CommandManager.prototype.isCommandSatisfied(e, command);
}

CIRCChannel.prototype.dispatch =
CIRCNetwork.prototype.dispatch =
CIRCUser.prototype.dispatch =
CIRCDCCChat.prototype.dispatch =
CIRCDCCFileTransfer.prototype.dispatch =
client.dispatch =
function this_dispatch(text, e, isInteractive, flags)
{
    e = getObjectDetails(this, e);
    return dispatch(text, e, isInteractive, flags);
}

function dispatch(text, e, isInteractive, flags)
{
    if (typeof isInteractive == "undefined")
        isInteractive = false;

    if (!e)
        e = new Object();

    if (!("sourceObject" in e))
        e.__proto__ = getObjectDetails(client.currentObject);

    if (!("isInteractive" in e))
        e.isInteractive = isInteractive;

    if (!("inputData" in e))
        e.inputData = "";

    /* split command from arguments */
    var ary = text.match(/(\S+) ?(.*)/);
    if (!ary)
    {
        display(getMsg(MSG_ERR_UNKNOWN_COMMAND, ""));
        return null;
    }

    e.commandText = ary[1];
    if (ary[2])
        e.inputData = stringTrim(ary[2]);

    /* list matching commands */
    ary = client.commandManager.list(e.commandText, flags);
    var rv = null;
    var i;

    switch (ary.length)
    {
        case 0:
            /* no match, try again */
            if (e.server && e.server.isConnected &&
                client.prefs["guessCommands"])
            {
                /* Want to keep the source details. */
                var e2 = getObjectDetails(e.sourceObject);
                e2.inputData = e.commandText + " " + e.inputData;
                return dispatch("quote", e2);
            }

            display(getMsg(MSG_ERR_UNKNOWN_COMMAND, e.commandText), MT_ERROR);
            break;

        case 1:
            /* one match, good for you */
            var cm = client.commandManager;

            if (cm.currentDispatchDepth >= cm.maxDispatchDepth)
            {
                /* We've reatched the max dispatch depth, so we need to unwind
                 * the entire stack of commands.
                 */
                cm.dispatchUnwinding = true;
            }
            // Don't start any new commands while unwinding.
            if (cm.dispatchUnwinding)
                break;

            cm.currentDispatchDepth++;

            var ex;
            try
            {
                rv = dispatchCommand(ary[0], e, flags);
            }
            catch (ex)
            {
                display(getMsg(MSG_ERR_INTERNAL_DISPATCH, ary[0].name),
                        MT_ERROR);
                display(formatException(ex), MT_ERROR);
                if (typeof ex == "object" && "stack" in ex)
                    dd(formatException(ex) + "\n" + ex.stack);
                else
                    dd(formatException(ex), MT_ERROR);
            }

            cm.currentDispatchDepth--;
            if (cm.dispatchUnwinding && (cm.currentDispatchDepth == 0))
            {
                /* Last level to unwind, and this is where we display the
                 * message. We need to leave it until here because displaying
                 * a message invokes a couple of commands itself, and we need
                 * to not be right on the dispatch limit for that.
                 */
                cm.dispatchUnwinding = false;
                display(getMsg(MSG_ERR_MAX_DISPATCH_DEPTH, ary[0].name),
                        MT_ERROR);
            }
            break;

        default:
            /* more than one match, show the list */
            var str = "";
            for (i in ary)
                str += (str) ? MSG_COMMASP + ary[i].name : ary[i].name;
            display(getMsg(MSG_ERR_AMBIGCOMMAND,
                           [e.commandText, ary.length, str]), MT_ERROR);
    }

    return rv;
}

function dispatchCommand (command, e, flags)
{
    function displayUsageError (e, details)
    {
        if (!("isInteractive" in e) || !e.isInteractive)
        {
            var caller = Components.stack.caller.caller;
            if (caller.name == "dispatch")
                caller = caller.caller;
            var error = new Error (details);
            error.fileName = caller.filename;
            error.lineNumber = caller.lineNumber;
            error.name = caller.name;
            display (formatException(error), MT_ERROR);
        }
        else
        {
            display (details, MT_ERROR);
        }

        //display (getMsg(MSG_FMT_USAGE, [e.command.name, e.command.usage]),
        //         MT_USAGE);
        return null;
    };

    function callHooks (command, isBefore)
    {
        var names, hooks;

        if (isBefore)
            hooks = command.beforeHooks;
        else
            hooks = command.afterHooks;

        for (var h in hooks)
        {
            if ("dbgDispatch" in client && client.dbgDispatch)
            {
                dd ("calling " + (isBefore ? "before" : "after") +
                    " hook " + h);
            }
            try
            {
                hooks[h](e);
            }
            catch (ex)
            {
                if (e.command.name != "hook-session-display")
                {
                    display(getMsg(MSG_ERR_INTERNAL_HOOK, h), MT_ERROR);
                    display(formatException(ex), MT_ERROR);
                }
                else
                {
                    dd(getMsg(MSG_ERR_INTERNAL_HOOK, h));
                }

                dd("Caught exception calling " +
                   (isBefore ? "before" : "after") + " hook " + h);
                dd(formatException(ex));
                if (typeof ex == "object" && "stack" in ex)
                    dd(ex.stack);
                else
                    dd(getStackTrace());
            }
        }
    };

    e.command = command;

    if (!e.command.enabled)
    {
        /* disabled command */
        display (getMsg(MSG_ERR_DISABLED, e.command.name),
                 MT_ERROR);
        return null;
    }

    function parseAlias(aliasLine, e) {
        /* Only 1 of these will be presented to the user. Math.max is used to
           supply the 'worst' error */
        const ALIAS_ERR_REQ_PRMS = 1;
        const ALIAS_ERR_REQ_SRV = 2;
        const ALIAS_ERR_REQ_RECIP = 3;

        /* double slashes because of the string to regexp conversion, which
           turns these into single slashes */
        const SIMPLE_REPLACE = "\\$\\((\\d+)\\)";
        const CUMUL_REPLACE = "\\$\\((\\d+)\\+\\)";
        const RANGE_REPLACE = "\\$\\((\\d+)\\-(\\d+)\\)";
        const NICK_REPLACE = "\\$\\((nick)\\)";
        const RECIP_REPLACE = "\\$\\((recip)\\)";
        const ALL_REPLACE = "\\$\\((all)\\)";
        if (!aliasLine.match(/\$/))
        {
            if (e.inputData)
                display(getMsg(MSG_EXTRA_PARAMS, e.inputData), MT_WARN);
            return aliasLine;
        }

        function replaceAll(match, single, cumulative, start, end, nick, recip, all)
        {
            if (single)
            {
                // Simple 1-parameter replace
                if (arrayHasElementAt(parameters, single - 1))
                {
                    paramsUsed = Math.max(paramsUsed, single);
                    return parameters[single-1];
                }
                maxParamsAsked = Math.max(maxParamsAsked, single);
                errorMsg = Math.max(ALIAS_ERR_REQ_PRMS, errorMsg);
                return match;
            }
            if (cumulative)
            {
                // Cumulative Replace: parameters cumulative and up
                if (arrayHasElementAt(parameters, cumulative - 1))
                {
                    paramsUsed = parameters.length;
                    // there are never leftover parameters for $(somenumber+)
                    return parameters.slice(cumulative - 1).join(" ");
                }
                maxParamsAsked = Math.max(maxParamsAsked, cumulative);
                errorMsg = Math.max(ALIAS_ERR_REQ_PRMS, errorMsg);
                return match;
            }
            if (start && end)
            {
                // Ranged replace: parameters start through end
                //'decrement to correct 0-based index.
                if (start > end)
                {
                    var iTemp = end;
                    end = start;
                    start = iTemp;
                    // We obviously have a very stupid user, but we're nice
                }
                start--;
                if (arrayHasElementAt(parameters, start) &&
                    arrayHasElementAt(parameters, end - 1))
                {
                    paramsUsed = Math.max(paramsUsed,end);
                    return parameters.slice(start, end).join(" ");
                }
                maxParamsAsked = Math.max(maxParamsAsked, end);
                errorMsg = Math.max(ALIAS_ERR_REQ_PRMS, errorMsg);
                return match;
            }
            if (nick)
            {
                // Replace with own nickname
                if (e.network && e.server && e.network.state == NET_ONLINE)
                    return e.server.me.unicodeName;

                errorMsg = Math.max(ALIAS_ERR_REQ_SRV, errorMsg);
                return null;
            }
            if (recip)
            {
                // Replace with current recipient
                if (e.channel)
                    return e.channel.unicodeName;

                if (e.user)
                    return e.user.unicodeName;

                errorMsg = ALIAS_ERR_REQ_RECIP;
                return null;
             }
             // Replace with all parameters
             paramsUsed = parameters.length;
             return parameters.join(" ");
        };

        // If the replace function has a problem, this is an error constant:
        var errorMsg = 0;

        var paramsUsed = 0;
        var maxParamsAsked = 0;

        /* set parameters array and escaping \ and ; in parameters so the
         * parameters don't get split up by the command list split later on */
        e.inputData = e.inputData.replace(/([\\;])/g, "\\$1");
        var parameters = e.inputData.match(/\S+/g);
        if (!parameters)
            parameters = [];

        // replace in the command line.
        var expr = [SIMPLE_REPLACE, CUMUL_REPLACE, RANGE_REPLACE, NICK_REPLACE,
                    RECIP_REPLACE, ALL_REPLACE].join("|");
        aliasLine = aliasLine.replace(new RegExp(expr, "gi"), replaceAll);

        if (errorMsg)
        {
            switch (errorMsg)
            {
                case ALIAS_ERR_REQ_PRMS:
                    display(getMsg(MSG_ERR_REQUIRED_NR_PARAM,
                                   [maxParamsAsked - parameters.length,
                                    maxParamsAsked]), MT_ERROR);
                    break;
                case ALIAS_ERR_REQ_SRV:
                    display(getMsg(MSG_ERR_NEED_SERVER, e.command.name),
                            MT_ERROR);
                    break;
                case ALIAS_ERR_REQ_RECIP:
                    display(getMsg(MSG_ERR_NEED_RECIP, e.command.name),
                            MT_ERROR);
                    break;
            }
            return null;
        }

        // return the revised command line.
        if (paramsUsed < parameters.length)
        {
            var pmstring = parameters.slice(paramsUsed,
                                            parameters.length).join(" ");
            display(getMsg(MSG_EXTRA_PARAMS, pmstring), MT_WARN);
        }
        return aliasLine;
    };

    function callBeforeHooks()
    {
        if ("beforeHooks" in client.commandManager)
            callHooks(client.commandManager, true);
        if ("beforeHooks" in e.command)
            callHooks(e.command, true);
    };

    function callAfterHooks()
    {
        if ("afterHooks" in e.command)
            callHooks(e.command, false);
        if ("afterHooks" in client.commandManager)
            callHooks(client.commandManager, false);
    };

    var h, i;

    if (typeof e.command.func == "function")
    {
        /* dispatch a real function */

        client.commandManager.parseArguments(e);
        if ("parseError" in e)
            return displayUsageError(e, e.parseError);

        if (("dbgDispatch" in client) && client.dbgDispatch)
        {
            var str = "";
            for (i = 0; i < e.command.argNames.length; ++i)
            {
                var name = e.command.argNames[i];
                if (name in e)
                    str += " " + name + ": " + e[name];
                else if (name != ":")
                    str += " ?" + name;
            }
            dd(">>> " + e.command.name + str + " <<<");
        }

        callBeforeHooks();
        try
        {
            e.returnValue = e.command.func(e);
        }
        finally
        {
            callAfterHooks();
            /* set client.lastEvent *after* dispatching, so the dispatched
             * function actually get's a chance to see the last event. */
            if (("dbgDispatch" in client) && client.dbgDispatch)
                client.lastEvent = e;
        }
    }
    else if (typeof e.command.func == "string")
    {
        /* dispatch an alias (semicolon delimited list of subcommands) */

        var commandList;
        //Don't make use of e.inputData if we have multiple commands in 1 alias
        if (e.command.func.match(/\$\(.*\)|(?:^|[^\\])(?:\\\\)*;/))
            commandList = parseAlias(e.command.func, e);
        else
            commandList = e.command.func + " " + e.inputData;

        if (commandList == null)
            return null;
        commandList = commandList.split(";");

        i = 0;
        while (i < commandList.length) {
            if (commandList[i].match(/(?:^|[^\\])(?:\\\\)*$/) ||
                (i == commandList.length - 1))
            {
                commandList[i] = commandList[i].replace(/\\(.)/g, "$1");
                i++;
            }
            else
            {
                commandList[i] = commandList[i] + ";" + commandList[i + 1];
                commandList.splice(i + 1, 1);
            }
        }

        callBeforeHooks();
        try
        {
            for (i = 0; i < commandList.length; ++i)
            {
                var newEvent = Clone(e);
                delete newEvent.command;
                commandList[i] = stringTrim(commandList[i]);
                dispatch(commandList[i], newEvent, flags);
            }
        }
        finally
        {
            callAfterHooks();
        }
    }
    else
    {
        display(getMsg(MSG_ERR_NOTIMPLEMENTED, e.command.name), MT_ERROR);
        return null;
    }

    return ("returnValue" in e) ? e.returnValue : null;
}

/* parse function for <plugin> parameters */
function parsePlugin(e, name)
{
    var ary = e.unparsedData.match (/(?:(\d+)|(\S+))(?:\s+(.*))?$/);
    if (!ary)
        return false;

    var plugin;

    if (ary[1])
    {
        var i = parseInt(ary[1]);
        if (!(i in client.plugins))
            return false;

        plugin = client.plugins[i];
    }
    else
    {
        plugin = getPluginById(ary[2]);
        if (!plugin)
            return false;

    }

    e.unparsedData = arrayHasElementAt(ary, 3) ? ary[3] : "";
    e[name] = plugin;
    return true;
}

function getToggle (toggle, currentState)
{
    if (toggle == "toggle")
        toggle = !currentState;

    return toggle;
}

/******************************************************************************
 * command definitions from here on down.
 */

function cmdAblePlugin(e)
{
    if (e.command.name == "disable-plugin")
    {
        if (!e.plugin.enabled)
        {
            display(getMsg(MSG_IS_DISABLED, e.plugin.id));
            return;
        }

        if (e.plugin.API > 0)
        {
            if (!e.plugin.disable())
            {
                display(getMsg(MSG_CANT_DISABLE, e.plugin.id));
                return;
            }
            e.plugin.prefs["enabled"] = false;
        }
        else if (!("disablePlugin" in e.plugin.scope))
        {
            display(getMsg(MSG_CANT_DISABLE, e.plugin.id));
            return;
        }
        else
        {
            e.plugin.scope.disablePlugin();
        }

        display(getMsg(MSG_PLUGIN_DISABLED, e.plugin.id));
        e.plugin.enabled = false;
    }
    else
    {
        if (e.plugin.enabled)
        {
            display(getMsg(MSG_IS_ENABLED, e.plugin.id));
            return;
        }

        if (e.plugin.API > 0)
        {
            if (!e.plugin.enable())
            {
                display(getMsg(MSG_CANT_ENABLE, e.plugin.id));
                e.plugin.prefs["enabled"] = false;
                return;
            }
            e.plugin.prefs["enabled"] = true;
        }
        else if (!("enablePlugin" in e.plugin.scope))
        {
            display(getMsg(MSG_CANT_ENABLE, e.plugin.id));
            return;
        }
        else
        {
            e.plugin.scope.enablePlugin();
        }

        display(getMsg(MSG_PLUGIN_ENABLED, e.plugin.id));
        e.plugin.enabled = true;
    }
}

function cmdBanOrExcept(e)
{
    var modestr;
    switch (e.command.name)
    {
        case "ban":
            modestr = "+bbbb";
            break;

        case "unban":
            modestr = "-bbbb";
            break;

        case "except":
            modestr = "+eeee";
            break;

        case "unexcept":
            modestr = "-eeee";
            break;

        default:
            ASSERT(0, "Dispatch from unknown name " + e.command.name);
            return;
    }

    /* If we're unbanning, or banning in odd cases, we may actually be talking
     * about a user who is not in the channel, so we need to check the server
     * for information as well.
     */
    if (!e.user && e.nickname)
        e.user = e.channel.getUser(e.nickname);
    if (!e.user && e.nickname)
        e.user = e.server.getUser(e.nickname);

    var masks = new Array();

    if (e.userList)
    {
        for (var i = 0; i < e.userList.length; i++)
            masks.push(fromUnicode(e.userList[i].getBanMask(), e.server));
    }
    else if (e.user)
    {
        // We have a real user object, so get their proper 'ban mask'.
        masks = [fromUnicode(e.user.getBanMask(), e.server)];
    }
    else if (e.nickname)
    {
        /* If we have either ! or @ in the nickname assume the user has given
         * us a complete mask and pass it directly, otherwise assume it is
         * only the nickname and use * for username/host.
         */
        masks = [fromUnicode(e.nickname, e.server)];
        if (!/[!@]/.test(e.nickname))
            masks[0] = masks[0] + "!*@*";
    }
    else
    {
        // Nothing specified, so we want to list the bans/excepts.
        masks = [""];
    }

    // Collapses into groups we can do individually.
    masks = combineNicks(masks);

    for (var i = 0; i < masks.length; i++)
    {
        e.server.sendData("MODE " + e.channel.encodedName + " " +
                          modestr.substr(0, masks[i].count + 1) +
                          " " + masks[i] + "\n");
    }
}

function cmdCancel(e)
{
    if (e.network && e.network.isRunningList())
    {
        // We're running a /list, terminate the output so we return to sanity.
        display(MSG_CANCELLING_LIST);
        return e.network.abortList();
    }

    if (e.network && ((e.network.state == NET_CONNECTING) ||
                      (e.network.state == NET_WAITING)))
    {
        // We're trying to connect to a network, and want to cancel. Do so:
        if (e.deleteWhenDone)
            e.network.deleteWhenDone = true;

        display(getMsg(MSG_CANCELLING, e.network.unicodeName));
        return e.network.cancel();
    }

    // If we're transferring a file, abort it.
    var source = e.sourceObject;
    if ((source.TYPE == "IRCDCCFileTransfer") && source.isActive())
        return source.abort();

    display(MSG_NOTHING_TO_CANCEL, MT_ERROR);
}

function cmdChanUserMode(e)
{
    var modestr;
    switch (e.command.name)
    {
        case "op":
            modestr = "+oooo";
            break;

        case "deop":
            modestr = "-oooo";
            break;

        case "hop":
            modestr = "+hhhh";
            break;

        case "dehop":
            modestr = "-hhhh";
            break;

        case "voice":
            modestr = "+vvvv";
            break;

        case "devoice":
            modestr = "-vvvv";
            break;

        default:
            ASSERT(0, "Dispatch from unknown name " + e.command.name);
            return;
    }

    var nicks;
    var user;
    var nickList = new Array();
    // Prefer pre-canonicalised list, then a * passed to the command directly,
    // then a normal list, then finally a singular item (canon. or otherwise).
    if (e.canonNickList)
    {
        nicks = combineNicks(e.canonNickList);
    }
    else if (e.nickname && (e.nickname == "*"))
    {
        var me = e.server.me;
        for (user in e.channel.users)
        {
            var user2 = e.channel.users[user];
            if (user2.encodedName != me.encodedName)
                nickList.push(user2.encodedName);
        }
        nicks = combineNicks(nickList);
    }
    else if (e.nicknameList)
    {
        for (var i = 0; i < e.nicknameList.length; i++)
        {
            user = e.channel.getUser(e.nicknameList[i]);
            if (!user)
            {
                display(getMsg(MSG_ERR_UNKNOWN_USER, e.nicknameList[i]), MT_ERROR);
                return;
            }
            nickList.push(user.encodedName);
        }
        nicks = combineNicks(nickList);
    }
    else if (e.nickname)
    {
        user = e.channel.getUser(e.nickname);
        if (!user)
        {
            display(getMsg(MSG_ERR_UNKNOWN_USER, e.nickname), MT_ERROR);
            return;
        }
        var str = new String(user.encodedName);
        str.count = 1;
        nicks = [str];
    }
    else
    {
        // Panic?
        dd("Help! Channel user mode command with no users...?");
    }

    for (var i = 0; i < nicks.length; ++i)
    {
        e.server.sendData("MODE " + e.channel.encodedName + " " +
                          modestr.substr(0, nicks[i].count + 1) +
                          " " + nicks[i] + "\n");
    }
}

function cmdCharset(e)
{
    var pm;

    if (e.command.name == "default-charset")
    {
        pm = client.prefManager;
        msg = MSG_CURRENT_CHARSET;
    }
    else
    {
        pm = e.sourceObject.prefManager;
        msg = MSG_CURRENT_CHARSET_VIEW;
    }

    if (e.newCharset)
    {
        if (e.newCharset == "-")
        {
            pm.clearPref("charset");
        }
        else
        {
            if(!checkCharset(e.newCharset))
            {
                display(getMsg(MSG_ERR_INVALID_CHARSET, e.newCharset),
                        MT_ERROR);
                return;
            }
            pm.prefs["charset"] = e.newCharset;
        }
    }

    display(getMsg(msg, pm.prefs["charset"]));

    // If we're on a channel, get the topic again so it can be re-decoded.
    if (e.newCharset && e.server && e.channel)
        e.server.sendData("TOPIC " + e.channel.encodedName + "\n");
}

function cmdCreateTabForView(e)
{
    return getTabForObject(e.view, true);
}

function cmdDelayed(e)
{
    function _dispatch()
    {
        dispatch(e.rest, null, e.isInteractive);
    }
    setTimeout(_dispatch, e.delay * 1000);
}

function cmdSync(e)
{
    var fun;

    switch (e.command.name)
    {
        case "sync-font":
            fun = function ()
                  {
                      if (view.prefs["displayHeader"])
                          view.setHeaderState(false);
                      view.changeCSS(view.getFontCSS("data"), "cz-fonts");
                      if (view.prefs["displayHeader"])
                          view.setHeaderState(true);
                  };
            break;

        case "sync-header":
            fun = function ()
                  {
                      view.setHeaderState(view.prefs["displayHeader"]);
                  };
            break;

        case "sync-motif":
            fun = function ()
                  {
                      view.changeCSS(view.prefs["motif.current"]);
                      updateAppMotif(view.prefs["motif.current"]);
                      // Refresh the motif settings.
                      view.updateMotifSettings();
                  };
            break;

        case "sync-timestamp":
            fun = function ()
                  {
                      updateTimestamps(view);
                  };
            break;

        case "sync-window":
            fun = function ()
                  {
                      if (window && window.location &&
                          window.location.href != view.prefs["outputWindowURL"])
                      {
                          syncOutputFrame(view);
                      }
                  };
            break;

        case "sync-log":
            fun = function ()
                  {
                      if (view.prefs["log"] ^ Boolean(view.logFile))
                      {
                          if (view.prefs["log"])
                              client.openLogFile(view, true);
                          else
                              client.closeLogFile(view, true);
                          updateLoggingIcon();
                      }
                  };
            break;
    }

    var view = e.sourceObject;
    var window;
    if (("frame" in view) && view.frame)
        window = getContentWindow(view.frame);

    try
    {
        fun();
    }
    catch(ex)
    {
        dd("Exception in " + e.command.name + " for " + e.sourceObject.unicodeName + ": " + ex);
    }
}

function cmdSimpleCommand(e)
{
    e.server.sendData(e.command.name + " " + e.inputData + "\n");
}

function cmdSquery(e)
{
    var data;

    if (e.commands)
        data = "SQUERY " + e.service + " :" + e.commands + "\n";
    else
        data = "SQUERY " + e.service + "\n";

    e.server.sendData(data);
}

function cmdHelp(e)
{
    if (!e.pattern)
    {
        if ("hello" in e)
            display(MSG_HELP_INTRO, "HELLO");
        else
            display(MSG_HELP_INTRO);
        return;
    }

    var ary = client.commandManager.list(e.pattern, CMD_CONSOLE);

    if (ary.length == 0)
    {
        display(getMsg(MSG_ERR_UNKNOWN_COMMAND, e.pattern), MT_ERROR);
        return;
    }

    for (var i in ary)
    {
        display(getMsg(MSG_FMT_USAGE, [ary[i].name, ary[i].usage]), MT_USAGE);
        display(ary[i].help, MT_HELP);
    }

    return;
}

function cmdTestDisplay(e)
{
    display(MSG_TEST_HELLO, MT_HELLO);
    display(MSG_TEST_INFO, MT_INFO);
    display(MSG_TEST_ERROR, MT_ERROR);
    display(MSG_TEST_HELP, MT_HELP);
    display(MSG_TEST_USAGE, MT_USAGE);
    display(MSG_TEST_STATUS, MT_STATUS);

    if (e.server && e.server.me)
    {
        var me = e.server.me;
        var sampleUser = {TYPE: "IRCUser",
                          encodedName: "ircmonkey", canonicalName: "ircmonkey",
                          unicodeName: "IRCMonkey", viewName: "IRCMonkey",
                          host: "", name: "chatzilla"};
        var sampleChannel = {TYPE: "IRCChannel",
                             encodedName: "#mojo", canonicalName: "#mojo",
                             unicodeName: "#Mojo", viewName: "#Mojo"};

        function test (from, to)
        {
            var fromText = (from != me) ? from.TYPE + " ``" + from.name + "''" :
                MSG_YOU;
            var toText   = (to != me) ? to.TYPE + " ``" + to.name + "''" :
                MSG_YOU;

            display (getMsg(MSG_TEST_PRIVMSG, [fromText, toText]),
                     "PRIVMSG", from, to);
            display (getMsg(MSG_TEST_ACTION, [fromText, toText]),
                     "ACTION", from, to);
            display (getMsg(MSG_TEST_NOTICE, [fromText, toText]),
                     "NOTICE", from, to);
        }

        test (sampleUser, me); /* from user to me */
        test (me, sampleUser); /* me to user */

        display(MSG_TEST_URL, "PRIVMSG", sampleUser, me);
        display(MSG_TEST_STYLES, "PRIVMSG", sampleUser, me);
        display(MSG_TEST_EMOTICON, "PRIVMSG", sampleUser, me);
        display(MSG_TEST_RHEET, "PRIVMSG", sampleUser, me);
        display(unescape(MSG_TEST_CTLCHR), "PRIVMSG", sampleUser, me);
        display(unescape(MSG_TEST_COLOR), "PRIVMSG", sampleUser, me);
        display(MSG_TEST_QUOTE, "PRIVMSG", sampleUser, me);

        if (e.channel)
        {
            test (sampleUser, sampleChannel); /* user to channel */
            test (me, sampleChannel);         /* me to channel */
            display(MSG_TEST_TOPIC, "TOPIC", sampleUser, sampleChannel);
            display(MSG_TEST_JOIN, "JOIN", sampleUser, sampleChannel);
            display(MSG_TEST_PART, "PART", sampleUser, sampleChannel);
            display(MSG_TEST_KICK, "KICK", sampleUser, sampleChannel);
            display(MSG_TEST_QUIT, "QUIT", sampleUser, sampleChannel);
            display(getMsg(MSG_TEST_STALK, me.unicodeName),
                    "PRIVMSG", sampleUser, sampleChannel);
            display(MSG_TEST_STYLES, "PRIVMSG", me, sampleChannel);
        }
    }
}

function cmdNetwork(e)
{
    if (!(e.networkName in client.networks))
    {
        display (getMsg(MSG_ERR_UNKNOWN_NETWORK, e.networkName), MT_ERROR);
        return;
    }

    var network = client.networks[e.networkName];

    dispatch("create-tab-for-view", { view: network });
    dispatch("set-current-view", { view: network });
}

function cmdNetworks(e)
{
    var span = document.createElementNS(XHTML_NS, "html:span");

    span.appendChild(newInlineText(MSG_NETWORKS_HEADA));

    var netnames = keys(client.networks).sort();
    var lastname = netnames[netnames.length - 1];

    for (var n in netnames)
    {
        var net = client.networks[netnames[n]];
        var a = document.createElementNS(XHTML_NS, "html:a");
        /* Test for an all-SSL network */
        var isSecure = true;
        for (var s in client.networks[netnames[n]].serverList)
        {
            if (!client.networks[netnames[n]].serverList[s].isSecure)
            {
                isSecure = false;
                break;
            }
        }
        a.setAttribute("class", "chatzilla-link");
        a.setAttribute("href", (isSecure ? "ircs://" : "irc://") + net.canonicalName);
        var t = newInlineText(net.unicodeName);
        a.appendChild(t);
        span.appendChild(a);
        if (netnames[n] != lastname)
            span.appendChild(newInlineText (MSG_COMMASP));
    }

    span.appendChild(newInlineText(MSG_NETWORKS_HEADB));

    display(span, MT_INFO);
}

function cmdServer(e)
{
    var ary = e.hostname.match(/^(.*):(\d+)$/);
    if (ary)
    {
        // Foolish user obviously hasn't read the instructions, but we're nice.
        e.password = e.port;
        e.port = ary[2];
        e.hostname = ary[1];
    }

    gotoIRCURL({scheme: "irc", host: e.hostname, port: e.port || 6667,
                pass: e.password, isserver: true});
}

function cmdSSLServer(e)
{
    var ary = e.hostname.match(/^(.*):(\d+)$/);
    if (ary)
    {
        // Foolish user obviously hasn't read the instructions, but we're nice.
        e.password = e.port;
        e.port = ary[2];
        e.hostname = ary[1];
    }

    gotoIRCURL({scheme: "ircs", host: e.hostname, port: e.port || 9999,
                pass: e.password, isserver: true});
}

function cmdSSLException(e)
{
    var opts = "chrome,centerscreen,modal";
    var location = e.hostname ? e.hostname + ':' + e.port : undefined;
    var args = {location: location, prefetchCert: true};

    window.openDialog("chrome://pippki/content/exceptionDialog.xul",
                      "", opts, args);

    if (!args.exceptionAdded)
        return;

    if (e.connect)
    {
        // When we come via the inline button, we just want to reconnect
        if (e.source == "mouse")
            dispatch("reconnect");
        else
            dispatch("sslserver " + e.hostname + " " + e.port);
    }
}


function cmdQuit(e)
{
    // if we're not connected to anything, just close the window
    if (!("getConnectionCount" in client) || (client.getConnectionCount() == 0))
    {
         client.userClose = true;
         window.close();
         return;
    }

    // Otherwise, try to close gracefully:
    client.wantToQuit(e.reason, true);
}

function cmdDisconnect(e)
{
    if ((typeof e.reason != "string") || !e.reason)
        e.reason = e.network.prefs["defaultQuitMsg"];
    if (!e.reason)
        e.reason = client.userAgent;

    e.network.quit(e.reason);
}

function cmdDisconnectAll(e)
{
    var netReason;
    if (confirmEx(MSG_CONFIRM_DISCONNECT_ALL, ["!yes", "!no"]) != 0)
        return;

    var conNetworks = client.getConnectedNetworks();
    if (conNetworks.length <= 0)
    {
        display(MSG_NO_CONNECTED_NETS, MT_ERROR);
        return;
    }

    for (var i = 0; i < conNetworks.length; i++)
    {
        netReason = e.reason;
        if ((typeof netReason != "string") || !netReason)
            netReason = conNetworks[i].prefs["defaultQuitMsg"];
        netReason = (netReason ? netReason : client.userAgent);
        conNetworks[i].quit(netReason);
    }
}

function cmdDeleteView(e)
{
    if (!e.view)
        e.view = e.sourceObject;

    if (("lockView" in e.view) && e.view.lockView)
    {
        setTabState(e.view, "attention");
        return;
    }

    if (e.view.TYPE == "IRCChannel" && e.view.joined)
    {
        e.view.dispatch("part", { deleteWhenDone: true });
        return;
    }

    if (e.view.TYPE.substr(0, 6) == "IRCDCC")
    {
        if (e.view.isActive())
            e.view.abort();
        // abort() calls disconnect() if it is appropriate.
        // Fall through: we don't delete on disconnect.
    }

    if (e.view.TYPE == "IRCNetwork" && (e.view.state == NET_CONNECTING ||
                                        e.view.state == NET_WAITING))
    {
        e.view.dispatch("cancel", { deleteWhenDone: true });
        return;
    }

    if (client.viewsArray.length < 2)
    {
        display(MSG_ERR_LAST_VIEW, MT_ERROR);
        return;
    }

    var tb = getTabForObject(e.view);
    if (tb)
    {
        var i = deleteTab (tb);
        if (i != -1)
        {
            if (e.view.logFile)
            {
                e.view.logFile.close();
                e.view.logFile = null;
            }
            delete e.view.messageCount;
            delete e.view.messages;
            deleteFrame(e.view);

            var oldView = client.currentObject;
            if (client.currentObject == e.view)
            {
                if (i >= client.viewsArray.length)
                    i = client.viewsArray.length - 1;
                oldView = client.viewsArray[i].source
            }
            client.currentObject = null;
            oldView.dispatch("set-current-view", { view: oldView });
        }
    }
}

function cmdHideView(e)
{
    if (!e.view)
        e.view = e.sourceObject;

    if (client.viewsArray.length < 2)
    {
        display(MSG_ERR_LAST_VIEW_HIDE, MT_ERROR);
        return;
    }

    if ("messages" in e.view)
    {
        // Detach messages from output window content.
        if (e.view.messages.parentNode)
            e.view.messages.parentNode.removeChild(e.view.messages);

        /* XXX Bug 335998: Adopt the messages into our own internal document
         * so that when the real one the messages were in gets incorrectly
         * GC-collected (see bug) the nodes still have an ownerDocument.
         */
        client.adoptNode(e.view.messages, client.hiddenDocument);
    }

    var tb = getTabForObject(e.view);

    if (tb)
    {
        var i = deleteTab (tb);
        if (i != -1)
        {
            deleteFrame(e.view);

            var oldView = client.currentObject;
            if (client.currentObject == e.view)
            {
                if (i >= client.viewsArray.length)
                    i = client.viewsArray.length - 1;
                oldView = client.viewsArray[i].source
            }
            client.currentObject = null;
            oldView.dispatch("set-current-view", { view: oldView });
        }
    }
}

function cmdClearView(e)
{
    if (!e.view)
        e.view = e.sourceObject;

    e.view.messages = null;
    e.view.messageCount = 0;

    e.view.displayHere(MSG_MESSAGES_CLEARED);

    syncOutputFrame(e.view);
}

function cmdDesc(e)
{
    if (e.network != null) // somewhere on a network
    {
        dispatch("network-pref", {prefValue: e.description, prefName: "desc",
                                  network: e.network,
                                  isInteractive: e.isInteractive});
    }
    else // no network, change the general pref
    {
        dispatch("pref", {prefName: "desc", prefValue: e.description,
                          isInteractive: e.isInteractive});
    }
}

function cmdName(e)
{
    if (e.network != null) // somewhere on a network
    {
        dispatch("network-pref", {prefName: "username", prefValue: e.username,
                                  network: e.network,
                                  isInteractive: e.isInteractive});
    }
    else // no network, change the general pref
    {
        dispatch("pref", {prefName: "username", prefValue: e.username,
                          isInteractive: e.isInteractive});
    }
}

function cmdNames(e)
{
    if (e.hasOwnProperty("channelName"))
    {
        e.channel = new CIRCChannel(e.server, e.channelName);
    }
    else
    {
        if (!e.channel)
        {
            display(getMsg(MSG_ERR_REQUIRED_PARAM, "channel-name"), MT_ERROR);
            return;
        }
    }

    e.channel.pendingNamesReply = true;
    e.server.sendData("NAMES " + e.channel.encodedName + "\n");
}

function cmdReconnect(e)
{
    if (e.network.isConnected())
    {
        // Set reconnect flag
        e.network.reconnect = true;
        if (typeof e.reason != "string")
            e.reason = MSG_RECONNECTING;
        // Now we disconnect.
        e.network.quit(e.reason);
    }
    else
    {
        e.network.connect(e.network.requireSecurity);
    }
}

function cmdReconnectAll(e)
{
    var reconnected = false;
    for (var net in client.networks)
    {
        if (client.networks[net].isConnected() ||
            ("messages" in client.networks[net]))
        {
            client.networks[net].dispatch("reconnect", { reason: e.reason });
            reconnected = true;
        }
    }
    if (!reconnected)
        display(MSG_NO_RECONNECTABLE_NETS, MT_ERROR);
}

function cmdRejoin(e)
{
    if (e.channel.joined)
    {
        if (!e.reason)
            e.reason = "";
        e.channel.dispatch("part", { reason: e.reason, deleteWhenDone: false });
    }

    e.channel.join(e.channel.mode.key);
}

function cmdTogglePref (e)
{
    var state = !client.prefs[e.prefName];
    client.prefs[e.prefName] = state;
    feedback(e, getMsg (MSG_FMT_PREF,
                        [e.prefName, state ? MSG_VAL_ON : MSG_VAL_OFF]));
}

function cmdToggleUI(e)
{
    var ids = new Array();

    switch (e.thing)
    {
        case "tabstrip":
            ids = ["view-tabs"];
            break;

        case "userlist":
            ids = ["main-splitter", "user-list-box"];
            break;

        case "header":
            client.currentObject.prefs["displayHeader"] =
                !client.currentObject.prefs["displayHeader"];
            return;

        case "status":
            ids = ["status-bar"];
            break;

        default:
            ASSERT (0,"Unknown element ``" + e.thing +
                    "'' passed to onToggleVisibility.");
            return;
    }

    var newState;
    var elem = document.getElementById(ids[0]);
    var sourceObject = e.sourceObject;
    var newState = !elem.collapsed;

    for (var i in ids)
    {
        elem = document.getElementById(ids[i]);
        elem.collapsed = newState;
    }

    updateTitle();
    dispatch("focus-input");
}

function cmdCommands(e)
{
    display(MSG_COMMANDS_HEADER);

    var matchResult = client.commandManager.listNames(e.pattern, CMD_CONSOLE);
    matchResult = matchResult.join(MSG_COMMASP);

    if (e.pattern)
        display(getMsg(MSG_MATCHING_COMMANDS, [e.pattern, matchResult]));
    else
        display(getMsg(MSG_ALL_COMMANDS, matchResult));
}

function cmdAttach(e)
{
    if (e.ircUrl.search(/ircs?:\/\//i) != 0)
        e.ircUrl = "irc://" + e.ircUrl;

    var parsedURL = parseIRCURL(e.ircUrl);
    if (!parsedURL)
    {
        display(getMsg(MSG_ERR_BAD_IRCURL, e.ircUrl), MT_ERROR);
        return;
    }

    gotoIRCURL(e.ircUrl);
}

function cmdMatchUsers(e)
{
    var matches = e.channel.findUsers(e.mask);
    var uc = matches.unchecked;
    var msgNotChecked = "";

    // Get a pretty list of nicknames:
    var nicknames = [];
    for (var i = 0; i < matches.users.length; i++)
        nicknames.push(matches.users[i].unicodeName);

    var nicknameStr = arraySpeak(nicknames);

    // Were we unable to check one or more of the users?
    if (uc != 0)
        msgNotChecked = getMsg(MSG_MATCH_UNCHECKED, uc);

    if (matches.users.length == 0)
        display(getMsg(MSG_NO_MATCHING_NICKS, msgNotChecked));
    else
        display(getMsg(MSG_MATCHING_NICKS, [nicknameStr, msgNotChecked]));
}

function cmdMe(e)
{
    if (!("act" in e.sourceObject))
    {
        display(getMsg(MSG_ERR_IMPROPER_VIEW, "me"), MT_ERROR);
        return;
    }
    _sendMsgTo(e.action, "ACTION", e.sourceObject);
}

function cmdDescribe(e)
{
    var target = e.server.addTarget(e.target);
    _sendMsgTo(e.action, "ACTION", target, e.sourceObject);
}

function cmdMode(e)
{
    var chan;

    // Make sure the user can leave the channel name out from a channel view.
    if ((!e.target || /^[\+\-].+/.test(e.target)) &&
        !(chan && e.server.getChannel(chan)))
    {
        if (e.channel)
        {
            chan = e.channel.canonicalName;
            if (e.param && e.modestr)
            {
                e.paramList.unshift(e.modestr);
            }
            else if (e.modestr)
            {
                e.paramList = [e.modestr];
                e.param = e.modestr;
            }
            e.modestr = e.target;
        }
        else
        {
            display(getMsg(MSG_ERR_REQUIRED_PARAM, "target"), MT_ERROR);
            return;
        }
    }
    else
    {
        chan = fromUnicode(e.target, e.server);
    }

    // Check whether our mode string makes sense
    if (!e.modestr)
    {
        e.modestr = "";
        if (!e.channel && arrayContains(e.server.channelTypes, chan[0]))
            e.channel = new CIRCChannel(e.server, null, chan);
        if (e.channel)
            e.channel.pendingModeReply = true;
    }
    else if (!(/^([+-][a-z]+)+$/i).test(e.modestr))
    {
        display(getMsg(MSG_ERR_INVALID_MODE, e.modestr), MT_ERROR);
        return;
    }

    var params = (e.param) ? " " + e.paramList.join(" ") : "";
    e.server.sendData("MODE " + chan + " " + fromUnicode(e.modestr, e.server) +
                      params + "\n");
}

function cmdMotif(e)
{
    var pm;
    var msg;

    if (e.command.name == "channel-motif")
    {
        pm = e.channel.prefManager;
        msg = MSG_CURRENT_CSS_CHAN;
    }
    else if (e.command.name == "network-motif")
    {
        pm = e.network.prefManager;
        msg = MSG_CURRENT_CSS_NET;
    }
    else if (e.command.name == "user-motif")
    {
        pm = e.user.prefManager;
        msg = MSG_CURRENT_CSS_USER;
    }
    else
    {
        pm = client.prefManager;
        msg = MSG_CURRENT_CSS;
    }

    if (e.motif)
    {
        if (e.motif == "-")
        {
            // delete local motif in favor of default
            pm.clearPref("motif.current");
            e.motif = pm.prefs["motif.current"];
        }
        else if (e.motif.search(/^(file|https?|ftp):/i) != -1)
        {
            // specific css file
            pm.prefs["motif.current"] = e.motif;
        }
        else
        {
            // motif alias
            var prefName = "motif." + e.motif;
            if (client.prefManager.isKnownPref(prefName))
            {
                e.motif = client.prefManager.prefs[prefName];
            }
            else
            {
                display(getMsg(MSG_ERR_UNKNOWN_MOTIF, e.motif), MT_ERROR);
                return;
            }

            pm.prefs["motif.current"] = e.motif;
        }

    }

    display (getMsg(msg, pm.prefs["motif.current"]));
}

function cmdList(e)
{
    if (!e.channelName)
    {
        e.channelName = "";
        var c = e.server.channelCount;
        if ((c > client.SAFE_LIST_COUNT) && !("listWarned" in e.network))
        {
            client.munger.getRule(".inline-buttons").enabled = true;
            display(getMsg(MSG_LIST_CHANCOUNT, [c, "list"]), MT_WARN);
            client.munger.getRule(".inline-buttons").enabled = false;
            e.network.listWarned = true;
            return;
        }
    }

    e.network.list(e.channelName);
}

function cmdListPlugins(e)
{
    function listPlugin(plugin, i)
    {
        var enabled;
        if ((plugin.API > 0) || ("disablePlugin" in plugin.scope))
            enabled = plugin.enabled;
        else
            enabled = MSG_ALWAYS;

        display(getMsg(MSG_FMT_PLUGIN1, [i, plugin.url]));
        display(getMsg(MSG_FMT_PLUGIN2,
                       [plugin.id, plugin.version, enabled, plugin.status]));
        display(getMsg(MSG_FMT_PLUGIN3, plugin.description));
    }

    if (e.plugin)
    {
        listPlugin(e.plugin, 0);
        return;
    }

    if (client.plugins.length > 0)
    {
        for (var i = 0; i < client.plugins.length; ++i)
            listPlugin(client.plugins[i], i);
    }
    else
    {
        display(MSG_NO_PLUGINS);
    }
}

function cmdRlist(e)
{
    try
    {
        var re = new RegExp(e.regexp, "i");
    }
    catch (ex)
    {
        display(MSG_ERR_INVALID_REGEX, MT_ERROR);
        return;
    }

    var c = e.server.channelCount;
    if ((c > client.SAFE_LIST_COUNT) && !("listWarned" in e.network))
    {
        client.munger.getRule(".inline-buttons").enabled = true;
        display(getMsg(MSG_LIST_CHANCOUNT, [c, "rlist " + e.regexp]), MT_WARN);
        client.munger.getRule(".inline-buttons").enabled = false;
        e.network.listWarned = true;
        return;
    }
    e.network.list(re);
}

function cmdReloadUI(e)
{
    if (!("getConnectionCount" in client) ||
        client.getConnectionCount() == 0)
    {
        window.location.href = window.location.href;
    }
}

function cmdQuery(e)
{
    // We'd rather *not* trigger the user.start event this time.
    blockEventSounds("user", "start");
    var user = openQueryTab(e.server, e.nickname);
    dispatch("set-current-view", { view: user });

    if (e.message)
        _sendMsgTo(e.message, "PRIVMSG", user);

    return user;
}

function cmdSay(e)
{
    if (!("say" in e.sourceObject))
    {
        display(getMsg(MSG_ERR_IMPROPER_VIEW, "say"), MT_ERROR);
        return;
    }

    _sendMsgTo(e.message, "PRIVMSG", e.sourceObject)
}

function cmdMsg(e)
{
    var target = e.server.addTarget(e.nickname);
    _sendMsgTo(e.message, "PRIVMSG", target, e.sourceObject);
}

function _sendMsgTo(message, msgType, target, displayObj)
{
    if (!displayObj)
        displayObj = target;

    var msg = filterOutput(message, msgType, target);

    var o = getObjectDetails(target);
    var lines = o.server ? o.server.splitLinesForSending(msg) : [msg];

    for (var i = 0; i < lines.length; i++)
    {
        msg = lines[i];
        client.munger.getRule(".mailto").enabled = client.prefs["munger.mailto"];
        displayObj.display(msg, msgType, "ME!", target);
        client.munger.getRule(".mailto").enabled = false;
        if (msgType == "PRIVMSG")
            target.say(msg);
        else if (msgType == "NOTICE")
            target.notice(msg);
        else if (msgType == "ACTION")
            target.act(msg);
    }
}

function cmdNick(e)
{
    if (!e.nickname)
    {
        var curNick;
        if (e.server && e.server.isConnected)
            curNick = e.server.me.unicodeName;
        else if (e.network)
            curNick = e.network.prefs["nickname"];
        else
            curNick = client.prefs["nickname"];

        e.nickname = prompt(MSG_NICK_PROMPT, curNick);
        if (e.nickname == null)
            return;
        e.nickname = e.nickname.replace(/ /g, "_");
    }

    if (e.server && e.server.isConnected)
        e.server.changeNick(e.nickname);

    if (e.network)
    {
        /* We want to save in all non-online cases, including NET_CONNECTING,
         * as we will only get a NICK reply if we are completely connected.
         */
        if (e.network.state == NET_ONLINE)
        {
            e.network.pendingNickChange = e.nickname;
        }
        else
        {
            e.network.prefs["nickname"] = e.nickname;
            e.network.preferredNick = e.nickname;
        }
    }
    else
    {
        client.prefs["nickname"] = e.nickname;
        updateTitle(client);
    }
}

function cmdNotice(e)
{
    var target = e.server.addTarget(e.nickname);
    _sendMsgTo(e.message, "NOTICE", target, e.sourceObject);
}

function cmdQuote(e)
{
    /* Check we are connected, or at least pretending to be connected, so this
     * can actually send something. The only thing that's allowed to send
     * before the 001 is PASS, so if the command is not that and the net is not
     * online, we stop too.
     */
    if ((e.network.state != NET_ONLINE) &&
        (!e.server.isConnected || !e.ircCommand.match(/^\s*PASS/i)))
    {
        feedback(e, MSG_ERR_NOT_CONNECTED);
        return;
    }
    e.server.sendData(fromUnicode(e.ircCommand) + "\n", e.sourceObject);
}

function cmdEval(e)
{
    var sourceObject = e.sourceObject;

    try
    {
        sourceObject.doEval = function (__s) { return eval(__s); }
        if (e.command.name == "eval")
            sourceObject.display(e.expression, MT_EVALIN);
        var rv = String(sourceObject.doEval (e.expression));
        if (e.command.name == "eval")
            sourceObject.display(rv, MT_EVALOUT);

    }
    catch (ex)
    {
        sourceObject.display(String(ex), MT_ERROR);
    }
}

function cmdFocusInput(e)
{
    const WWATCHER_CTRID = "@mozilla.org/embedcomp/window-watcher;1";
    const nsIWindowWatcher = Components.interfaces.nsIWindowWatcher;

    var watcher =
        Components.classes[WWATCHER_CTRID].getService(nsIWindowWatcher);
    if (watcher.activeWindow == window)
        client.input.focus();
    else
        document.commandDispatcher.focusedElement = client.input;
}

function cmdGotoStartup(e)
{
    openStartupURLs();
}

function cmdGotoURL(e)
{
    const EXT_PROTO_SVC = "@mozilla.org/uriloader/external-protocol-service;1";

    if (/^ircs?:/.test(e.url))
    {
        gotoIRCURL(e.url);
        return;
    }

    if (/^x-irc-dcc-(chat|file):[0-9a-fA-F]+$/.test(e.url))
    {
        var view = client.dcc.findByID(e.url.substr(15));
        if (view)
            dispatch("set-current-view", {view: view});
        return;
    }

    if (/^x-cz-command:/.test(e.url))
    {
        var ary = e.url.match(/^x-cz-command:(.*)$/i);
        // Do the escaping dance:
        var commandStr = decodeURI(ary[1]).quote();
        var eventStr = uneval({isInteractive: true, source: e.source});
        var jsStr = "void(view.dispatch(" + commandStr + "," + eventStr + "))";
        var jsURI = "javascript:" + encodeURI(jsStr);
        getContentWindow(e.sourceObject.frame).location.href = jsURI;
        return;
    }

    try
    {
        var uri = client.iosvc.newURI(e.url, "UTF-8", null);
    }
    catch (ex)
    {
        // Given "goto-url faq bar", expand to "http://.../faq/#bar"
        var localeURLKey = "msg.localeurl." + e.url;
        var hash = (("anchor" in e) && e.anchor) ? "#" + e.anchor : "";
        if (localeURLKey != getMsg(localeURLKey))
            dispatch(e.command.name + " " + getMsg(localeURLKey) + hash);
        else
            display(getMsg(MSG_ERR_INVALID_URL, e.url), MT_ERROR);

        dispatch("focus-input");
        return;
    }

    if ((e.command.name == "goto-url-external") || (client.host == "XULRunner"))
    {
        const extProtoSvc = getService(EXT_PROTO_SVC,
                                       "nsIExternalProtocolService");
        extProtoSvc.loadUrl(uri);
        dispatch("focus-input");
        return;
    }

    if (client.host == "Songbird")
        var browserWin = getWindowByType("Songbird:Main");
    else
        browserWin = getWindowByType("navigator:browser");

    var location = browserWin ? browserWin.content.document.location : null;
    var action = e.command.name;

    // We don't want to replace ChatZilla running in a tab.
    if ((action == "goto-url-newwin") ||
        ((action == "goto-url") && browserWin &&
         (location.href.indexOf("chrome://chatzilla/content/") == 0)))
    {
        try
        {
            if (typeof openUILinkIn == "function")
                openUILinkIn(e.url, "window");
            else
                openTopWin(e.url);
        }
        catch (ex)
        {
            dd(formatException(ex));
        }
        dispatch("focus-input");
        return;
    }

    if (client.prefs["link.focus"])
    {
        try
        {
            browserWin.focus();
        }
        catch (ex)
        {
            dd(formatException(ex));
        }
    }

    if (action == "goto-url-newtab")
    {
        try
        {
            if (typeof browserWin.openUILinkIn == "function")
                browserWin.openUILinkIn(e.url, "tab");
            else if (client.host == "Mozilla")
                browserWin.openNewTabWith(e.url, false, false);
            else
                browserWin.openNewTabWith(e.url, null, null, null, null);
        }
        catch (ex)
        {
            dd(formatException(ex));
        }
        dispatch("focus-input");
        return;
    }

    try
    {
        location.href = e.url;
    }
    catch (ex)
    {
        dd(formatException(ex));
    }
    dispatch("focus-input");
}

function cmdCTCP(e)
{
    var obj = e.server.addTarget(e.target);
    obj.ctcp(e.code, e.params);
}

function cmdJoin(e)
{
    /* This check makes sure we only check if the *user* entered anything, and
     * ignore any contextual information, like the channel the command was
     * run on.
     */
    if ((!e.hasOwnProperty("channelName") || !e.channelName) &&
        !e.channelToJoin)
    {
        if (e.network.joinDialog)
            return e.network.joinDialog.focus();

        window.openDialog("chrome://chatzilla/content/channels.xul", "",
                          "resizable=yes",
                          { client: client, network: e.network,
                            opener: window });
        return null;
    }

    var chan;
    if (!e.channelToJoin)
    {
        if (!("charset" in e))
        {
            e.charset = null;
        }
        else if (e.charset && !checkCharset(e.charset))
        {
            display (getMsg(MSG_ERR_INVALID_CHARSET, e.charset), MT_ERROR);
            return null;
        }

        if (e.channelName.search(",") != -1)
        {
            // We can join multiple channels! Woo!
            var chans = e.channelName.split(",");
            var keys = [];
            if (e.key)
                keys = e.key.split(",");
            for (var c in chans)
            {
                chan = dispatch("join", { charset: e.charset,
                                          channelName: chans[c],
                                          key: keys.shift() });
            }
            return chan;
        }

        if ((arrayIndexOf(["#", "&", "+", "!"], e.channelName[0]) == -1) &&
            (arrayIndexOf(e.server.channelTypes, e.channelName[0]) == -1))
        {
            e.channelName = e.server.channelTypes[0] + e.channelName;
        }

        var charset = e.charset ? e.charset : e.network.prefs["charset"];
        chan = e.server.addChannel(e.channelName, charset);
        if (e.charset)
            chan.prefs["charset"] = e.charset;
    }
    else
    {
        chan = e.channelToJoin;
    }

    chan.join(e.key);

    /* !-channels are "safe" channels, and get a server-generated prefix. For
     * this reason, we shouldn't do anything client-side until the server
     * replies (since the reply will have the appropriate prefix). */
    if (chan.unicodeName[0] != "!")
    {
        dispatch("create-tab-for-view", { view: chan });
        dispatch("set-current-view", { view: chan });
    }

    return chan;
}

function cmdLeave(e)
{
    if (!e.server)
    {
        display(MSG_ERR_IMPROPER_VIEW, MT_ERROR);
        return;
    }

    if (e.hasOwnProperty("channelName"))
    {
        if (arrayIndexOf(e.server.channelTypes, e.channelName[0]) == -1)
        {
            // No valid prefix character. Check they really meant a channel...
            var valid = false;
            for (var i = 0; i < e.server.channelTypes.length; i++)
            {
                // Hmm, not ideal...
                var chan = e.server.getChannel(e.server.channelTypes[i] +
                                               e.channelName);
                if (chan)
                {
                    // Yes! They just missed that single character.
                    e.channel = chan;
                    valid = true;
                    break;
                }
            }

            // We can only let them get away here if we've got a channel.
            if (!valid)
            {
                if (e.channel)
                {
                    /* Their channel name was invalid, but we have a channel
                     * view, so we'll assume they did "/leave part msg".
                     */
                    e.reason = e.channelName + (e.reason ? " " + e.reason : "");
                }
                else
                {
                    display(getMsg(MSG_ERR_UNKNOWN_CHANNEL, e.channelName),
                            MT_ERROR);
                    return;
                }
            }
        }
        else
        {
            // Valid prefix, so get real channel (if it exists...).
            e.channel = e.server.getChannel(e.channelName);
            if (!e.channel)
            {
                display(getMsg(MSG_ERR_UNKNOWN_CHANNEL, e.channelName),
                        MT_ERROR);
                return;
            }
        }
    }

    if (!("deleteWhenDone" in e))
        e.deleteWhenDone = client.prefs["deleteOnPart"];

    /* If it's not active, we're not actually in it, even though the view is
     * still here.
     */
    if (e.channel.active)
    {
        e.channel.deleteWhenDone = e.deleteWhenDone;

        if (!e.reason)
            e.reason = "";

        e.server.sendData("PART " + e.channel.encodedName + " :" +
                          fromUnicode(e.reason, e.channel) + "\n");
    }
    else
    {
        /* We can leave the channel when not active
         * this will close the view and prevent rejoin after a reconnect
         */
        if (e.channel.joined)
            e.channel.joined = false;

        if (e.deleteWhenDone)
            e.channel.dispatch("delete-view");
    }
}

function cmdReload(e)
{
    dispatch("load " + e.plugin.url);
}

function cmdLoad(e)
{
    var ex;
    var plugin;

    function removeOldPlugin(url)
    {
        var oldPlugin;

        var i = getPluginIndexByURL(url);
        if (i == -1)
            return -1;

        oldPlugin = client.plugins[i];
        if (oldPlugin.enabled)
        {
            if (oldPlugin.API > 0)
            {
                if (!oldPlugin.disable())
                {
                    display(getMsg(MSG_CANT_DISABLE, oldPlugin.id));
                    display(getMsg(MSG_ERR_SCRIPTLOAD, e.url));
                    return null;
                }
                client.prefManager.removeObserver(oldPlugin.prefManager);
                oldPlugin.prefManager.destroy();
            }
            else if ("disablePlugin" in oldPlugin.scope)
            {
                oldPlugin.scope.disablePlugin();
            }
            else
            {
                display(getMsg(MSG_CANT_DISABLE, oldPlugin.id));
                display(getMsg(MSG_ERR_SCRIPTLOAD, e.url));
                return null;
            }
            display(getMsg(MSG_PLUGIN_DISABLED, oldPlugin.id));
        }

        return i;
    }

    if (!e.scope)
        e.scope = new Object();

    if (!("plugin" in e.scope))
    {
        e.scope.plugin = { url: e.url, id: MSG_UNKNOWN, version: -1,
                           description: "", status: MSG_LOADING, enabled: false,
                           PluginAPI: 1, cwd: e.url.match(/^(.*?)[^\/]+$/)[1]};

    }

    plugin = e.scope.plugin;
    plugin.scope = e.scope;

    try
    {
        var rvStr;
        var rv = rvStr = client.load(e.url, e.scope);
        var index = removeOldPlugin(e.url);

        if (index == null)
            return null;

        if ("init" in plugin)
        {
            // Sanity check plugin's methods and properties:
            var okay = false;
            if (!("id" in plugin) || (plugin.id == MSG_UNKNOWN))
                display(getMsg(MSG_ERR_PLUGINAPI_NOID, e.url));
            else if (!(plugin.id.match(/^[A-Za-z0-9-_]+$/)))
                display(getMsg(MSG_ERR_PLUGINAPI_FAULTYID, e.url));
            else if (!("enable" in plugin))
                display(getMsg(MSG_ERR_PLUGINAPI_NOENABLE, e.url));
            else if (!("disable" in plugin))
                display(getMsg(MSG_ERR_PLUGINAPI_NODISABLE, e.url));
            else
                okay = true;

            if (!okay)
            {
                display (getMsg(MSG_ERR_SCRIPTLOAD, e.url));
                return null;
            }

            plugin.API = 1;
            plugin.prefary = [["enabled", true, "hidden"]];
            rv = rvStr = plugin.init(e.scope);

            var branch = "extensions.irc.plugins." + plugin.id + ".";
            var prefManager = new PrefManager(branch, client.defaultBundle);
            prefManager.addPrefs(plugin.prefary);
            plugin.prefManager = prefManager;
            plugin.prefs = prefManager.prefs;
            if ("onPrefChanged" in plugin)
                prefManager.addObserver(plugin);
            client.prefManager.addObserver(prefManager);
            client.prefManagers.push(prefManager);
        }
        else
        {
            plugin.API = 0;
            if ("initPlugin" in e.scope)
                rv = rvStr = e.scope.initPlugin(e.scope);
            plugin.enabled = true;
        }
        plugin.status = "loaded";

        if (typeof rv == "function")
            rvStr = "function";

        if (index != -1)
            client.plugins[index] = plugin;
        else
            index = client.plugins.push(plugin) - 1;

        feedback(e, getMsg(MSG_SUBSCRIPT_LOADED, [e.url, rvStr]), MT_INFO);

        if ((plugin.API > 0) && plugin.prefs["enabled"])
            dispatch("enable-plugin " + index);
        return {rv: rv};
    }
    catch (ex)
    {
        display (getMsg(MSG_ERR_SCRIPTLOAD, e.url));
        display (formatException(ex), MT_ERROR);
    }

    return null;
}

function cmdWho(e)
{
    e.network.pendingWhoReply = true;
    e.server.LIGHTWEIGHT_WHO = false;
    e.server.who(e.rest);
}

function cmdWhoIs(e)
{
    if (!isinstance(e.network.whoisList, Object))
        e.network.whoisList = {};

    for (var i = 0; i < e.nicknameList.length; i++)
    {
        if ((i < e.nicknameList.length - 1) &&
            (e.server.toLowerCase(e.nicknameList[i]) ==
             e.server.toLowerCase(e.nicknameList[i + 1])))
        {
            e.server.whois(e.nicknameList[i] + " " + e.nicknameList[i]);
            i++;
        }
        else
        {
            e.server.whois(e.nicknameList[i]);
        }
        e.network.whoisList[e.server.toLowerCase(e.nicknameList[i])] = null;
    }
}

function cmdWhoIsIdle(e)
{
    for (var i = 0; i < e.nicknameList.length; i++)
        e.server.whois(e.nicknameList[i] + " " + e.nicknameList[i]);
}

function cmdWhoWas(e)
{
    e.server.whowas(e.nickname, e.limit);
}

function cmdTopic(e)
{
    if (!e.newTopic)
        e.server.sendData("TOPIC " + e.channel.encodedName + "\n");
    else
        e.channel.setTopic(e.newTopic);
}

function cmdAbout(e)
{
    if (e.source)
    {
        if ("aboutDialog" in client)
            return client.aboutDialog.focus();

        window.openDialog("chrome://chatzilla/content/about/about.xul", "",
                          "chrome,dialog", { client: client });
    }
    else
    {
        var ver = CIRCServer.prototype.VERSION_RPLY;
        client.munger.getRule(".inline-buttons").enabled = true;
        display(getMsg(MSG_ABOUT_VERSION, [ver, "about"]));
        display(MSG_ABOUT_HOMEPAGE);
        client.munger.getRule(".inline-buttons").enabled = false;
    }
}

function cmdAlias(e)
{
    var aliasDefs = client.prefs["aliases"];
    function getAlias(commandName)
    {
        for (var i = 0; i < aliasDefs.length; ++i)
        {
            var ary = aliasDefs[i].match(/^(.*?)\s*=\s*(.*)$/);
            if (ary[1] == commandName)
                return [i, ary[2]];
        }

        return null;
    };

    var ary;

    if ((e.commandList == "-") || (e.command.name == "unalias"))
    {
        /* remove alias */
        ary = getAlias(e.aliasName);
        if (!ary)
        {
            display(getMsg(MSG_NOT_AN_ALIAS, e.aliasName), MT_ERROR);
            return;
        }

        // Command Manager is updated when the preference changes.
        arrayRemoveAt(aliasDefs, ary[0]);
        aliasDefs.update();

        feedback(e, getMsg(MSG_ALIAS_REMOVED, e.aliasName));
    }
    else if (e.aliasName && e.commandList)
    {
        /* add/change alias */
        ary = getAlias(e.aliasName);
        if (ary)
            aliasDefs[ary[0]] = e.aliasName + " = " + e.commandList;
        else
            aliasDefs.push(e.aliasName + " = " + e.commandList);

        // Command Manager is updated when the preference changes.
        aliasDefs.update();

        feedback(e, getMsg(MSG_ALIAS_CREATED, [e.aliasName, e.commandList]));
    }
    else if (e.aliasName)
    {
        /* display alias */
        ary = getAlias(e.aliasName);
        if (!ary)
            display(getMsg(MSG_NOT_AN_ALIAS, e.aliasName), MT_ERROR);
        else
            display(getMsg(MSG_FMT_ALIAS, [e.aliasName, ary[1]]));
    }
    else
    {
        /* list aliases */
        if (aliasDefs.length == 0)
        {
            display(MSG_NO_ALIASES);
        }
        else
        {
            for (var i = 0; i < aliasDefs.length; ++i)
            {
                ary = aliasDefs[i].match(/^(.*?)\s*=\s*(.*)$/);
                if (ary)
                    display(getMsg(MSG_FMT_ALIAS, [ary[1], ary[2]]));
                else
                    display(getMsg(MSG_ERR_BADALIAS, aliasDefs[i]));
            }
        }
    }
}

function cmdAway(e)
{
    function sendToAllNetworks(command, reason)
    {
        for (var n in client.networks)
        {
            var net = client.networks[n];
            if (net.primServ && (net.state == NET_ONLINE))
            {
                // If we can override the network's away state, or they are
                // already idly-away, or they're not away to begin with:
                if (overrideAway || net.isIdleAway || !net.prefs["away"])
                {
                    net.dispatch(command, {reason: reason });
                    net.isIdleAway = (e.command.name == "idle-away");
                }
            }
        }
    };

    // Idle away shouldn't override away state set by the user.
    var overrideAway = (e.command.name.indexOf("idle") != 0);

    if ((e.command.name == "away") || (e.command.name == "custom-away") ||
        (e.command.name == "idle-away"))
    {
        /* going away */
        if (e.command.name == "custom-away")
        {
            e.reason = prompt(MSG_AWAY_PROMPT);
            // prompt() returns null for cancelling, a string otherwise (even if empty).
            if (e.reason == null)
                return;
        }
        // No parameter, or user entered nothing in the prompt.
        if (!e.reason)
            e.reason = MSG_AWAY_DEFAULT;

        // Update away list (remove from current location).
        for (var i = 0; i < client.awayMsgs.length; i++)
        {
            if (client.awayMsgs[i].message == e.reason)
            {
                client.awayMsgs.splice(i, 1);
                break;
            }
        }
        // Always put new item at start.
        var newMsg = { message: e.reason };
        client.awayMsgs.unshift(newMsg);
        // Make sure we've not exceeded the limit set.
        if (client.awayMsgs.length > client.awayMsgCount)
            client.awayMsgs.splice(client.awayMsgCount);
        // And now, to save the list!
        try
        {
            var awayFile = new nsLocalFile(client.prefs["profilePath"]);
            awayFile.append("awayMsgs.txt");
            var awayLoader = new TextSerializer(awayFile);
            if (awayLoader.open(">"))
            {
                awayLoader.serialize(client.awayMsgs);
                awayLoader.close();
            }
        }
        catch(ex)
        {
            display(getMsg(MSG_ERR_AWAY_SAVE, formatException(ex)), MT_ERROR);
        }

        // Actually do away stuff, is this on a specific network?
        if (e.server)
        {
            var normalNick = e.network.prefs["nickname"];
            var awayNick = e.network.prefs["awayNick"];
            if (e.network.state == NET_ONLINE)
            {
                // Postulate that if normal nick and away nick are the same,
                // user doesn't want to change nicks:
                if (awayNick && (normalNick != awayNick))
                    e.server.changeNick(awayNick);
                e.server.sendData("AWAY :" + fromUnicode(e.reason, e.network) +
                                  "\n");
            }
            if (awayNick && (normalNick != awayNick))
                e.network.preferredNick = awayNick;
            e.network.prefs["away"] = e.reason;
        }
        else
        {
            // Client view, do command for all networks.
            sendToAllNetworks("away", e.reason);
            client.prefs["away"] = e.reason;

            // Don't tell people how to get back if they're idle:
            var idleMsgParams = [e.reason, client.prefs["awayIdleTime"]];
            if (e.command.name == "idle-away")
                var msg = getMsg(MSG_IDLE_AWAY_ON, idleMsgParams);
            else
                msg = getMsg(MSG_AWAY_ON, e.reason);

            // Display on the *client* tab, or on the current tab iff
            // there's nowhere else they'll hear about it:
            if (("frame" in client) && client.frame)
                client.display(msg);
            else if (!client.getConnectedNetworks())
                display(msg);
        }
    }
    else
    {
        /* returning */
        if (e.server)
        {
            if (e.network.state == NET_ONLINE)
            {
                var curNick = e.server.me.unicodeName;
                var awayNick = e.network.prefs["awayNick"];
                if (awayNick && (curNick == awayNick))
                    e.server.changeNick(e.network.prefs["nickname"]);
                e.server.sendData("AWAY\n");
            }
            // Go back to old nick, even if not connected:
            if (awayNick && (curNick == awayNick))
                e.network.preferredNick = e.network.prefs["nickname"];
            e.network.prefs["away"] = "";
        }
        else
        {
            client.prefs["away"] = "";
            // Client view, do command for all networks.
            sendToAllNetworks("back");
            if (("frame" in client) && client.frame)
                client.display(MSG_AWAY_OFF);
            else if (!client.getConnectedNetworks())
                display(MSG_AWAY_OFF);
        }
    }
}

function cmdCEIP(e)
{
    const INST_URL = "chrome://chatzilla/content/ceip/config.xul";
    const INST_OPT = "chrome,resizable=no,dialog=no";

    if (e.state != null)
    {
        // Stop us from ever asking the user about this now.
        client.prefs["instrumentation.ceip"] = true;
        // We have a state, so set all options accordingly.
        var prefs = client.prefManager.listPrefs("ceip.");
        for (var i = 0; i < prefs.length; i++)
        {
            if (typeof client.prefs[prefs[i]] == "boolean")
                client.prefs[prefs[i]] = e.state;
        }
        if (e.state)
            feedback(e, MSG_CEIP_ENABLED);
        else
            feedback(e, MSG_CEIP_DISABLED);
    }
    else if (client.ceip.dialog)
    {
        // No state, so show the existing dialog.
        client.ceip.dialog.focus();
    }
    else
    {
        // No existing dialog either, create the dialog.
        window.openDialog(INST_URL, "", INST_OPT, window);
    }
}

function cmdOpenAtStartup(e)
{
    var origURL = e.sourceObject.getURL();
    var url = makeCanonicalIRCURL(origURL);
    var list = client.prefs["initialURLs"];
    ensureCachedCanonicalURLs(list);
    var index = arrayIndexOf(list.canonicalURLs, url);

    if (e.toggle == null)
    {
        if (index == -1)
            display(getMsg(MSG_STARTUP_NOTFOUND, url));
        else
            display(getMsg(MSG_STARTUP_EXISTS, url));
        return;
    }

    e.toggle = getToggle(e.toggle, (index != -1));

    if (e.toggle)
    {
        // yes, please open at startup
        if (index == -1)
        {
            list.push(origURL);
            list.update();
            display(getMsg(MSG_STARTUP_ADDED, url));
        }
        else
        {
            display(getMsg(MSG_STARTUP_EXISTS, url));
        }
    }
    else
    {
        // no, please don't open at startup
        if (index != -1)
        {
            arrayRemoveAt(list, index);
            list.update();
            display(getMsg(MSG_STARTUP_REMOVED, url));
        }
        else
        {
            display(getMsg(MSG_STARTUP_NOTFOUND, url));
        }
    }
}

function cmdOper(e)
{
    // Password is optional, if it is not given, we use a safe prompt.
    if (!e.password)
        e.password = promptPassword(MSG_NEED_OPER_PASSWORD, "");

    if (!e.password)
        return;

    e.server.sendData("OPER " + fromUnicode(e.opername, e.server) + " " +
                      fromUnicode(e.password, e.server) + "\n");
}

function cmdPing (e)
{
    e.network.dispatch("ctcp", { target: e.nickname, code: "PING" });
}

function cmdPref (e)
{
    var msg;
    var pm;

    if (e.command.name == "network-pref")
    {
        pm = e.network.prefManager;
        msg = MSG_FMT_NETPREF;
    }
    else if (e.command.name == "channel-pref")
    {
        pm = e.channel.prefManager;
        msg = MSG_FMT_CHANPREF;
    }
    else if (e.command.name == "plugin-pref")
    {
        pm = e.plugin.prefManager;
        msg = MSG_FMT_PLUGINPREF;
    }
    else if (e.command.name == "user-pref")
    {
        pm = e.user.prefManager;
        msg = MSG_FMT_USERPREF;
    }
    else
    {
        pm = client.prefManager;
        msg = MSG_FMT_PREF;
    }

    var ary = pm.listPrefs(e.prefName);
    if (ary.length == 0)
    {
        display (getMsg(MSG_ERR_UNKNOWN_PREF, [e.prefName]),
                 MT_ERROR);
        return false;
    }

    if (e.prefValue == "-")
        e.deletePref = true;

    if (e.deletePref)
    {
        if (!(e.prefName in pm.prefRecords))
        {
            display(getMsg(MSG_ERR_UNKNOWN_PREF, [e.prefName]), MT_ERROR);
            return false;
        }

        try
        {
            pm.clearPref(e.prefName);
        }
        catch (ex)
        {
            // ignore exception generated by clear of nonexistant pref
            if (!("result" in ex) ||
                ex.result != Components.results.NS_ERROR_UNEXPECTED)
            {
                throw ex;
            }
        }

        var prefValue = pm.prefs[e.prefName];
        feedback (e, getMsg(msg, [e.prefName, pm.prefs[e.prefName]]));
        return true;
    }

    if (e.prefValue)
    {
        if (!(e.prefName in pm.prefRecords))
        {
            display(getMsg(MSG_ERR_UNKNOWN_PREF, [e.prefName]), MT_ERROR);
            return false;
        }

        var r = pm.prefRecords[e.prefName];
        var def, type;

        if (typeof r.defaultValue == "function")
            def = r.defaultValue(e.prefName);
        else
            def = r.defaultValue;

        type = typeof def;

        switch (type)
        {
            case "number":
                e.prefValue = Number(e.prefValue);
                break;
            case "boolean":
                e.prefValue = (e.prefValue.toLowerCase() == "true");
                break;
            case "string":
                break;
            default:
                if (isinstance(e.prefValue, Array))
                    e.prefValue = e.prefValue.join("; ");
                if (isinstance(def, Array))
                    e.prefValue = pm.stringToArray(e.prefValue);
                break;
        }

        pm.prefs[e.prefName] = e.prefValue;
        if (isinstance(e.prefValue, Array))
            e.prefValue = e.prefValue.join("; ");
        feedback (e, getMsg(msg, [e.prefName, e.prefValue]));
    }
    else
    {
        for (var i = 0; i < ary.length; ++i)
        {
            var value;
            if (isinstance(pm.prefs[ary[i]], Array))
                value = pm.prefs[ary[i]].join("; ");
            else
                value = pm.prefs[ary[i]];

            feedback(e, getMsg(msg, [ary[i], value]));
        }
    }

    return true;
}

function cmdPrint(e)
{
    if (("frame" in e.sourceObject) && e.sourceObject.frame &&
        getContentWindow(e.sourceObject.frame))
    {
        getContentWindow(e.sourceObject.frame).print();
    }
    else
    {
        display(MSG_ERR_UNABLE_TO_PRINT);
    }
}

function cmdVersion(e)
{
    if (e.nickname)
        e.network.dispatch("ctcp", { target: e.nickname, code: "VERSION"});
    else
        e.server.sendData(fromUnicode("VERSION") + "\n", e.sourceObject);
}

function cmdEcho(e)
{
    client.munger.getRule(".mailto").enabled = client.prefs["munger.mailto"];
    display(e.message);
    client.munger.getRule(".mailto").enabled = false;
}

function cmdInvite(e)
{
    var channel;

    if (e.channelName)
    {
        channel = e.server.getChannel(e.channelName);
        if (!channel)
        {
            display(getMsg(MSG_ERR_UNKNOWN_CHANNEL, e.channelName), MT_ERROR);
            return;
        }
    }
    else if (e.channel)
    {
        channel = e.channel;
    }
    else
    {
        display(getMsg(MSG_ERR_NO_CHANNEL, e.command.name), MT_ERROR);
        return;
    }

    channel.invite(e.nickname);
}

function cmdKick(e)
{
    if (e.userList)
    {
        if (e.command.name == "kick-ban")
        {
            e.sourceObject.dispatch("ban", { userList: e.userList,
                                             canonNickList: e.canonNickList,
                                             user: e.user,
                                             nickname: e.user.encodedName });
        }

        /* Note that we always do /kick below; the /ban is covered above.
         * Also note that we are required to pass the nickname, to satisfy
         * the dispatching of the command (which is defined with a required
         * <nickname> parameter). It's not required for /ban, above, but it
         * seems prudent to include it anyway.
         */
        for (var i = 0; i < e.userList.length; i++)
        {
            var e2 = { user: e.userList[i],
                       nickname: e.userList[i].encodedName };
            e.sourceObject.dispatch("kick", e2);
        }
        return;
    }

    if (!e.user)
        e.user = e.channel.getUser(e.nickname);

    if (!e.user)
    {
        display(getMsg(MSG_ERR_UNKNOWN_USER, e.nickname), MT_ERROR);
        return;
    }

    if (e.command.name == "kick-ban")
        e.sourceObject.dispatch("ban", { nickname: e.user.encodedName });

    e.user.kick(e.reason);
}

function cmdKnock(e)
{
    var rest = (e.reason ? " :" + fromUnicode(e.reason, e.server) : "") + "\n";
    e.server.sendData("KNOCK " + fromUnicode(e.channelName, e.server) + rest);
}

function cmdClient(e)
{
    if (!("messages" in client))
    {
        client.display(MSG_WELCOME, "HELLO");
        dispatch("set-current-view", { view: client });
        dispatch("help", { hello: true });
        dispatch("networks");
    }
    else
    {
        dispatch("set-current-view", { view: client });
    }
}

function cmdNotify(e)
{
    var net = e.network;

    if (!e.nickname)
    {
        if (net.prefs["notifyList"].length > 0)
        {
            /* delete the lists and force a ISON check, this will
             * print the current online/offline status when the server
             * responds */
            delete net.onList;
            delete net.offList;
            onNotifyTimeout();
        }
        else
        {
            display(MSG_NO_NOTIFY_LIST);
        }
    }
    else
    {
        var adds = new Array();
        var subs = new Array();

        for (var i in e.nicknameList)
        {
            var nickname = e.server.toLowerCase(e.nicknameList[i]);
            var list = net.prefs["notifyList"];
            list = e.server.toLowerCase(list.join(";")).split(";");
            var idx = arrayIndexOf (list, nickname);
            if (idx == -1)
            {
                net.prefs["notifyList"].push (nickname);
                adds.push(nickname);
            }
            else
            {
                arrayRemoveAt (net.prefs["notifyList"], idx);
                subs.push(nickname);
            }
        }
        net.prefs["notifyList"].update();

        var msgname;

        if (adds.length > 0)
        {
            msgname = (adds.length == 1) ? MSG_NOTIFY_ADDONE :
                                           MSG_NOTIFY_ADDSOME;
            display(getMsg(msgname, arraySpeak(adds)));
        }

        if (subs.length > 0)
        {
            msgname = (subs.length == 1) ? MSG_NOTIFY_DELONE :
                                           MSG_NOTIFY_DELSOME;
            display(getMsg(msgname, arraySpeak(subs)));
        }

        delete net.onList;
        delete net.offList;
        onNotifyTimeout();
    }
}

function cmdStalk(e)
{
    var list = client.prefs["stalkWords"];

    if (!e.text)
    {
        if (list.length == 0)
            display(MSG_NO_STALK_LIST);
        else
        {
            function alphabetize(a, b)
            {
                var A = a.toLowerCase();
                var B = b.toLowerCase();
                if (A < B) return -1;
                if (B < A) return 1;
                return 0;
            }

            list.sort(alphabetize);
            display(getMsg(MSG_STALK_LIST, list.join(MSG_COMMASP)));
        }
        return;
    }

    var notStalkingWord = true;
    var loweredText = e.text.toLowerCase();

    for (var i = 0; i < list.length; ++i)
        if (list[i].toLowerCase() == loweredText)
            notStalkingWord = false;

    if (notStalkingWord)
    {
        list.push(e.text);
        list.update();
        display(getMsg(MSG_STALK_ADD, e.text));
    }
    else
    {
        display(getMsg(MSG_STALKING_ALREADY, e.text));
    }
}

function cmdUnstalk(e)
{
    e.text = e.text.toLowerCase();
    var list = client.prefs["stalkWords"];

    for (var i = 0; i < list.length; ++i)
    {
        if (list[i].toLowerCase() == e.text)
        {
            list.splice(i, 1);
            list.update();
            display(getMsg(MSG_STALK_DEL, e.text));
            return;
        }
    }

    display(getMsg(MSG_ERR_UNKNOWN_STALK, e.text), MT_ERROR);
}

function cmdUser(e)
{
    dispatch("name", {username: e.username, network: e.network,
                      isInteractive: e.isInteractive});
    dispatch("desc", {description: e.description, network: e.network,
                      isInteractive: e.isInteractive});
}

function cmdUserhost(e)
{
    var nickList = combineNicks(e.nicknameList, 5);
    for (var i = 0; i < nickList.length; i++)
    {
        e.server.userhost(nickList[i]);
    }
}

function cmdUserip(e)
{
    // Check if the server supports this
    if (!e.server.servCmds.userip)
    {
        display(getMsg(MSG_ERR_UNSUPPORTED_COMMAND, "USERIP"), MT_ERROR);
        return;
    }
    var nickList = combineNicks(e.nicknameList, 5);
    for (var i = 0; i < nickList.length; i++)
        e.server.userip(nickList[i]);
}

function cmdUsermode(e)
{
    if (e.newMode)
    {
        if (e.sourceObject.network)
            e.sourceObject.network.prefs["usermode"] = e.newMode;
        else
            client.prefs["usermode"] = e.newMode;
    }
    else
    {
        if (e.server && e.server.isConnected)
        {
            e.server.sendData("mode " + e.server.me.encodedName + "\n");
        }
        else
        {
            var prefs;

            if (e.network)
                prefs = e.network.prefs;
            else
                prefs = client.prefs;

            display(getMsg(MSG_USER_MODE,
                           [prefs["nickname"], prefs["usermode"]]),
                    MT_MODE);
        }
    }
}

function cmdLog(e)
{
    var view = e.sourceObject;

    if (e.state != null)
    {
        e.state = getToggle(e.state, view.prefs["log"])
        view.prefs["log"] = e.state;
    }
    else
    {
        if (view.prefs["log"])
            display(getMsg(MSG_LOGGING_ON, getLogPath(view)));
        else
            display(MSG_LOGGING_OFF);
    }
}

function cmdSave(e)
{
    var OutputProgressListener =
    {
        onStateChange: function(aWebProgress, aRequest, aStateFlags, aStatus)
        {
            // Use this to access onStateChange flags
            var requestSpec;
            try
            {
              var channel = aRequest.QueryInterface(nsIChannel);
              requestSpec = channel.URI.spec;
            }
            catch (ex) { }

            // Detect end of file saving of any file:
            if (aStateFlags & nsIWebProgressListener.STATE_STOP)
            {
                if (aStatus == kErrorBindingAborted)
                    aStatus = 0;

                // We abort saving for all errors except if image src file is
                // not found
                var abortSaving = (aStatus != 0 && aStatus != kFileNotFound);
                if (abortSaving)
                {
                    // Cancel saving
                    wbp.cancelSave();
                    display(getMsg(MSG_SAVE_ERR_FAILED, aMessage), MT_ERROR);
                    return;
                }

                if (aStateFlags & nsIWebProgressListener.STATE_IS_NETWORK
                    && wbp.currentState == nsIWBP.PERSIST_STATE_FINISHED)
                {
                    // Let the user know:
                    pm = [e.sourceObject.viewName, getURLSpecFromFile(file)];
                    display(getMsg(MSG_SAVE_SUCCESSFUL, pm), MT_INFO);
                }
                /* Check if we've finished. WebBrowserPersist screws up when we
                 * don't save additional files. Cope when saving html only or
                 * text.
                 */
                else if (!requestSpec && saveType > 0)
                {
                    if (wbp)
                        wbp.progressListener = null;
                    pm = [e.sourceObject.viewName, getURLSpecFromFile(file)];
                    display(getMsg(MSG_SAVE_SUCCESSFUL, pm), MT_INFO);
                }
            }
        },

        onProgressChange: function(aWebProgress, aRequest, aCurSelfProgress,
                                  aMaxSelfProgress, aCurTotalProgress,
                                  aMaxTotalProgress) {},
        onLocationChange: function(aWebProgress, aRequest, aLocation) {},
        onStatusChange: function(aWebProgress, aRequest, aStatus, aMessage) {},
        onSecurityChange: function(aWebProgress, aRequest, state) {},

        QueryInterface: function(aIID)
        {
            if (aIID.equals(Components.interfaces.nsIWebProgressListener)
                || aIID.equals(Components.interfaces.nsISupports)
                || aIID.equals(Components.interfaces.nsISupportsWeakReference))
            {
                return this;
            }

            throw Components.results.NS_NOINTERFACE;
        }
    };

    const kFileNotFound = 2152857618;
    const kErrorBindingAborted = 2152398850;

    const nsIWBP = Components.interfaces.nsIWebBrowserPersist;
    const nsIWebProgressListener = Components.interfaces.nsIWebProgressListener;
    const nsIChannel = Components.interfaces.nsIChannel;

    var wbp = newObject("@mozilla.org/embedding/browser/nsWebBrowserPersist;1",
                        nsIWBP);
    wbp.progressListener = OutputProgressListener;

    var file, saveType, saveFolder, docToBeSaved, title;
    var flags, fileType, charLimit;
    var dialogTitle, rv, pm;

    // We want proper descriptions and no "All Files" option.
    const TYPELIST = [[MSG_SAVE_COMPLETEVIEW,"*.htm;*.html"],
                      [MSG_SAVE_HTMLONLYVIEW,"*.htm;*.html"],
                      [MSG_SAVE_PLAINTEXTVIEW,"*.txt"], "$noAll"];
    // constants and variables for the wbp.saveDocument call
    var saveTypes =
    {
        complete: 0,
        htmlonly: 1,
        text: 2
    };

    if (!e.filename)
    {
        dialogTitle = getMsg(MSG_SAVE_DIALOGTITLE, e.sourceObject.viewName);
        rv = pickSaveAs(dialogTitle, TYPELIST, e.sourceObject.viewName +
                        ".html");
        if (!rv.ok)
            return;
        saveType = rv.picker.filterIndex;
        file = rv.file;
        e.filename = rv.file.path;
    }
    else
    {
        try
        {
            // Try to use this as a path
            file = nsLocalFile(e.filename);
        }
        catch (ex)
        {
            // try to use it as a URL
            try
            {
                file = getFileFromURLSpec(e.filename);
            }
            catch(ex)
            {
                // What is the user thinking? It's not rocket science...
                display(getMsg(MSG_SAVE_ERR_INVALID_PATH, e.filename),
                        MT_ERROR);
                return;
            }
        }

        // Get extension and determine savetype
        if (!e.savetype)
        {
            var extension = file.path.substr(file.path.lastIndexOf("."));
            if (extension == ".txt")
            {
                saveType = saveTypes["text"];
            }
            else if (extension.match(/\.x?html?$/))
            {
                saveType = saveTypes["complete"];
            }
            else
            {
                // No saveType and no decent extension --> out!
                var errMsg;
                if (extension.indexOf(".") < 0)
                    errMsg = MSG_SAVE_ERR_NO_EXT;
                else
                    errMsg = getMsg(MSG_SAVE_ERR_INVALID_EXT, extension);
                display(errMsg, MT_ERROR);
                return;
            }
        }
        else
        {
            if (!(e.savetype in saveTypes))
            {
                // no valid saveType
                display(getMsg(MSG_SAVE_ERR_INVALID_SAVETYPE, e.savetype),
                            MT_ERROR);
                return;
            }
            saveType = saveTypes[e.savetype];
        }

        var askforreplace = (e.isInteractive && file.exists());
        if (askforreplace && !confirm(getMsg(MSG_SAVE_FILEEXISTS, e.filename)))
            return;
    }

    // We don't want to convert anything, leave everything as is and replace
    // old files, as the user has been prompted about that already.
    wbp.persistFlags |= nsIWBP.PERSIST_FLAGS_NO_CONVERSION
                        | nsIWBP.PERSIST_FLAGS_REPLACE_EXISTING_FILES
                        | nsIWBP.PERSIST_FLAGS_NO_BASE_TAG_MODIFICATIONS
                        | nsIWBP.PERSIST_FLAGS_REPLACE_EXISTING_FILES
                        | nsIWBP.PERSIST_FLAGS_DONT_FIXUP_LINKS
                        | nsIWBP.PERSIST_FLAGS_DONT_CHANGE_FILENAMES;

    // Set the document from the current view, and set a usable title
    docToBeSaved = getContentDocument(e.sourceObject.frame);
    var headElement = docToBeSaved.getElementsByTagName("HEAD")[0];
    var titleElements = docToBeSaved.getElementsByTagName("title");
    // Remove an existing title, there shouldn't be more than one.
    if (titleElements.length > 0)
        titleElements[0].parentNode.removeChild(titleElements[0]);
    title = docToBeSaved.createElement("title");
    title.appendChild(docToBeSaved.createTextNode(document.title +
                                                  " (" + new Date() + ")"));
    headElement.appendChild(title);
    // Set standard flags, file type, saveFolder and character limit
    flags = nsIWBP.ENCODE_FLAGS_ENCODE_BASIC_ENTITIES;
    fileType = "text/html";
    saveFolder = null;
    charLimit = 0;

    // Do saveType specific stuff
    switch (saveType)
    {
        case saveTypes["complete"]:
            // Get the directory into which to save associated files.
            saveFolder = file.clone();
            var baseName = saveFolder.leafName;
            baseName = baseName.substring(0, baseName.lastIndexOf("."));
            saveFolder.leafName = getMsg(MSG_SAVE_FILES_FOLDER, baseName);
            break;
            // html only does not need any additional configuration
        case saveTypes["text"]:
            // set flags for Plain Text
            flags = nsIWBP.ENCODE_FLAGS_FORMATTED;
            flags |= nsIWBP.ENCODE_FLAGS_ABSOLUTE_LINKS;
            flags |= nsIWBP.ENCODE_FLAGS_NOFRAMES_CONTENT;
            // set the file type and set character limit to 80
            fileType = "text/plain";
            charLimit = 80;
            break;
    }

    try
    {
        wbp.saveDocument(docToBeSaved, file, saveFolder, fileType, flags,
                         charLimit);
    }
    catch (ex)
    {
        pm = [e.sourceObject.viewName, e.filename, ex.message];
        display(getMsg(MSG_SAVE_ERR_FAILED, pm), MT_ERROR);
    }
    // Error handling and finishing message is done by the listener
}

function cmdSupports(e)
{
    var server = e.server;
    var data = server.supports;

    if ("channelTypes" in server)
        display(getMsg(MSG_SUPPORTS_CHANTYPES,
                       server.channelTypes.join(MSG_COMMASP)));
    if ("channelModes" in server)
    {
        display(getMsg(MSG_SUPPORTS_CHANMODESA,
                       server.channelModes.a.join(MSG_COMMASP)));
        display(getMsg(MSG_SUPPORTS_CHANMODESB,
                       server.channelModes.b.join(MSG_COMMASP)));
        display(getMsg(MSG_SUPPORTS_CHANMODESC,
                       server.channelModes.c.join(MSG_COMMASP)));
        display(getMsg(MSG_SUPPORTS_CHANMODESD,
                       server.channelModes.d.join(MSG_COMMASP)));
    }

    if ("userModes" in server)
    {
        var list = new Array();
        for (var m in server.userModes)
        {
            list.push(getMsg(MSG_SUPPORTS_USERMODE, [
                                                      server.userModes[m].mode,
                                                      server.userModes[m].symbol
                                                    ]));
        }
        display(getMsg(MSG_SUPPORTS_USERMODES, list.join(MSG_COMMASP)));
    }

    var listB1 = new Array();
    var listB2 = new Array();
    var listN = new Array();
    for (var k in data)
    {
        if (typeof data[k] == "boolean")
        {
            if (data[k])
                listB1.push(k);
            else
                listB2.push(k);
        }
        else
        {
            listN.push(getMsg(MSG_SUPPORTS_MISCOPTION, [ k, data[k] ] ));
        }
    }
    listB1.sort();
    listB2.sort();
    listN.sort();
    display(getMsg(MSG_SUPPORTS_FLAGSON, listB1.join(MSG_COMMASP)));
    display(getMsg(MSG_SUPPORTS_FLAGSOFF, listB2.join(MSG_COMMASP)));
    display(getMsg(MSG_SUPPORTS_MISCOPTIONS, listN.join(MSG_COMMASP)));
}

function cmdDoCommand(e)
{
    if (e.cmdName == "cmd_mozillaPrefs")
    {
        // open Mozilla/SeaMonkey preferences
        const PREF_URL = 'chrome://chatzilla/content/pref-irc.xul';
        if (goPreferences.arity == 1) // SeaMonkey 2.x
            goPreferences('navigator_pane');
        else // Mozilla, SeaMonkey 1.x, etc.
            goPreferences('navigator', PREF_URL, 'navigator');
    }
    else if (e.cmdName == "cmd_chatzillaPrefs")
    {
        window.openDialog('chrome://chatzilla/content/config.xul', '',
                          'chrome,resizable,dialog=no', window);
    }
    else if (e.cmdName == "cmd_selectAll")
    {
        var userList = document.getElementById("user-list");
        var elemFocused = document.commandDispatcher.focusedElement;

        if (userList.view && (elemFocused == userList))
            userList.view.selection.selectAll();
        else
            doCommand("cmd_selectAll");
    }
    else
    {
        doCommand(e.cmdName);
    }
}

function cmdTime(e)
{
    if (e.nickname)
        e.network.dispatch("ctcp", { target: e.nickname, code: "TIME"});
    else
        e.server.sendData(fromUnicode("TIME") + "\n", e.sourceObject);
}

function cmdTimestamps(e)
{
    var view = e.sourceObject;

    if (e.toggle != null)
    {
        e.toggle = getToggle(e.toggle, view.prefs["timestamps"])
        view.prefs["timestamps"] = e.toggle;
    }
    else
    {
        display(getMsg(MSG_FMT_PREF, ["timestamps",
                                      view.prefs["timestamps"]]));
    }
}

function cmdSetCurrentView(e)
{
    if ("lockView" in e.view)
        delete e.view.lockView;

    setCurrentObject(e.view);
}

function cmdJumpToAnchor(e)
{
    if (e.hasOwnProperty("channelName"))
    {
        e.channel = new CIRCChannel(e.server, e.channelName);
    }
    else if (!e.channel)
    {
        display(getMsg(MSG_ERR_REQUIRED_PARAM, "channel-name"), MT_ERROR);
        return;
    }
    if (!e.channel.frame)
    {
        display(getMsg(MSG_JUMPTO_ERR_NOCHAN, e.channel.unicodeName), MT_ERROR);
        return;
    }

    var document = getContentDocument(e.channel.frame);
    var row = document.getElementById(e.anchor);

    if (!row)
    {
        display(getMsg(MSG_JUMPTO_ERR_NOANCHOR), MT_ERROR);
        return;
    }

    dispatch("set-current-view", {view: e.channel});
    e.channel.scrollToElement(row, "center");
}

function cmdIgnore(e)
{
    if (("mask" in e) && e.mask)
    {
        e.mask = e.server.toLowerCase(e.mask);

        if (e.command.name == "ignore")
        {
            if (e.network.ignore(e.mask))
                display(getMsg(MSG_IGNORE_ADD, e.mask));
            else
                display(getMsg(MSG_IGNORE_ADDERR, e.mask));
        }
        else
        {
            if (e.network.unignore(e.mask))
                display(getMsg(MSG_IGNORE_DEL, e.mask));
            else
                display(getMsg(MSG_IGNORE_DELERR, e.mask));
        }
        // Update pref:
        var ignoreList = keys(e.network.ignoreList);
        e.network.prefs["ignoreList"] = ignoreList;
        e.network.prefs["ignoreList"].update();
    }
    else
    {
        var list = new Array();
        for (var m in e.network.ignoreList)
            list.push(m);
        if (list.length == 0)
            display(MSG_IGNORE_LIST_1);
        else
            display(getMsg(MSG_IGNORE_LIST_2, arraySpeak(list)));
    }
}

function cmdFont(e)
{
    var view = client;
    var pref, val, pVal;

    if (e.command.name == "font-family")
    {
        pref = "font.family";
        val = e.font;

        // Save new value, then display pref value.
        if (val)
            view.prefs[pref] = val;

        display(getMsg(MSG_FONTS_FAMILY_FMT, view.prefs[pref]));
    }
    else if (e.command.name == "font-size")
    {
        pref = "font.size";
        val = e.fontSize;

        // Ok, we've got an input.
        if (val)
        {
            // Get the current value, use user's default if needed.
            pVal = view.prefs[pref];
            if (pVal == 0)
                pVal = getDefaultFontSize();

            // Handle user's input...
            switch(val) {
                case "default":
                    val = 0;
                    break;

                case "small":
                    val = getDefaultFontSize() - 2;
                    break;

                case "medium":
                    val = getDefaultFontSize();
                    break;

                case "large":
                    val = getDefaultFontSize() + 2;
                    break;

                case "smaller":
                    val = pVal - 2;
                    break;

                case "bigger":
                    val = pVal + 2;
                    break;

                default:
                    val = Number(val);
            }
            // Save the new value.
            view.prefs[pref] = val;
        }

        // Show the user what the pref is set to.
        if (view.prefs[pref] == 0)
            display(MSG_FONTS_SIZE_DEFAULT);
        else
            display(getMsg(MSG_FONTS_SIZE_FMT, view.prefs[pref]));
    }
    else if (e.command.name == "font-family-other")
    {
        val = prompt(MSG_FONTS_FAMILY_PICK, view.prefs["font.family"]);
        if (!val)
            return;

        dispatch("font-family", { font: val });
    }
    else if (e.command.name == "font-size-other")
    {
        pVal = view.prefs["font.size"];
        if (pVal == 0)
            pVal = getDefaultFontSize();

        val = prompt(MSG_FONTS_SIZE_PICK, pVal);
        if (!val)
            return;

        dispatch("font-size", { fontSize: val });
    }
}

function cmdDCCChat(e)
{
    if (!jsenv.HAS_SERVER_SOCKETS)
        return display(MSG_DCC_NOT_POSSIBLE);
    if (!client.prefs["dcc.enabled"])
        return display(MSG_DCC_NOT_ENABLED);

    if (!e.nickname && !e.user)
        return display(MSG_DCC_ERR_NOUSER);

    var user;
    if (e.nickname)
        user = e.server.addUser(e.nickname);
    else
        user = e.server.addUser(e.user.unicodeName);

    var u = client.dcc.addUser(user);
    var c = client.dcc.addChat(u, client.dcc.getNextPort());
    c.request();

    client.munger.getRule(".inline-buttons").enabled = true;
    var cmd = getMsg(MSG_DCC_COMMAND_CANCEL, "dcc-close " + c.id);
    display(getMsg(MSG_DCCCHAT_SENT_REQUEST, c._getParams().concat(cmd)),
            "DCC-CHAT");
    client.munger.getRule(".inline-buttons").enabled = false;

    return true;
}

function cmdDCCClose(e)
{
    if (!jsenv.HAS_SERVER_SOCKETS)
        return display(MSG_DCC_NOT_POSSIBLE);
    if (!client.prefs["dcc.enabled"])
        return display(MSG_DCC_NOT_ENABLED);

    // If there is no nickname specified, use current view.
    if (!e.nickname)
    {
        // Both DCC chat and file transfers can be aborted like this.
        if (e.sourceObject.TYPE.substr(0, 6) == "IRCDCC")
        {
            if (e.sourceObject.isActive())
                return e.sourceObject.abort();
            return true;
        }
        // ...if there is one.
        return display(MSG_DCC_ERR_NOTDCC);
    }

    var o = client.dcc.findByID(e.nickname);
    if (o)
        // Direct ID --> object request.
        return o.abort();

    if (e.type)
        e.type = [e.type.toLowerCase()];
    else
        e.type = ["chat", "file"];

    // Go ask the DCC code for some matching requets.
    var list = client.dcc.getMatches
              (e.nickname, e.file, e.type, [DCC_DIR_GETTING, DCC_DIR_SENDING],
               [DCC_STATE_REQUESTED, DCC_STATE_ACCEPTED, DCC_STATE_CONNECTED]);

    // Disconnect if only one match.
    if (list.length == 1)
        return list[0].abort();

    // Oops, couldn't figure the user's requets out, so give them some help.
    display(getMsg(MSG_DCC_ACCEPTED_MATCHES, [list.length]));
    display(MSG_DCC_MATCHES_HELP);
    return true;
}

function cmdDCCSend(e)
{
    if (!jsenv.HAS_SERVER_SOCKETS)
        return display(MSG_DCC_NOT_POSSIBLE);
    if (!client.prefs["dcc.enabled"])
        return display(MSG_DCC_NOT_ENABLED);

    const DIRSVC_CID = "@mozilla.org/file/directory_service;1";
    const nsIProperties = Components.interfaces.nsIProperties;

    if (!e.nickname && !e.user)
        return display(MSG_DCC_ERR_NOUSER);

    // Accept the request passed in...
    var file;
    if (!e.file)
    {
        var pickerRv = pickOpen(MSG_DCCFILE_SEND);
        if (!pickerRv.ok)
            return false;
        file = pickerRv.file;
    }
    else
    {
        // Wrap in try/catch because nsILocalFile creation throws a freaking
        // error if it doesn't get a FULL path.
        try
        {
            file = nsLocalFile(e.file);
        }
        catch(ex)
        {
            // Ok, try user's home directory.
            var fl = Components.classes[DIRSVC_CID].getService(nsIProperties);
            file = fl.get("Home", Components.interfaces.nsILocalFile);

            // Another freaking try/catch wrapper.
            try
            {
                // NOTE: This is so pathetic it can't cope with any path
                // separators in it, so don't even THINK about lobing a
                // relative path at it.
                file.append(e.file);

                // Wow. We survived.
            }
            catch (ex)
            {
                return display(MSG_DCCFILE_ERR_NOTFOUND);
            }
        }
    }
    if (!file.exists())
        return display(MSG_DCCFILE_ERR_NOTFOUND);
    if (!file.isFile())
        return display(MSG_DCCFILE_ERR_NOTAFILE);
    if (!file.isReadable())
        return display(MSG_DCCFILE_ERR_NOTREADABLE);

    var user;
    if (e.nickname)
        user = e.server.addUser(e.nickname);
    else
        user = e.server.addUser(e.user.unicodeName);

    var u = client.dcc.addUser(user);
    var c = client.dcc.addFileTransfer(u, client.dcc.getNextPort());
    c.request(file);

    client.munger.getRule(".inline-buttons").enabled = true;
    var cmd = getMsg(MSG_DCC_COMMAND_CANCEL, "dcc-close " + c.id);
    display(getMsg(MSG_DCCFILE_SENT_REQUEST, [c.user.unicodeName, c.localIP,
                                              c.port, c.filename,
                                              getSISize(c.size), cmd]),
            "DCC-FILE");
    client.munger.getRule(".inline-buttons").enabled = false;

    return true;
}

function cmdDCCList(e) {
    if (!jsenv.HAS_SERVER_SOCKETS)
        return display(MSG_DCC_NOT_POSSIBLE);
    if (!client.prefs["dcc.enabled"])
        return display(MSG_DCC_NOT_ENABLED);

    var counts = { pending: 0, connected: 0, failed: 0 };
    var k;

    // Get all the DCC sessions.
    var list = client.dcc.getMatches();

    for (k = 0; k < list.length; k++) {
        var c = list[k];
        var type = c.TYPE.substr(6, c.TYPE.length - 6);

        var dir = MSG_UNKNOWN;
        var tf = MSG_UNKNOWN;
        if (c.state.dir == DCC_DIR_SENDING)
        {
            dir = MSG_DCCLIST_DIR_OUT;
            tf = MSG_DCCLIST_TO;
        }
        else if (c.state.dir == DCC_DIR_GETTING)
        {
            dir = MSG_DCCLIST_DIR_IN;
            tf = MSG_DCCLIST_FROM;
        }

        var state = MSG_UNKNOWN;
        var cmds = "";
        switch (c.state.state)
        {
            case DCC_STATE_REQUESTED:
                state = MSG_DCC_STATE_REQUEST;
                if (c.state.dir == DCC_DIR_GETTING)
                {
                    cmds = getMsg(MSG_DCC_COMMAND_ACCEPT, "dcc-accept " + c.id) + " " +
                           getMsg(MSG_DCC_COMMAND_DECLINE, "dcc-decline " + c.id);
                }
                else
                {
                    cmds = getMsg(MSG_DCC_COMMAND_CANCEL, "dcc-close " + c.id);
                }
                counts.pending++;
                break;
            case DCC_STATE_ACCEPTED:
                state = MSG_DCC_STATE_ACCEPT;
                counts.connected++;
                break;
            case DCC_STATE_DECLINED:
                state = MSG_DCC_STATE_DECLINE;
                break;
            case DCC_STATE_CONNECTED:
                state = MSG_DCC_STATE_CONNECT;
                cmds = getMsg(MSG_DCC_COMMAND_CLOSE, "dcc-close " + c.id);
                if (c.TYPE == "IRCDCCFileTransfer")
                {
                    state = getMsg(MSG_DCC_STATE_CONNECTPRO,
                                   [c.progress,
                                    getSISize(c.position), getSISize(c.size),
                                    getSISpeed(c.speed)]);
                }
                counts.connected++;
                break;
            case DCC_STATE_DONE:
                state = MSG_DCC_STATE_DISCONNECT;
                break;
            case DCC_STATE_ABORTED:
                state = MSG_DCC_STATE_ABORT;
                counts.failed++;
                break;
            case DCC_STATE_FAILED:
                state = MSG_DCC_STATE_FAIL;
                counts.failed++;
                break;
        }
        client.munger.getRule(".inline-buttons").enabled = true;
        display(getMsg(MSG_DCCLIST_LINE, [k + 1, state, dir, type, tf,
                                          c.unicodeName, c.remoteIP, c.port,
                                          cmds]));
        client.munger.getRule(".inline-buttons").enabled = false;
    }
    display(getMsg(MSG_DCCLIST_SUMMARY, [counts.pending, counts.connected,
                                         counts.failed]));
    return true;
}

function cmdDCCAutoAcceptList(e)
{
    if (!jsenv.HAS_SERVER_SOCKETS)
        return display(MSG_DCC_NOT_POSSIBLE);
    if (!client.prefs["dcc.enabled"])
        return display(MSG_DCC_NOT_ENABLED);

    var list = e.network.prefs["dcc.autoAccept.list"];

    if (list.length == 0)
        display(MSG_DCCACCEPT_DISABLED);
    else
        display(getMsg(MSG_DCCACCEPT_LIST, arraySpeak(list)));

    return true;
}

function cmdDCCAutoAcceptAdd(e)
{
    if (!jsenv.HAS_SERVER_SOCKETS)
        return display(MSG_DCC_NOT_POSSIBLE);
    if (!client.prefs["dcc.enabled"])
        return display(MSG_DCC_NOT_ENABLED);

    var list = e.network.prefs["dcc.autoAccept.list"];

    if (!e.user && e.server)
        e.user = e.server.getUser(e.nickname);

    var mask = e.user ? "*!" + e.user.name + "@" + e.user.host : e.nickname;
    var index = arrayIndexOf(list, mask);
    if (index == -1)
    {
        list.push(mask);
        list.update();
        display(getMsg(MSG_DCCACCEPT_ADD, mask));
    }
    else
    {
        display(getMsg(MSG_DCCACCEPT_ADDERR,
                       e.user ? e.user.unicodeName : e.nickname));
    }
    return true;
}

function cmdDCCAutoAcceptDel(e)
{
    if (!jsenv.HAS_SERVER_SOCKETS)
        return display(MSG_DCC_NOT_POSSIBLE);
    if (!client.prefs["dcc.enabled"])
        return display(MSG_DCC_NOT_ENABLED);

    var list = e.network.prefs["dcc.autoAccept.list"];

    if (!e.user && e.server)
        e.user = e.server.getUser(e.nickname);

    var maskObj, newList = new Array();
    for (var m = 0; m < list.length; ++m)
    {
        maskObj = getHostmaskParts(list[m]);
        if (e.nickname == list[m] ||
            (e.user && hostmaskMatches(e.user, maskObj, e.server)))
        {
            display(getMsg(MSG_DCCACCEPT_DEL, list[m]));
        }
        else
        {
            newList.push(list[m]);
        }
    }

    if (list.length > newList.length)
        e.network.prefs["dcc.autoAccept.list"] = newList;
    else
        display(getMsg(MSG_DCCACCEPT_DELERR,
                       e.user ? e.user.unicodeName : e.nickname));

    return true;
}

function cmdDCCAccept(e)
{
    if (!jsenv.HAS_SERVER_SOCKETS)
        return display(MSG_DCC_NOT_POSSIBLE);
    if (!client.prefs["dcc.enabled"])
        return display(MSG_DCC_NOT_ENABLED);

    function accept(c)
    {
        if (c.TYPE == "IRCDCCChat")
        {
            if (!c.accept())
                return false;

            display(getMsg(MSG_DCCCHAT_ACCEPTED, c._getParams()), "DCC-CHAT");
            return true;
        }

        // Accept the request passed in...
        var filename = c.filename;
        var ext = "*";
        var m = filename.match(/...\.([a-z]+)$/i);
        if (m)
            ext = "*." + m[1];

        var pickerRv = pickSaveAs(getMsg(MSG_DCCFILE_SAVE_TO, filename),
                                  ["$all", ext], filename);
        if (!pickerRv.ok)
            return false;

        if (!c.accept(pickerRv.file))
            return false;

        display(getMsg(MSG_DCCFILE_ACCEPTED, c._getParams()), "DCC-FILE");
        return true;
    };

    // If there is no nickname specified, use the "last" item.
    // This is the last DCC request that arrvied.
    if (!e.nickname && client.dcc.last)
    {
        if ((new Date() - client.dcc.lastTime) >= 10000)
            return accept(client.dcc.last);
        return display(MSG_DCC_ERR_ACCEPT_TIME);
    }

    var o = client.dcc.findByID(e.nickname);
    if (o)
        // Direct ID --> object request.
        return accept(o);

    if (e.type)
        e.type = [e.type.toLowerCase()];
    else
        e.type = ["chat", "file"];

    // Go ask the DCC code for some matching requets.
    var list = client.dcc.getMatches(e.nickname, e.file, e.type,
                                     [DCC_DIR_GETTING], [DCC_STATE_REQUESTED]);
    // Accept if only one match.
    if (list.length == 1)
        return accept(list[0]);

    // Oops, couldn't figure the user's request out, so give them some help.
    display(getMsg(MSG_DCC_PENDING_MATCHES, [list.length]));
    display(MSG_DCC_MATCHES_HELP);
    return true;
}

function cmdDCCDecline(e)
{
    if (!jsenv.HAS_SERVER_SOCKETS)
        return display(MSG_DCC_NOT_POSSIBLE);
    if (!client.prefs["dcc.enabled"])
        return display(MSG_DCC_NOT_ENABLED);

    function decline(c)
    {
        // Decline the request passed in...
        c.decline();
        if (c.TYPE == "IRCDCCChat")
            display(getMsg(MSG_DCCCHAT_DECLINED, c._getParams()), "DCC-CHAT");
        else
            display(getMsg(MSG_DCCFILE_DECLINED, c._getParams()), "DCC-FILE");
    };

    // If there is no nickname specified, use the "last" item.
    // This is the last DCC request that arrvied.
    if (!e.nickname && client.dcc.last)
        return decline(client.dcc.last);

    var o = client.dcc.findByID(e.nickname);
    if (o)
        // Direct ID --> object request.
        return decline(o);

    if (!e.type)
        e.type = ["chat", "file"];

    // Go ask the DCC code for some matching requets.
    var list = client.dcc.getMatches(e.nickname, e.file, e.type,
                                     [DCC_DIR_GETTING], [DCC_STATE_REQUESTED]);
    // Decline if only one match.
    if (list.length == 1)
        return decline(list[0]);

    // Oops, couldn't figure the user's requets out, so give them some help.
    display(getMsg(MSG_DCC_PENDING_MATCHES, [list.length]));
    display(MSG_DCC_MATCHES_HELP);
    return true;
}

function cmdDCCShowFile(e)
{
    var f = getFileFromURLSpec(e.file);
    if (f)
        f = nsLocalFile(f.path);
    if (f && f.parent && f.parent.exists())
    {
        try
        {
            f.reveal();
        }
        catch (ex)
        {
            dd(formatException(ex));
        }
    }
}

function cmdTextDirection(e)
{
    var direction;
    var sourceObject = getContentDocument(e.sourceObject.frame).body;

    switch (e.dir)
    {
        case "toggle":
            if (sourceObject.getAttribute("dir") == "rtl")
                direction = 'ltr';
            else
                direction = 'rtl';
            break;
        case "rtl":
            direction = 'rtl';
            break;
        default:
            // that is "case "ltr":",
            // but even if !e.dir OR e.dir is an invalid value -> set to
            // default direction
            direction = 'ltr';
    }
    client.input.setAttribute("dir", direction);
    sourceObject.setAttribute("dir", direction);

    return true;
}

function cmdInputTextDirection(e)
{
    var direction;

    switch (e.dir)
    {
        case "rtl":
            client.input.setAttribute("dir", "rtl");
            break
        default:
            // that is "case "ltr":", but even if !e.dir OR e.dir is an
            //invalid value -> set to default direction
            client.input.setAttribute("dir", "ltr");
    }

    return true;
}

function cmdInstallPlugin(e)
{
    var ipURL = "chrome://chatzilla/content/install-plugin/install-plugin.xul";
    var ctx = {};
    var pluginDownloader =
    {
        onStartRequest: function _onStartRequest(request, context)
        {
            var tempName = "plugin-install.temp";
            if (urlMatches)
                tempName += urlMatches[2];

            ctx.outFile = getTempFile(client.prefs["profilePath"], tempName);
            ctx.outFileH = fopen(ctx.outFile, ">");
        }, 
        onDataAvailable: function _onDataAvailable(request, context, stream,
                                                   offset, count)
        {
            if (!ctx.inputStream)
                ctx.inputStream = toSInputStream(stream, true);

            ctx.outFileH.write(ctx.inputStream.readBytes(count));
        },
        onStopRequest: function _onStopRequest(request, context, statusCode)
        {
            ctx.outFileH.close();
 
            if (statusCode == 0)
            {
                client.installPlugin(e.name, ctx.outFile);
            }
            else
            {
                display(getMsg(MSG_INSTALL_PLUGIN_ERR_DOWNLOAD, statusCode),
                        MT_ERROR);
            }

            try
            {
                ctx.outFile.remove(false);
            }
            catch (ex)
            {
                display(getMsg(MSG_INSTALL_PLUGIN_ERR_REMOVE_TEMP, ex),
                        MT_ERROR);
            }
        }
    };

    if (!e.url)
    {
        if ("installPluginDialog" in client)
            return client.installPluginDialog.focus();

        window.openDialog(ipURL, "", "chrome,dialog", client);
        return;
    }

    var urlMatches = e.url.match(/([^\/]+?)((\..{0,3}){0,2})$/);
    if (!e.name)
    {
        if (urlMatches)
        {
            e.name = urlMatches[1];
        }
        else
        {
            display(MSG_INSTALL_PLUGIN_ERR_NO_NAME, MT_ERROR);
            return;
        }
    }

    // Do real install here.
    switch (e.url.match(/^[^:]+/)[0])
    {
        case "file":
            client.installPlugin(e.name, e.url);
            break;

        case "http":
        case "https":
            try
            {
                var channel = client.iosvc.newChannel(e.url, "UTF-8", null);
                display(getMsg(MSG_INSTALL_PLUGIN_DOWNLOADING, e.url),
                        MT_INFO);
                channel.asyncOpen(pluginDownloader, { e: e });
            }
            catch (ex)
            {
                display(getMsg(MSG_INSTALL_PLUGIN_ERR_DOWNLOAD, ex), MT_ERROR);
                return;
            }
            break;

        default:
            display(MSG_INSTALL_PLUGIN_ERR_PROTOCOL, MT_ERROR);
    }
}

function cmdFind(e)
{
    if (!e.rest)
    {
        findInPage(getFindData(e));
        return;
    }

    // Used from the inputbox, set the search string and find the first
    // occurrence using find-again.
    const FINDSVC_ID = "@mozilla.org/find/find_service;1";
    var findService = getService(FINDSVC_ID, "nsIFindService");
    // Make sure it searches the entire document, but don't lose the old setting
    var oldWrap = findService.wrapFind;
    findService.wrapFind = true;
    findService.searchString = e.rest;
    findAgainInPage(getFindData(e));
    // Restore wrap setting:
    findService.wrapFind = oldWrap;
}

function cmdFindAgain(e)
{
    if (canFindAgainInPage())
        findAgainInPage(getFindData(e));
}

function cmdURLs(e)
{
    var urls = client.urlLogger.read().reverse();

    if (urls.length == 0)
    {
        display(MSG_URLS_NONE);
    }
    else
    {
        /* Temporarily remove the URL logger to avoid changing the list when
         * displaying it.
         */
        var logger = client.urlLogger;
        delete client.urlLogger;

        var num = e.number || client.prefs["urls.display"];
        if (num > urls.length)
            num = urls.length;
        display(getMsg(MSG_URLS_HEADER, num));

        for (var i = 0; i < num; i++)
            display(getMsg(MSG_URLS_ITEM, [i + 1, urls[i]]));

        client.urlLogger = logger;
    }
}
