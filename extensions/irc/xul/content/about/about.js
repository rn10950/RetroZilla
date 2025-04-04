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
 * Portions created by the Initial Developer are Copyright (C) 2005
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   James Ross <silver@warwickcompsoc.co.uk>
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

var ownerClient = null;

// To be able to load static.js, we need a few things defined first:
function CIRCNetwork() {}
function CIRCServer() {}
function CIRCChannel() {}
function CIRCUser() {}
function CIRCChanUser() {}
function CIRCDCCUser() {}
function CIRCDCCChat() {}
function CIRCDCCFile() {}
function CIRCDCCFileTransfer() {}

// Our friend from messages.js:
function getMsg(msgName, params, deflt)
{
    return client.messageManager.getMsg(msgName, params, deflt);
}

function onLoad()
{
    const propsPath = "chrome://chatzilla/locale/chatzilla.properties";

    // Find our owner, if we have one.
    ownerClient = window.arguments ? window.arguments[0].client : null;
    if (ownerClient)
        ownerClient.aboutDialog = window;

    client.entities = new Object();
    client.messageManager = new MessageManager(client.entities);
    client.messageManager.loadBrands();
    client.defaultBundle = client.messageManager.addBundle(propsPath);

    var version = getVersionInfo();
    client.userAgent = getMsg(MSG_VERSION_REPLY, [version.cz, version.ua]);

    var verLabel = document.getElementById("version");
    var verString = verLabel.getAttribute("format").replace("%S", version.cz);
    verLabel.setAttribute("value", verString);
    verLabel.setAttribute("condition", __cz_condition);

    var localizers = document.getElementById("localizers");
    var localizerNames = getMsg("locale.authors", null, "");
    if (localizerNames && (localizerNames.substr(0, 11) != "XXX REPLACE"))
    {
        localizerNames = localizerNames.split(/\s*;\s*/);

        for (var i = 0; i < localizerNames.length; i++) {
            var loc = document.createElement("label");
            loc.setAttribute("value", localizerNames[i]);
            localizers.appendChild(loc);
        }
    }
    else
    {
        var localizersHeader = document.getElementById("localizers-header");
        localizersHeader.style.display = "none";
        localizers.style.display = "none";
    }

    if (window.opener)
    {
        // Force the window to be the right size now, not later.
        window.sizeToContent();

        // Position it centered over, but never up or left of parent.
        var opener = window.opener;
        var sx = Math.max((opener.outerWidth  - window.outerWidth ) / 2, 0);
        var sy = Math.max((opener.outerHeight - window.outerHeight) / 2, 0);
        window.moveTo(opener.screenX + sx, opener.screenY + sy);
    }

    /* Find and focus the dialog's default button (OK), otherwise the focus
     * lands on the first focusable content - the homepage link. Links in XUL
     * look horrible when focused.
     */
    var binding = document.documentElement;
    var defaultButton = binding.getButton(binding.defaultButton);
    if (defaultButton)
        setTimeout(function() { defaultButton.focus() }, 0);
}

function onUnload()
{
    if (ownerClient)
        delete ownerClient.aboutDialog;
}

function copyVersion()
{
    const cbID = Components.interfaces.nsIClipboard.kGlobalClipboard;
    var cb = getService("@mozilla.org/widget/clipboard;1", "nsIClipboard");
    var tr = newObject("@mozilla.org/widget/transferable;1", "nsITransferable");
    var str = newObject("@mozilla.org/supports-string;1", "nsISupportsString");

    str.data = client.userAgent;
    tr.setTransferData("text/unicode", str, str.data.length * 2);
    cb.setData(tr, null, cbID);
}

function openHomepage()
{
    if (ownerClient)
        ownerClient.dispatch("goto-url", {url: MSG_SOURCE_REPLY});
    else
        window.opener.open(MSG_SOURCE_REPLY, "_blank");
}
