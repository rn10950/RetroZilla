/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
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
 * The Original Code is the Add Feed Reader Dialog.
 *
 * The Initial Developer of the Original Code is Google Inc.
 * Portions created by the Initial Developer are Copyright (C) 2006
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Ben Goodger <beng@google.com>
 *   Asaf Romano <mozilla.mano@sent.com>
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

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cr = Components.results;

function LOG(str) {
  dump("*** " + str + "\n");
}

const TYPE_MAYBE_FEED = "application/vnd.mozilla.maybe.feed";
const PREF_SELECTED_WEB = "browser.feeds.handlers.webservice";

const TYPETYPE_MIME = 1;
const TYPETYPE_PROTOCOL = 2;

//
// window.arguments:
//
// 0          nsIDialogParamBlock containing user decision result
// 1          string uri of the service being registered
// 2          string title of the service being registered
// 3          string type of service being registered for
// 4          integer 1 = content type 2 = protocol


var gAddFeedReader = {
  _result: null,
  _uri: null,
  _title: null,
  _type: null,
  _typeType: null,
  _handlerInstalled: false,

  init: function AFR_init() {
    this._result = window.arguments[0].QueryInterface(Ci.nsIDialogParamBlock);
    this._uri = window.arguments[1].QueryInterface(Ci.nsIURI);
    this._title = window.arguments[2];
    this._type = window.arguments[3];
    this._typeType = window.arguments[4];
  
    var strings = document.getElementById("strings");
    var dlg = document.documentElement;
    var addQuestion = document.getElementById("addQuestion");

    var wccr = 
        Cc["@mozilla.org/embeddor.implemented/web-content-handler-registrar;1"].
        getService(Ci.nsIWebContentConverterService);
    var handler = 
        wccr.getWebContentHandlerByURI(this._type, this._uri.spec);
    this._handlerInstalled = handler != null;

    var key = this._handlerInstalled ? "handlerRegistered" : "addHandler";
    var message = strings.getFormattedString(key, [this._title]);
    addQuestion.setAttribute("value", message);
    
    if (this._type != TYPE_MAYBE_FEED && this._typeType == TYPETYPE_MIME) {
      var mimeService = 
          Cc["@mozilla.org/uriloader/external-helper-app-service;1"].
          getService(Ci.nsIMIMEService);
      var ext = mimeService.getPrimaryExtension(this._type, null);
      var imageBox = document.getElementById("imageBox");
      imageBox.style.backgroundImage = "url('moz-icon://goat." + ext + "?size=32');";
    }

    document.getElementById("site").value = this._uri.host;
    
    if (handler) {
      dlg.getButton("cancel").hidden = true;
      dlg.defaultButton = "accept";
      document.getElementById("siteBox").hidden = true;
    }
    else {
      dlg.getButton("accept").label = strings.getString("addHandlerYes");
      dlg.getButton("cancel").label = strings.getString("addHandlerNo");
    }

    window.sizeToContent();
  },

  onDialogAccept: function AFR_onDialogAccept() {
    // Used to tell the WCCR that the user chose to add the handler (rather 
    // than canceling).
    const PARAM_SHOULD_ADD_HANDLER = 0;

    // We don't need to add an already-installed handler
    this._result.SetInt(PARAM_SHOULD_ADD_HANDLER, !this._handlerInstalled);
  }
};
