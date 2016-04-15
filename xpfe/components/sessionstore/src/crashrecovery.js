/* Crash Recovery 2006-07-30 - Copyleft © 2006  Simon Bünzli  <zeniko@gmail.com> */

/* :::::::: Basic Convenience ::::::::::::::: */

/*const*/ var Cc = Components.classes;
/*const*/ var Ci = Components.interfaces;
/*const*/ var Cr = Components.results;

/*const*/ var report = Components.utils.reportError;


/* :::::::: Constants ::::::::::::::: */

/*const*/ var gIOService = Cc["@mozilla.org/network/io-service;1"].getService(Ci.nsIIOService);
/*const*/ var gObserverService = Cc["@mozilla.org/observer-service;1"].getService(Ci.nsIObserverService);
/*const*/ var gPrefRoot = Cc["@mozilla.org/preferences-service;1"].getService(Ci.nsIPrefBranch2);
/*const*/ var gWindowMediator = Cc["@mozilla.org/appshell/window-mediator;1"].getService(Ci.nsIWindowMediator);

/*const*/ var gObserving = ["domwindowopened", "domwindowclosed", "quit-application-requested", "quit-application-granted", "quit-application", "browser:purge-session-history"];
/*const*/ var gPrefBranch = gPrefRoot.QueryInterface(Ci.nsIPrefService).getBranch("extensions.crashrecovery.").QueryInterface(Ci.nsIPrefBranch2);

/*const*/ var gCapabilities = ["Subframes", "Plugins", "Javascript", "MetaRedirects", "Images"];
/*const*/ var gWinAttributes = ["width", "height", "screenX", "screenY", "sizemode"];
/*const*/ var gWinHidable = ["menubar", "toolbar", "locationbar", "personalbar", "statusbar", "scrollbars"];
/*const*/ var gXulAttributes = ["locked", "protected", "marked"];

/*const*/ var STATE_STOPPED = 0;
/*const*/ var STATE_RUNNING = 1;
/*const*/ var STATE_QUITTING = -1;

/*const*/ var POTENTIAL_CRASH_DELAY = 8000;


/* :::::::: State Variables ::::::::::::::: */

var gInitialState, gLastSaveTime, gQuitRequest, gSaveTimer;

var gLoadState = STATE_STOPPED;
var gLastClosedWindow = null;
var gWindows = {};
var gDirty = {};
var gPrefs = {};


/* :::::::: Crash Recovery Service ::::::::::::::: */

/*const*/ var CrashRecoveryService = {
	mCID: Components.ID("{1280606b-2510-4fe0-97ef-9b5a22eafe6b}"),
	mContractID: "@zeniko/crashrecoveryservice;1",
	mClassName: "Crash Recovery Service",

/* ........ Global Event Handlers .............. */

	init: function()
	{
		gObserving.forEach(function(aTopic) { gObserverService.addObserver(this, aTopic, false); }, this);
		
		gPrefs.interval = getPref("interval", 10000);
		gPrefs.postdata = getPref("postdata", -1);
		gPrefs.privacy_level = getPref("privacy_level", 1);
		gPrefBranch.addObserver("", this, false);
		
		try
		{
			gInitialState = readFile(getSessionFile());
		}
		catch (ex) { report(ex); }
		if (gInitialState)
		{
			try
			{
				writeFile(getSessionFile("bak"), gInitialState);
				
				gInitialState = decodeINI(gInitialState);
				delete gInitialState.Window[0].hidden;
				gWinAttributes.forEach(function(aAttr) { delete gInitialState.Window[0][aAttr]; });
			}
			catch (ex)
			{
				report(ex);
				gInitialState = null;
			}
		}
		if (gInitialState && gInitialState.CrashRecovery && gInitialState.CrashRecovery.state && gInitialState.CrashRecovery.state != "stopped")
		{
			if (gInitialState.CrashRecovery.state == "running")
			{
				try
				{
					writeFile(getSessionFile(), readFile(getSessionFile()).replace(/^state=running$/m, "state=crashed"));
				}
				catch (ex) { report(ex); }
			}
			try
			{
				restoreCache();
			}
			catch (ex) { report(ex); }
		}
	},

	uninit: function()
	{
		if (doResumeSession())
		{
			saveState(true);
		}
		else
		{
			clearDisk();
		}
		
		if (gSaveTimer)
		{
			gSaveTimer.cancel();
			gSaveTimer = null;
		}
		
		gObserving.forEach(function(aTopic) { gObserverService.removeObserver(this, aTopic); }, this);
		gPrefBranch.removeObserver("", this);
	},

	observe: function(aSubject, aTopic, aData)
	{
		switch (aTopic)
		{
		case "app-startup":
			gObserverService.addObserver(this, "profile-after-change", false);
			break;
		case "profile-after-change":
			gObserverService.removeObserver(this, aTopic);
			this.init();
			break;
		case "domwindowopened":
			aSubject.addEventListener("load", onWindowLoad_window, false);
			break;
		case "domwindowclosed":
			onWindowClose(aSubject, gQuitRequest && gQuitRequest > Date.now() - 3000);
			break;
		case "quit-application-requested":
			forEachBrowserWindow(collectWindowData);
			gDirty = {};
			gQuitRequest = Date.now();
			break;
		case "quit-application-granted":
			gLoadState = STATE_QUITTING;
			break;
		case "quit-application":
			if (aData == "restart")
			{
				gPrefBranch.setBoolPref("resume_session_once", true);
			}
			gLoadState = STATE_QUITTING;
			this.uninit();
			break;
		case "browser:purge-session-history":
			onPurgeHistory();
			break;
		case "nsPref:changed":
			if (aData in gPrefs)
			{
				gPrefs[aData] = getPref(aData);
			}
			switch (aData)
			{
			case "interval":
				if (gSaveTimer && gLastSaveTime - Date.now() + gPrefs.interval <= 0)
				{
					saveState();
				}
				break;
			case "privacy_level":
				saveState(true);
				break;
			}
			break;
		}
	},

/* ........ Saving Functionality .............. */

	/*API*/ getCurrentState: function()
	{
		return encodeINI(getCurrentState());
	},

	/*API*/ getWindowState: function(aWindow)
	{
		return encodeINI(getCurrentState(aWindow));
	},

/* ........ Restoring Functionality .............. */

	/*API*/ restoreWindow: function(aWindow, aState, aOverwriteTabs)
	{
		try
		{
			var root = decodeINI(aState);
			if (!root.Window[0])
			{
				return;
			}
		}
		catch (ex)
		{
			report(ex);
			return;
		}
		
		restoreWindow(aWindow, root, aOverwriteTabs);
	},

/* ........ QueryInterface .............. */

	QueryInterface: function(aIID)
	{
		if (!aIID.equals(Ci.nsISupports) && !aIID.equals(Ci.nsIObserver) && !aIID.equals(Ci.nsICrashRecoveryService || null))
		{
			Components.returnCode = Cr.NS_ERROR_NO_INTERFACE;
			return null;
		}
		
		return this;
	}
};


/* :::::::: Window Event Handlers ::::::::::::::: */

function onWindowLoad_window()
{
	this.removeEventListener("load", onWindowLoad_window, false);
	
	if (this.document.documentElement.getAttribute("windowtype") != "navigator:browser" || gLoadState == STATE_QUITTING)
	{
		return;
	}
	
	this.__CRi = "window" + Date.now();
	
	if (gLoadState == STATE_STOPPED)
	{
		gWindows = {};
	}
	gWindows[this.__CRi] = { Tab: [], selected: 0 };
	
	if (gLoadState == STATE_STOPPED)
	{
		var lastSessionState = gInitialState && gInitialState.CrashRecovery && gInitialState.CrashRecovery.state && gInitialState.CrashRecovery.state || "stopped";
		
		if (gInitialState && !((lastSessionState != "stopped")?doRecoverSession(lastSessionState == "crashed"):doResumeSession()))
		{
			gInitialState = null;
		}
		if (getPref("resume_session_once"))
		{
			gPrefBranch.setBoolPref("resume_session_once", false);
		}
		gLoadState = STATE_RUNNING;
		gLastSaveTime = Date.now();
		
		saveStateDelayed(this, 5000);
		
		if (gInitialState)
		{
			gInitialState._firstTabs = true;
			gInitialState._crashed = lastSessionState != "stopped";
			restoreWindow(this, gInitialState, isCmdLineEmpty(this));
			gInitialState = null;
		}
		
		if (lastSessionState != "stopped")
		{
			this.setTimeout(retryDownloads, 0, this);
		}
	}
	
	var tabpanels = this.getBrowser().mPanelContainer;
	Array.forEach(tabpanels.childNodes, function(aPanel) { onTabAdd(this, aPanel, true); }, this);
	tabpanels.addEventListener("DOMNodeInserted", onTabAdd_panels, false);
	tabpanels.addEventListener("DOMNodeRemoved", onTabRemove_panels, false);
	tabpanels.addEventListener("select", onTabSelect_panels, false);
}

function onWindowClose(aWindow, aIgnoreClosure)
{
	if (aWindow.document.documentElement.getAttribute("windowtype") != "navigator:browser" || !aWindow.__CRi)
	{
		return;
	}
	
	var tabpanels = aWindow.getBrowser().mPanelContainer;
	Array.forEach(tabpanels.childNodes, function(aPanel) { onTabRemove(this, aPanel, true); }, this);
	tabpanels.removeEventListener("DOMNodeInserted", onTabAdd_panels, false);
	tabpanels.removeEventListener("DOMNodeRemoved", onTabRemove_panels, false);
	tabpanels.removeEventListener("select", onTabSelect_panels, false);
	
	if (gLoadState == STATE_RUNNING && !aIgnoreClosure)
	{
		gLastClosedWindow = getCurrentState(aWindow);
		delete gWindows[aWindow.__CRi];
		saveStateDelayed();
		
		if (gQuitRequest)
		{
			var windows = {};
			forEachBrowserWindow(function(aWindow) { windows[aWindow.__CRi] = true; });
			for (var ix in gWindows)
			{
				if (!windows[ix])
				{
					delete gWindows[ix];
				}
			}
			gQuitRequest = null;
		}
		
		var notifyClosedWindow = gLastClosedWindow;
	}
	if (gLoadState == STATE_RUNNING && !getMostRecentBrowserWindow())
	{
		if (!getPref("allow_empty_session"))
		{
			gLoadState = STATE_STOPPED;
			gInitialState = getCurrentState();
			notifyClosedWindow = null;
		}
		else
		{
			gLastClosedWindow = null;
		}
	}
	if (notifyClosedWindow)
	{
		gObserverService.notifyObservers(aWindow, "crashrecovery:windowclosed", encodeINI(notifyClosedWindow));
	}
	
	delete aWindow.__CRi;
}

function onTabAdd_panels(aEvent)
{
	onTabAdd(this.ownerDocument.defaultView, aEvent.target);
}

function onTabAdd(aWindow, aBrowser, aNoNotification)
{
	aBrowser.addEventListener("load", onTabLoad_browser, true);
	aBrowser.addEventListener("pageshow", onTabLoad_browser, true);
	aBrowser.addEventListener("input", onTabInput_browser, true);
	aBrowser.addEventListener("DOMAutoComplete", onTabInput_browser, true);
	
	if (!aNoNotification)
	{
		saveStateDelayed(aWindow);
	}
}

function onTabRemove_panels(aEvent)
{
	onTabRemove(this.ownerDocument.defaultView, aEvent.target);
}

function onTabRemove(aWindow, aBrowser, aNoNotification)
{
	aBrowser.removeEventListener("load", onTabLoad_browser, true);
	aBrowser.removeEventListener("pageshow", onTabLoad_browser, true);
	aBrowser.removeEventListener("input", onTabInput_browser, true);
	aBrowser.removeEventListener("DOMAutoComplete", onTabInput_browser, true);
	
	aBrowser = ensureBrowser(aBrowser);
	delete aBrowser.__CR_data;
	delete aBrowser.__CR_text;
	
	if (!aNoNotification)
	{
		saveStateDelayed(aWindow);
	}
}

function onTabSelect_panels(aEvent)
{
	if (gLoadState == STATE_RUNNING)
	{
		var window = this.ownerDocument.defaultView;
		
		gWindows[window.__CRi].selected = this.selectedIndex + 1;
		saveStateDelayed(window);
	}
}

function onTabLoad_browser(aEvent)
{
	if (aEvent.type != "load" && !aEvent.persisted)
	{
		return;
	}
	
	var browser = ensureBrowser(this);
	var window = this.ownerDocument.defaultView;
	
	delete browser.__CR_data;
	delete browser.__CR_text;
	saveStateDelayed(window);
}

function onTabInput_browser(aEvent)
{
	if (saveTextData(ensureBrowser(this), aEvent.originalTarget))
	{
		var window = this.ownerDocument.defaultView;
		
		saveStateDelayed(window, 3000);
	}
}

function onPurgeHistory()
{
	forEachBrowserWindow(function(aWindow) {
		Array.forEach(aWindow.getBrowser().browsers, function(aBrowser) {
			delete aBrowser.__CR_data;
		});
	});
	clearDisk();
	
	var window = getMostRecentBrowserWindow();
	if (window)
	{
		window.setTimeout(saveState, 0, true);
	}
	else
	{
		saveState(true);
	}
}

/* :::::::: Saving Functionality ::::::::::::::: */

function getCurrentState(aWindow)
{
	if (!aWindow)
	{
		var activeWindow = getMostRecentBrowserWindow();
		
		if (gLoadState == STATE_RUNNING)
		{
			forEachBrowserWindow(function(aWindow) {
				if (gDirty.all || gDirty[aWindow.__CRi] || aWindow == activeWindow)
				{
					collectWindowData(aWindow);
				}
				else
				{
					updateWindowFeatures(aWindow);
				}
			});
			gDirty = {};
		}
		
		var winDataList = [], windows = [];
		for (var ix in gWindows)
		{
			winDataList.push(gWindows[ix]);
			windows.push(ix);
		}
		if (windows.length == 0 && gLastClosedWindow)
		{
			return gLastClosedWindow;
		}
		ix = (activeWindow)?windows.indexOf(activeWindow.__CRi || ""):-1;
		if (ix > 0)
		{
			winDataList.unshift(winDataList.splice(ix, 1)[0]);
		}
	}
	else
	{
		if (gLoadState == STATE_RUNNING)
		{
			collectWindowData(aWindow);
		}
		
		winDataList = [gWindows[aWindow.__CRi]];
	}
	
	updateCookies(winDataList);
	
	return { Window: winDataList };
}

function collectWindowData(aWindow)
{
	saveWindowHistory(aWindow);
	updateTextAndScrollData(aWindow);
	updateCookieHosts(aWindow);
	updateWindowFeatures(aWindow);
	
	gDirty[aWindow.__CRi] = false;
}

function saveWindowHistory(aWindow)
{
	var tabbrowser = aWindow.getBrowser();
	var browsers = tabbrowser.browsers;
	if (!tabbrowser.mTabs) // MultiZilla
	{
		tabbrowser.mTabs = tabbrowser.mTabContainer.childNodes;
	}
	var tabs = gWindows[aWindow.__CRi].Tab = [];
	gWindows[aWindow.__CRi].selected = 0;
	
	for (var i = 0; i < browsers.length; i++)
	{
		var tabData = { Entry: [], index: 0 };
		
		var browser = browsers[i];
		if (!browser)
		{
			tabs.push(tabData);
			continue;
		}
		
		try
		{
			var history = browser.sessionHistory;
		}
		catch (ex) { report(ex); }
		
		if (history && browser.__CR_data && browser.__CR_data.Entry[history.index])
		{
			tabData = browser.__CR_data;
			tabData.index = history.index + 1;
			if (tabData.recent && Date.now() - tabData.recent > POTENTIAL_CRASH_DELAY)
			{
				delete tabData.recent;
			}
		}
		else if (history && history.count > 0)
		{
			for (var j = 0; j < history.count; j++)
			{
				tabData.Entry.push(serializeHistoryEntry(history.getEntryAtIndex(j, false)));
			}
			tabData.index = history.index + 1;
			tabData.recent = Date.now();
			
			browser.__CR_data = tabData;
		}
		else if (browser.currentURI)
		{
			tabData.Entry[0] = { uri: browser.currentURI.spec };
			tabData.index = 1;
		}
		tabData.zoom = (((browser.markupDocumentViewer.textZoom - 1) || -1) + 1) || "";
		
		var disallow = gCapabilities.filter(function(aCapability) {
			return !browser.docShell["allow" + aCapability];
		});
		tabData.disallow = disallow.join(",");
		
		var xulattr = Array.filter(tabbrowser.mTabs[i].attributes, function(aAttr) {
			return aAttr.name.substr(0, 3).toUpperCase() == "CR_" || gXulAttributes.indexOf(aAttr.name) > -1;
		}).map(function(aAttr) {
			return aAttr.name + "=" + encodeURI(aAttr.value);
		});
		tabData.xultab = xulattr.join(" ");
		
		tabs.push(tabData);
		
		if (browser == tabbrowser.selectedBrowser)
		{
			gWindows[aWindow.__CRi].selected = i + 1;
		}
	}
}

function serializeHistoryEntry(aEntry)
{
	var entry = { uri: aEntry.URI.spec, Child: [] };
	
	if (aEntry.title && aEntry.title != entry.uri)
	{
		entry.title = aEntry.title;
	}
	if (aEntry.isSubFrame)
	{
		entry.subframe = true;
	}
	if (!(aEntry instanceof Ci.nsISHEntry))
	{
		return entry;
	}
	
	var cacheKey = aEntry.cacheKey;
	if (cacheKey && cacheKey instanceof Ci.nsISupportsPRUint32)
	{
		entry.cacheKey = cacheKey.data || "";
	}
	entry.ID = aEntry.ID;
	
	var x = {}, y = {};
	aEntry.getScrollPosition(x, y);
	entry.scroll = x.value + "," + y.value;
	
	try
	{
		if (gPrefs.postdata && aEntry.postData && checkPrivacyLevel(entry.uri))
		{
			aEntry.postData.QueryInterface(Ci.nsISeekableStream).seek(Ci.nsISeekableStream.NS_SEEK_SET, 0);
			var stream = Cc["@mozilla.org/scriptableinputstream;1"].createInstance(Ci.nsIScriptableInputStream);
			stream.init(aEntry.postData);
			var postdata = stream.read(stream.available());
			if (gPrefs.postdata == -1 || postdata.replace(/^(Content-.*\r\n)+(\r\n)*/, "").length <= gPrefs.postdata)
			{
				entry.postdata = postdata;
			}
		}
	}
	catch (ex) { report(ex); }
	
	if (!(aEntry instanceof Ci.nsISHContainer))
	{
		return entry;
	}
	
	for (var i = 0; i < aEntry.childCount; i++)
	{
		var child = aEntry.GetChildAt(i);
		if (child)
		{
			entry.Child.push(serializeHistoryEntry(child));
		}
		else
		{
			entry.Child.push({ uri: "about:blank" });
		}
	}
	
	return entry;
}

function saveTextData(aBrowser, aTextarea)
{
	var wrappedTextarea = XPCNativeWrapper(aTextarea);
	var id = (wrappedTextarea.id)?"#" + wrappedTextarea.id:wrappedTextarea.name;
	if (!id || !(wrappedTextarea instanceof Ci.nsIDOMHTMLTextAreaElement || wrappedTextarea instanceof Ci.nsIDOMHTMLInputElement))
	{
		return false;
	}
	
	if (!aBrowser.__CR_text)
	{
		aBrowser.__CR_text = {};
	}
	else if (aBrowser.__CR_text[aTextarea] && !aBrowser.__CR_text[aTextarea].cache)
	{
		return false;
	}
	
	var content = wrappedTextarea.ownerDocument.defaultView;
	while (content != content.top)
	{
		var frames = content.parent.frames;
		for (var i = frames.length - 1; i >= 0 && frames[i] != content; i--);
		id = i + "|" + id;
		content = content.parent;
	}
	
	aBrowser.__CR_text[aTextarea] = { id: id, element: wrappedTextarea };
	
	return true;
}

function updateTextAndScrollData(aWindow)
{
	Array.forEach(aWindow.getBrowser().browsers, function(aBrowser, aIx) {
		try
		{
			var tabData = gWindows[aWindow.__CRi].Tab[aIx];
			
			var text = [];
			if (aBrowser.__CR_text && checkPrivacyLevel(aBrowser.currentURI.spec))
			{
				for (var key in aBrowser.__CR_text)
				{
					var data = aBrowser.__CR_text[key];
					if (!data.cache)
					{
						data.cache = encodeURI(data.element.value);
					}
					text.push(data.id + "=" + data.cache);
				}
			}
			if (aBrowser.currentURI.spec == "about:config")
			{
				text = ["#textbox=" + encodeURI(aBrowser.contentDocument.getElementById("textbox").value)];
			}
			tabData.text = text.join(" ");
			
			updateScrollDataRecursively(aWindow, XPCNativeWrapper(aBrowser.contentWindow), tabData.Entry[tabData.index - 1]);
		}
		catch (ex) { report(ex); }
	});
}

function updateScrollDataRecursively(aWindow, aContent, aData)
{
	for (var i = aContent.frames.length - 1; i >= 0; i--)
	{
		if (aData.Child && aData.Child[i])
		{
			updateScrollDataRecursively(aWindow, aContent.frames[i], aData.Child[i]);
		}
	}
	if ((aContent.document.designMode || "") == "on" && checkPrivacyLevel((aContent.parent || aContent).document.location.href))
	{
		if (aData.innerHTML == undefined)
		{
			aContent.addEventListener("keypress", function(aEvent) { saveStateDelayed(aWindow, 3000); }, true);
		}
		aData.innerHTML = aContent.document.body.innerHTML;
	}
	aData.scroll = aContent.scrollX + "," + aContent.scrollY;
}

function updateCookieHosts(aWindow)
{
	var hosts = gWindows[aWindow.__CRi]._hosts = {};
	
	function extractHosts(aEntry)
	{
		if (/^https?:\/\/(?:[^@\/\s]+@)?([\w.-]+)/.test(aEntry.uri) && !hosts[RegExp.$1] && checkPrivacyLevel(aEntry.uri))
		{
			var host = RegExp.$1;
			for (var ix = host.indexOf(".") + 1; ix; ix = host.indexOf(".", ix) + 1)
			{
				hosts[host.substr(ix)] = true;
			}
			hosts[host] = true;
		}
		if (aEntry.Child)
		{
			aEntry.Child.forEach(extractHosts);
		}
	}
	
	gWindows[aWindow.__CRi].Tab.forEach(function(aTabData) { aTabData.Entry.forEach(extractHosts); });
}

function updateCookies(aWindows)
{
	var cookiesEnum = Cc["@mozilla.org/cookiemanager;1"].getService(Ci.nsICookieManager).enumerator;
	var cookieSets = aWindows.map(function() { return { count: 0 }; });
	
	while (cookiesEnum.hasMoreElements())
	{
		var cookie = cookiesEnum.getNext().QueryInterface(Ci.nsICookie2);
		if (cookie.isSession && cookie.host)
		{
			var url = "", value = "";
			aWindows.forEach(function(aWindow, aIx) {
				if (aWindow._hosts && aWindow._hosts[cookie.rawHost])
				{
					if (!url)
					{
						url = "http" + ((cookie.isSecure)?"s":"") + "://" + cookie.host + (cookie.path || "").replace(/^(?!\/)/, "/");
						if (checkPrivacyLevel(url))
						{
							value = (cookie.name || "name") + "=" + (cookie.value || "") + ";";
							value += (cookie.isDomain)?"domain=" + cookie.rawHost + ";":"";
							value += (cookie.path)?"path=" + cookie.path + ";":"";
							value += (cookie.isSecure)?"secure;":"";
						}
					}
					if (value)
					{
						var set = cookieSets[aIx];
						set["domain" + ++set.count] = url;
						set["value" + set.count] = value;
					}
				}
			});
		}
	}
	
	cookieSets.forEach(function(aSet, aIx) { aWindows[aIx].Cookies = (aSet.count > 0)?aSet:null; });
}

function updateWindowFeatures(aWindow)
{
	var winData = gWindows[aWindow.__CRi];
	
	gWinAttributes.forEach(function(aAttr) { winData[aAttr] = getWindowDimension(aWindow, aAttr); });
	
	winData.hidden = gWinHidable.filter(function(aItem) {
		return aWindow[aItem] && !aWindow[aItem].visible;
	}).join(",");
	
	if (aWindow.toggleSidebar) // Firefox
	{
		winData.sidebar = aWindow.document.getElementById("sidebar-box").getAttribute("sidebarcommand");
	}
	else if (aWindow.sidebar_is_hidden) // SeaMonkey
	{
		winData.sidebar = !aWindow.sidebar_is_hidden();
	}
}


/* :::::::: Restoring Functionality ::::::::::::::: */

function restoreWindow(aWindow, aRootObj, aOverwriteTabs)
{
	for (var w = aRootObj.Window.length - 1; w >= 1; w--)
	{
		var winObj = aRootObj.Window[w];
		if (winObj.Tab && winObj.Tab.length > 0)
		{
			openWindowWithState({ Window: [winObj], opener: aWindow, _crashed: aRootObj._crashed || false });
		}
	}
	
	var winData = aRootObj.Window[0];
	if (!winData.Tab)
	{
		winData.Tab = [];
	}
	var tabbrowser = aWindow.getBrowser();
	if (!tabbrowser.mTabs) // MultiZilla
	{
		tabbrowser.mTabs = tabbrowser.mTabContainer.childNodes;
		tabbrowser.moveTabTo = tabbrowser.moveTabTo || tabbrowser.moveTab;
	}
	var openTabCount = (aOverwriteTabs)?tabbrowser.browsers.length:-1;
	var newTabCount = winData.Tab.length;
	
	for (var t = 0; t < newTabCount; t++)
	{
		winData.Tab[t]._tab = (t < openTabCount)?tabbrowser.mTabs[t]:tabbrowser.addTab();
		if (!aOverwriteTabs && aRootObj._firstTabs)
		{
			tabbrowser.moveTabTo(winData.Tab[t]._tab, t);
		}
	}
	for (t = openTabCount - 1; t >= newTabCount; t--)
	{
		tabbrowser.removeTab(tabbrowser.mTabs[t]);
	}
	
	if (aOverwriteTabs)
	{
		restoreWindowFeatures(aWindow, winData, aRootObj.opener || null);
	}
	if (winData.Cookies)
	{
		restoreCookies(winData.Cookies);
	}
	
	aWindow.setTimeout(restoreHistory_window, 0, winData.Tab, (aOverwriteTabs)?parseInt(winData.selected) || 1:0, (aRootObj._crashed)?getPref("crash_warning_uri"):null, 0, 0);
}

function restoreHistory_window(aTabs, aSelectTab, aWarningURL, aIx, aCount)
{
	var tabbrowser = this.getBrowser();
	
	for (var t = aIx; t < aTabs.length; t++)
	{
		try
		{
			if (!tabbrowser.getBrowserForTab(aTabs[t]._tab).webNavigation.sessionHistory)
			{
				throw new Error();
			}
		}
		catch (ex)
		{
			if (++aCount < 10)
			{
				this.setTimeout(restoreHistory_window, 100, aTabs, aSelectTab, aWarningURL, t, aCount);
				return;
			}
		}
	}
	
	try
	{
		var tabLoading = getStringBundle("chrome://global/locale/tabbrowser.properties").GetStringFromName("tabs.loading");
		for (t = 0; t < aTabs.length; t++)
		{
			var tab = aTabs[t]._tab;
			tab.setAttribute("busy", "true");
			tab.removeAttribute("image");
			tab.label = tabLoading;
		}
	}
	catch (ex) { }
	
	if (aSelectTab-- && aTabs[aSelectTab])
	{
		aTabs.unshift(aTabs.splice(aSelectTab, 1)[0]);
		tabbrowser.selectedTab = aTabs[0]._tab;
	}
	
	this.setTimeout(restoreHistory, 0, this, aTabs, aWarningURL, null);
}

function restoreHistory(aWindow, aTabs, aWarningURL, aIdMap)
{
	while (aTabs.length > 0 && (!aTabs[0]._tab || !aTabs[0]._tab.parentNode))
	{
		aTabs.shift();
	}
	if (aTabs.length == 0)
	{
		return;
	}
	
	var tabData = aTabs.shift();
	var idMap = aIdMap || { used: {} };
	
	var tab = tabData._tab;
	var browser = aWindow.getBrowser().getBrowserForTab(tab);
	var history = browser.webNavigation.sessionHistory;
	
	if (history.count > 0)
	{
		history.PurgeHistory(history.count);
	}
	history.QueryInterface(Ci.nsISHistoryInternal);
	
	if (!tabData.Entry)
	{
		tabData.Entry = [];
	}
	
	browser.markupDocumentViewer.textZoom = parseFloat(tabData.zoom || 1);
	
	if (tabData.recent && !tabData.text && aWarningURL)
	{
		var warnEntry = { uri: aWarningURL };
		if (tabData.index < tabData.Entry.length)
		{
			warnEntry.uri += "#" + tabData.index;
		}
		tabData.Entry.push(warnEntry);
		tabData.index = tabData.Entry.length;
	}
	for (var i = 0; i < tabData.Entry.length; i++)
	{
		history.addEntry(deserializeHistoryEntry(tabData.Entry[i], idMap), true);
	}
	
	var disallow = (tabData.disallow)?tabData.disallow.split(","):[];
	gCapabilities.forEach(function(aCapability) {
		browser.docShell["allow" + aCapability] = disallow.indexOf(aCapability) == -1;
	});
	Array.filter(tab.attributes, function(aAttr) {
		return aAttr.name.substr(0, 3).toUpperCase() == "CR_" || gXulAttributes.indexOf(aAttr.name) > -1;
	}).forEach(tab.removeAttribute, tab);
	if (tabData.xultab)
	{
		tabData.xultab.split(" ").forEach(function(aAttr) {
			if (/^([^\s=]+)=(.*)/.test(aAttr))
			{
				tab.setAttribute(RegExp.$1, decodeURI(RegExp.$2));
			}
		});
	}
	
	var event = aWindow.document.createEvent("Events");
	event.initEvent("CRTabRestoring", true, false);
	tab.dispatchEvent(event);
	
	var activeIndex = (tabData.index || tabData.Entry.length) - 1;
	try
	{
		browser.webNavigation.gotoIndex(activeIndex);
	}
	catch (ex) { report(ex); }
	
	browser.__CR_restore_data = tabData.Entry[activeIndex] || {};
	browser.__CR_restore_text = tabData.text || "";
	browser.__CR_restore_tab = tab;
	browser.__CR_restore = restoreDocument_browser;
	browser.addEventListener("load", browser.__CR_restore, true);
	
	aWindow.setTimeout(restoreHistory, 0, aWindow, aTabs, aWarningURL, idMap);
}

function deserializeHistoryEntry(aEntry, aIdMap)
{
	var shEntry = Cc["@mozilla.org/browser/session-history-entry;1"].createInstance(Ci.nsISHEntry);
	
	shEntry.setURI(gIOService.newURI(aEntry.uri, null, null));
	shEntry.setTitle(aEntry.title || aEntry.uri);
	shEntry.setIsSubFrame(aEntry.subframe || false);
	shEntry.loadType = Ci.nsIDocShellLoadInfo.loadHistory;
	
	if (aEntry.cacheKey)
	{
		var cacheKey = Cc["@mozilla.org/supports-PRUint32;1"].createInstance(Ci.nsISupportsPRUint32);
		cacheKey.data = aEntry.cacheKey;
		shEntry.cacheKey = cacheKey;
	}
	if (aEntry.ID)
	{
		var id = aIdMap[aEntry.ID] || 0;
		if (!id)
		{
			for (id = Date.now(); aIdMap.used[id]; id++);
			aIdMap[aEntry.ID] = id;
			aIdMap.used[id] = true;
		}
		shEntry.ID = id;
	}
	
	var scrollPos = (aEntry.scroll || "0,0").split(",");
	scrollPos = [parseInt(scrollPos[0]) || 0, parseInt(scrollPos[1]) || 0];
	shEntry.setScrollPosition(scrollPos[0], scrollPos[1]);
	
	if (aEntry.postdata)
	{
		var stream = Cc["@mozilla.org/io/string-input-stream;1"].createInstance(Ci.nsIStringInputStream);
		stream.setData(aEntry.postdata, -1);
		shEntry.postData = stream;
	}
	
	if (aEntry.Child && shEntry instanceof Ci.nsISHContainer)
	{
		for (var i = 0; i < aEntry.Child.length; i++)
		{
			shEntry.AddChild(deserializeHistoryEntry(aEntry.Child[i], aIdMap), i);
		}
	}
	
	return shEntry;
}

function restoreDocument_browser(aEvent)
{
	if (!aEvent || !aEvent.originalTarget || !aEvent.originalTarget.defaultView || aEvent.originalTarget.defaultView != aEvent.originalTarget.defaultView.top)
	{
		return;
	}
	
	var content = XPCNativeWrapper(aEvent.originalTarget).defaultView;
	if (this.currentURI.spec == "about:config")
	{
		content = aEvent.originalTarget.defaultView;
	}
	var textArray = (this.__CR_restore_text)?this.__CR_restore_text.split(" "):[];
	restoreTextDataAndScrolling(content, this.__CR_restore_data, "", textArray);
	
	var event = this.ownerDocument.createEvent("Events");
	event.initEvent("CRTabRestored", true, false);
	this.__CR_restore_tab.dispatchEvent(event);
	
	this.removeEventListener("load", this.__CR_restore, true);
	delete this.__CR_restore_data;
	delete this.__CR_restore_text;
	delete this.__CR_restore_tab;
	delete this.__CR_restore;
}

function restoreTextData(aContent, aPrefix, aTextArray)
{
	aTextArray.forEach(function(aEntry) {
		if (/^((?:\d+\|)*)(#?)([^\s=]+)=(.*)$/.test(aEntry) && (!RegExp.$1 || RegExp.$1 == aPrefix))
		{
			var document = aContent.document;
			var node = (RegExp.$2)?document.getElementById(RegExp.$3):document.getElementsByName(RegExp.$3)[0] || null;
			if (node && "value" in node)
			{
				node.value = decodeURI(RegExp.$4);
				
				var event = document.createEvent("UIEvents");
				event.initUIEvent("input", true, true, aContent, 0);
				node.dispatchEvent(event);
			}
		}
	});
}

function restoreTextDataAndScrolling(aContent, aData, aPrefix, aTextArray)
{
	restoreTextData(aContent, aPrefix, aTextArray);
	if (aData.innerHTML)
	{
		aContent.setTimeout(function(aHTML) { if (this.document.designMode == "on") { this.document.body.innerHTML = aHTML; } }, 0, aData.innerHTML);
	}
	if (aData.scroll && /(\d+),(\d+)/.test(aData.scroll))
	{
		aContent.scrollTo(RegExp.$1, RegExp.$2);
	}
	for (var i = 0; i < aContent.frames.length; i++)
	{
		if (aData.Child && aData.Child[i])
		{
			restoreTextDataAndScrolling(aContent.frames[i], aData.Child[i], i + "|" + aPrefix, aTextArray);
		}
	}
}

function restoreWindowFeatures(aWindow, aWinData, aOpener)
{
	var hidden = (aWinData.hidden)?aWinData.hidden.split(","):[];
	gWinHidable.forEach(function(aItem) {
		aWindow[aItem].visible = hidden.indexOf(aItem) == -1;
	});
	
	aWindow.setTimeout(restoreDimensions, 0, aWindow, aOpener, aWinData.width || 0, aWinData.height || 0, ("screenX" in aWinData)?aWinData.screenX:NaN, ("screenY" in aWinData)?aWinData.screenY:NaN, aWinData.sizemode || "", aWinData.sidebar || "");
}

function restoreDimensions(aWindow, aOpener, aWidth, aHeight, aLeft, aTop, aSizeMode, aSidebar)
{
	function win_(aName) { return getWindowDimension(aWindow, aName); }
	
	if (aWidth && aHeight && (aWidth != win_("width") || aHeight != win_("height")))
	{
		aWindow.resizeTo(aWidth, aHeight);
	}
	if (!isNaN(aLeft) && !isNaN(aTop) && (aLeft != win_("screenX") || aTop != win_("screenY")))
	{
		aWindow.moveTo(aLeft, aTop);
	}
	if (aSizeMode == "maximized" && win_("sizemode") != "maximized")
	{
		aWindow.maximize();
	}
	else if (aSizeMode && aSizeMode != "maximized" && win_("sizemode") != "normal")
	{
		aWindow.restore();
	}
	var sidebar = aWindow.document.getElementById("sidebar-box");
	if (aWindow.toggleSidebar && sidebar.getAttribute("sidebarcommand") != aSidebar)
	{
		aWindow.toggleSidebar(aSidebar);
	}
	else if (aWindow.sidebar_is_hidden && aWindow.sidebar_is_hidden() != !aSidebar)
	{
		aWindow.SidebarShowHide();
	}
	if (aOpener)
	{
		aOpener.focus();
	}
}

function restoreCookies(aCookies)
{
	var cookieService = Cc["@mozilla.org/cookieService;1"].getService(Ci.nsICookieService);
	
	for (var i = 1; i <= aCookies.count; i++)
	{
		try
		{
			cookieService.setCookieString(gIOService.newURI(aCookies["domain" + i], null, null), null, aCookies["value" + i] + "expires=0;", null);
		}
		catch (ex) { report(ex); }
	}
}

// code adapted from Danil Ivanov's "Cache Fixer" extension
function restoreCache()
{
	var cache = Cc["@mozilla.org/file/directory_service;1"].getService(Ci.nsIProperties).get("ProfLD", Ci.nsILocalFile);
	cache.append("Cache");
	cache.append("_CACHE_MAP_");
	if (!cache.exists())
	{
		return;
	}
	
	var stream = Cc["@mozilla.org/network/file-input-stream;1"].createInstance(Ci.nsIFileInputStream);
	stream.init(cache, 0x01, 0, 0); // PR_RDONLY
	var input = Cc["@mozilla.org/binaryinputstream;1"].createInstance(Ci.nsIBinaryInputStream);
	input.setInputStream(stream);
	var content = input.readByteArray(input.available());
	input.close();
	
	if (content[15] != 1)
	{
		return;
	}
	content[15] = 0;
	
	stream = Cc["@mozilla.org/network/file-output-stream;1"].createInstance(Ci.nsIFileOutputStream);
	stream.init(cache, 0x02 | 0x20, 0600, 0); // PR_WRONLY | PR_TRUNCATE
	var output = Cc["@mozilla.org/binaryoutputstream;1"].createInstance(Ci.nsIBinaryOutputStream);
	output.setOutputStream(stream);
	output.writeByteArray(content, content.length);
	output.flush();
	output.close();
}

function retryDownloads(aWindow)
{
	var downloadManager = Cc["@mozilla.org/download-manager;1"].getService(Ci.nsIDownloadManager);
	var rdfService = Cc["@mozilla.org/rdf/rdf-service;1"].getService(Ci.nsIRDFService);
	var ioService = Cc["@mozilla.org/network/io-service;1"].getService(Ci.nsIIOService);
	
	var rdfContainer = Cc["@mozilla.org/rdf/container;1"].createInstance(Ci.nsIRDFContainer);
	var datasource = downloadManager.datasource;
	
	try
	{
		rdfContainer.Init(datasource, rdfService.GetResource("NC:DownloadsRoot"));
	}
	catch (ex)
	{
		// SeaMonkey doesn't support saveURL without user interaction, so we stop here
		// (it doesn't support downloadManager.datasource, either)
		return;
	}
	
	var downloads = rdfContainer.GetElements();
	
	while (downloads.hasMoreElements())
	{
		var download = downloads.getNext().QueryInterface(Ci.nsIRDFResource);
		
		var node = datasource.GetTarget(rdfService.GetResource(download.Value), rdfService.GetResource("http://home.netscape.com/NC-rdf#DownloadState"), true);
		if (!node || node.QueryInterface(Ci.nsIRDFInt).Value != Ci.nsIDownloadManager.DOWNLOAD_DOWNLOADING)
		{
			continue;
		}
		
		node = datasource.GetTarget(rdfService.GetResource(download.Value), rdfService.GetResource("http://home.netscape.com/NC-rdf#URL"), true).QueryInterface(Ci.nsIRDFResource);
		
		var url = node.Value;
		
		node = datasource.GetTarget(rdfService.GetResource(download.Value), rdfService.GetResource("http://home.netscape.com/NC-rdf#File"), true).QueryInterface(Ci.nsIRDFResource);
		
		var linkChecker = Cc["@mozilla.org/network/urichecker;1"].createInstance(Ci.nsIURIChecker);
		
		linkChecker.init(ioService.newURI(url, null, null));
		linkChecker.loadFlags = Ci.nsIRequest.LOAD_BACKGROUND;
		linkChecker.asyncCheck(new AutoDownloader(url, node.Value, aWindow), null);
	}
}

/* ........ Asynchronous File Downloader .............. */

function AutoDownloader(aURL, aFilename, aWindow)
{
	this.mURL = aURL;
	this.mFilename = aFilename;
	this.mWindow = aWindow;
}

AutoDownloader.prototype = {
	onStartRequest: function(aRequest, aContext) { },

	onStopRequest: function(aRequest, aContext, aStatus)
	{
		if (Components.isSuccessCode(aStatus))
		{
			var file = Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsILocalFile);
			file.initWithPath(this.mFilename);
			if (file.exists())
			{
				file.remove(false);
			}
			
			this.mWindow.saveURL(this.mURL, this.mFilename, null, true, true, null);
		}
	}
};


/* :::::::: Timed Session Saving Functionality ::::::::::::::: */

function saveStateDelayed(aWindow, aDelay)
{
	if (aWindow)
	{
		gDirty[aWindow.__CRi] = true;
	}
	if (!gSaveTimer)
	{
		aDelay = Math.max(gLastSaveTime - Date.now() + gPrefs.interval, aDelay || Math.min(gPrefs.interval, 2000));
		if (aDelay > 0)
		{
			gSaveTimer = Cc["@mozilla.org/timer;1"].createInstance(Ci.nsITimer);
			gSaveTimer.init(gSaveStateDelayedObserver, aDelay, Ci.nsITimer.TYPE_ONE_SHOT);
		}
		else
		{
			saveState();
		}
	}
}

/*const*/ var gSaveStateDelayedObserver = {
	observe: function(aSubject, aTopic, aData)
	{
		gSaveTimer = null;
		saveState();
	}
};

function saveState(aUpdateAll)
{
	if (!gLastSaveTime)
	{
		return;
	}
	if (gSaveTimer)
	{
		gSaveTimer.cancel();
		gSaveTimer = null;
	}
	
	gDirty.all = aUpdateAll;
	gThreadedSaver.saveCurrentState(aUpdateAll);
	gLastSaveTime = Date.now();
}

function clearDisk()
{
	delFile(getSessionFile());
	delFile(getSessionFile("bak"));
	delFile(getSessionFile("dat.tmp", true));
}

function getSessionFile(aExt, aLocal)
{
	var dirs = Cc["@mozilla.org/file/directory_service;1"].getService(Ci.nsIProperties);
	try
	{
		var file = dirs.get((!aLocal)?"ProfD":"ProfLD", Ci.nsILocalFile);
	}
	catch (ex)
	{
		file = dirs.get("ProfD", Ci.nsILocalFile);
	}
	file.append("crashrecovery." + (aExt || "dat"));
	
	return file;
}

/* ........ Threaded State Saver .............. */

/*const*/ var gThreadedSaver = {
	saveCurrentState: function(aMainThread)
	{
		if (this.mThread)
		{
			try
			{
				if (Ci.nsIThreadManager)
				{
					this.mThread.shutdown();
				}
				else
				{
					this.mThread.join();
				}
			}
			catch (ex) { report(ex); }
			this.mThread = null;
		}
		
		this.mState = getCurrentState();
		if (aMainThread)
		{
			this.run();
		}
		else if (Ci.nsIThreadManager)
		{
			this.mThread = Cc["@mozilla.org/thread-manager;1"].getService(Ci.nsIThreadManager).newThread(0);
			this.mThread.QueryInterface(Ci.nsIEventTarget).dispatch(this, Ci.nsIEventTarget.DISPATCH_NORMAL)
		}
		else
		{
			this.mThread = Cc["@mozilla.org/thread;1"].createInstance(Ci.nsIThread);
			this.mThread.init(this, 128 * 1024, Ci.nsIThread.PRIORITY_NORMAL, Ci.nsIThread.SCOPE_GLOBAL, Ci.nsIThread.STATE_JOINABLE);
		}
	},

	run: function()
	{
		var tmpFile = getSessionFile("dat.tmp", true);
		writeFile(tmpFile, [
			"; This file will be periodically overwritten by Crash Recovery",
			"; Do not edit while the state indicated below is 'running'",
			"; The file encoding is UTF-8",
			"[CrashRecovery]",
			"state=" + ((gLoadState == STATE_RUNNING)?"running":"stopped"),
			"date=" + (new Date()).toString(),
			encodeINI(this.mState),
			""
		].join("\n").replace(/\n\[/g, "\n$&"));
		
		var sessionFile = getSessionFile();
		tmpFile.moveTo(sessionFile.parent, sessionFile.leafName);
	}
};


/* :::::::: Auxiliary Functions ::::::::::::::: */

function forEachBrowserWindow(aFunc)
{
	var windowsEnum = gWindowMediator.getEnumerator("navigator:browser");
	while (windowsEnum.hasMoreElements())
	{
		var window = windowsEnum.getNext();
		if (window.__CRi)
		{
			aFunc(window);
		}
	}
}

function getMostRecentBrowserWindow()
{
	return gWindowMediator.getMostRecentWindow("navigator:browser");
}

function openWindowWithState(aState)
{
	var argString = Cc["@mozilla.org/supports-string;1"].createInstance(Ci.nsISupportsString);
	argString.data = "";
	
	var window = Cc["@mozilla.org/embedcomp/window-watcher;1"].getService(Ci.nsIWindowWatcher).openWindow(null, getPref("browser.chromeURL", null, true), "_blank", "chrome,all,dialog=no", argString);
	
	window.__CR_state = aState;
	window.addEventListener("load", openWindowWithState_onLoad_window, true);
}

function openWindowWithState_onLoad_window()
{
	this.removeEventListener("load", openWindowWithState_onLoad_window, true);
	restoreWindow(this, this.__CR_state, true);
	delete this.__CR_state;
}

function doResumeSession()
{
	return getPref("resume_session") || getPref("resume_session_once") || getPref("browser.startup.page", 1, true) == 3 || getPref("browser.startup.page", 1, true) == 2;
}

function doRecoverSession(aRepeatedCrash)
{
	if (!getPref("restore_prompt", true))
	{
		return true;
	}
	
	var recover = true;
	var dontPrompt = { value: false };
	var dialogURI = getPref("restore_prompt_uri");
	
	try
	{
		if (dialogURI)
		{
			var params = Cc["@mozilla.org/embedcomp/dialogparam;1"].createInstance(Ci.nsIDialogParamBlock);
			params.SetInt(0, (aRepeatedCrash)?0:1);
			params.SetInt(1, 0);
			Cc["@mozilla.org/embedcomp/window-watcher;1"].getService(Ci.nsIWindowWatcher).openWindow(null, dialogURI, "_blank", "chrome,modal,centerscreen,titlebar,dialog=yes", params);
			recover = params.GetInt(0) == 0;
			dontPrompt.value = params.GetInt(1);
		}
		else if (aRepeatedCrash)
		{
			var strings = getStringBundle("chrome://crashrecovery/locale/crashrecovery.properties");
			var branding = getStringBundle("chrome://branding/locale/brand.properties");
			
			recover = Cc["@mozilla.org/embedcomp/prompt-service;1"].getService(Ci.nsIPromptService).confirmCheck(null, "Crash Recovery - " + branding.GetStringFromName("brandFullName"), strings.GetStringFromName("restore_prompt"), strings.GetStringFromName("restore_prompt_again"), dontPrompt);
		}
	}
	catch (ex) { report(ex); }
	
	if (dontPrompt.value)
	{
		gPrefBranch.setBoolPref("restore_prompt", false);
	}
	
	return recover;
}

function isCmdLineEmpty(aWindow)
{
	if (!aWindow.arguments || !aWindow.arguments[0])
	{
		return true;
	}
	
	var homepage = "about:blank";
	switch (getPref("browser.startup.page", 1, true))
	{
	case 1:
		try
		{
			homepage = gPrefRoot.getComplexValue("browser.startup.homepage", Ci.nsIPrefLocalizedString).data;
		}
		catch (ex)
		{
			homepage = getPref("browser.startup.homepage", "", true);
		}
		homepage = homepage.split("\n")[0];
		break;
	case 2:
		homepage = Cc["@mozilla.org/browser/global-history;2"].getService(Ci.nsIBrowserHistory).lastPageVisited;
		break;
	}
	
	if (aWindow.arguments[0] == homepage)
	{
		aWindow.arguments[0] = null;
	}
	
	return !aWindow.arguments[0];
}

function getWindowDimension(aWindow, aAttribute)
{
	if (aAttribute == "sizemode")
	{
		return (aWindow.windowState == aWindow.STATE_MAXIMIZED)?"maximized":"normal";
	}
	
	var equivalents = { width: "outerWidth", height: "outerHeight" };
	var attribute = equivalents[aAttribute] || aAttribute;
	var dimension = (attribute in aWindow)?aWindow[attribute]:"";
	
	if (aWindow.windowState == aWindow.STATE_NORMAL)
	{
		return dimension;
	}
	return aWindow.document.documentElement.getAttribute(aAttribute) || dimension;
}

function checkPrivacyLevel(aURL)
{
	return gPrefs.privacy_level < ((aURL.substr(0, 6) == "https:")?1:2);
}

function ensureBrowser(aBrowser)
{
	if (aBrowser.localName == "browser")
	{
		return aBrowser;
	}
	
	var children = aBrowser.childNodes;
	for (var i = children.length - 1; i >= 0; i--)
	{
		if (children[i].localName == "browser")
		{
			return children[i];
		}
	}
	
	return aBrowser.getElementsByTagName("browser")[0] || null;
}

function getStringBundle(aURI)
{
	return Cc["@mozilla.org/intl/stringbundle;1"].getService(Ci.nsIStringBundleService).createBundle(aURI, Cc["@mozilla.org/intl/nslocaleservice;1"].getService(Ci.nsILocaleService).getApplicationLocale());
}


/* :::::::: Storage API ::::::::::::::: */

function getPref(aName, aDefault, aUseRootBranch)
{
	try
	{
		var pb = (aUseRootBranch)?gPrefRoot:gPrefBranch;
		switch (pb.getPrefType(aName))
		{
		case pb.PREF_STRING:
			return pb.getCharPref(aName);
		case pb.PREF_BOOL:
			return pb.getBoolPref(aName);
		case pb.PREF_INT:
			return pb.getIntPref(aName);
		}
	}
	catch (ex) { /* return the default value */ }
	
	return aDefault;
}

function readFile(aFile)
{
	if (!aFile.exists())
	{
		return null;
	}
	
	var stream = Cc["@mozilla.org/network/file-input-stream;1"].createInstance(Ci.nsIFileInputStream);
	stream.init(aFile, 0x01, 0, 0);
	var cvstream = Cc["@mozilla.org/intl/converter-input-stream;1"].createInstance(Ci.nsIConverterInputStream);
	cvstream.init(stream, "UTF-8", 1024, Ci.nsIConverterInputStream.DEFAULT_REPLACEMENT_CHARACTER);
	
	var content = "";
	var data = {};
	while (cvstream.readString(4096, data))
	{
		content += data.value;
	}
	cvstream.close();
	
	return content.replace(/\r\n?/g, "\n");
}

function writeFile(aFile, aData)
{
	var stream = Cc["@mozilla.org/network/file-output-stream;1"].createInstance(Ci.nsIFileOutputStream);
	stream.init(aFile, 0x02 | 0x08 | 0x20, 0600, 0);
	var cvstream = Cc["@mozilla.org/intl/converter-output-stream;1"].createInstance(Ci.nsIConverterOutputStream);
	cvstream.init(stream, "UTF-8", 0, Ci.nsIConverterInputStream.DEFAULT_REPLACEMENT_CHARACTER);
	
	cvstream.writeString(aData.replace(/\n/g, getEOL()));
	cvstream.flush();
	cvstream.close();
}

function getEOL()
{
	if (!Ci.nsIXULRuntime) // SeaMonkey
	{
		return "\r\n";
	}
	
	var OS = Cc["@mozilla.org/xre/app-info;1"].getService(Ci.nsIXULRuntime).OS;
	return /win|os[\/_]?2/i.test(OS)?"\r\n":/mac/i.test(OS)?"\r":"\n";
}

function delFile(aFile)
{
	try
	{
		if (aFile.exists())
		{
			aFile.remove(false);
		}
	}
	catch (ex) { report(ex); }
}


/* :::::::: File Format Conversion ::::::::::::::: */

function encodeINI(aObj, aPrefix)
{
	aPrefix = (aPrefix)?aPrefix + ".":"";
	
	var ini = [], iniChildren = [];
	
	for (var key in aObj)
	{
		if (!key || /[;\[\]=]/.test(key))
		{
			report("Ignoring invalid key name: '" + key + "'!");
			continue;
		}
		else if (key.charAt(0) == "_")
		{
			continue;
		}
		
		var value = aObj[key];
		if (typeof value == "boolean" || typeof value == "number")
		{
			ini.push(key + "=" + value);
		}
		else if (typeof value == "string" && value)
		{
			ini.push(key + "=" + ((/^\s|[%\t\r\n;]|\s$/.test(value))?encodeURI(value).replace(/;/g, "%3B"):value));
		}
		else if (value instanceof Array)
		{
			for (var i = 0; i < value.length; i++)
			{
				if (value[i] instanceof Object)
				{
					iniChildren.push("[" + aPrefix + key + (i + 1) + "]");
					iniChildren.push(encodeINI(value[i], aPrefix + key + (i + 1)));
				}
			}
		}
		else if (typeof value == "object" && value)
		{
			iniChildren.push("[" + aPrefix + key + "]");
			iniChildren.push(encodeINI(value, aPrefix + key));
		}
	}
	
	return ini.concat(iniChildren).join("\n");
}

function decodeINI(aIniString)
{
	if (CR_ini_isOldFormat(aIniString))
	{
		return CR_ini_decodeOldFormat(aIniString);
	}
	
	var rootObject = {};
	var obj = rootObject;
	var lines = aIniString.split("\n");
	
	for (var i = 0; i < lines.length; i++)
	{
		try
		{
			if (lines[i].charAt(0) == "[")
			{
				obj = ini_getObjForHeader(rootObject, lines[i]);
			}
			else if (lines[i] && lines[i].charAt(0) != ";")
			{
				ini_setValueForLine(obj, lines[i]);
			}
		}
		catch (ex)
		{
			throw new Error("Error at line " + (i + 1) + ": " + ex.description);
		}
	}
	
	return rootObject;
}

function ini_getObjForHeader(aObj, aLine)
{
	var names = aLine.split("]")[0].substr(1).split(".");
	
	for (var i = 0; i < names.length; i++)
	{
		var name = names[i];
		if (!names[i])
		{
			throw new Error("Invalid header: [" + names.join(".") + "]!");
		}
		if (/(\d+)$/.test(names[i]))
		{
			names[i] = names[i].slice(0, -RegExp.$1.length);
			var ix = parseInt(RegExp.$1) - 1;
			aObj = aObj[names[i]] = aObj[names[i]] || [];
			aObj = aObj[ix] = aObj[ix] || {};
		}
		else
		{
			aObj = aObj[names[i]] = aObj[names[i]] || {};
		}
	}
	
	return aObj;
}

function ini_setValueForLine(aObj, aLine)
{
	var ix = aLine.indexOf("=");
	if (ix < 1)
	{
		throw new Error("Invalid entry: " + aLine + "!");
	}
	
	var value = aLine.substr(ix + 1);
	if (value == "true" || value == "false")
	{
		value = (value == "true");
	}
	else if (/^\d+$/.test(value))
	{
		value = parseInt(value);
	}
	else if (value.indexOf("%") > -1)
	{
		value = decodeURI(value.replace(/%3B/gi, ";"));
	}
	
	aObj[aLine.substr(0, ix)] = value;
}

function CR_ini_isOldFormat(aString)
{
	return /^-?\d+.*~~~~/.test(aString);
}

function CR_ini_decodeOldFormat(aString)
{
	aString = aString.replace(/^(.*?) ~~~~( .*)?/, "$1");
	var root = { CrashRecovery: { state: (RegExp.$2)?"running":"stopped" } };
	
	root.Window = aString.split("\n- WINDOW -----\n").map(function(aWindow) {
		var winData = {};
		var tabs = aWindow.split("\n-- TAB ----\n");
		var cookies = tabs.shift().split("\n");
		var features = cookies.shift();
		
		winData.selected = parseInt(features) + 1;
		if (/ dims:(\S+)/.test(features))
		{
			RegExp.$1.split(",").forEach(function(aFeat) {
				if (/^(\S+)=(.*)/.test(aFeat)) winData[RegExp.$1] = decodeURI(RegExp.$2);
			});
		}
		if (/ hide:(\S+)/.test(features)) winData.hidden = RegExp.$1;
		winData.sidebar = (/ sidebar:(\S+)/.test(features))?RegExp.$1:"";
		
		cookies.forEach(function(aCookie) {
			if (!window.Cookies) window.Cookies = { count: 0 };
			var cookie = aCookie.split(" ");
			window.Cookies["domain" + ++window.Cookies.count] = cookie[0];
			window.Cookies["value" + window.Cookies.count] = decodeURI(cookie[1]);
		});
		
		winData.Tab = tabs.map(CR_ini_decodeOldFormatTab);
		
		return winData;
	});
	
	return root;
}

function CR_ini_decodeOldFormatTab(aTab)
{
	function parseEntry(aTabs, aIx, aPrefix)
	{
		aPrefix = aPrefix || "";
		var entries = aTabs[aIx].split(" ");
		var entry = {
			uri: entries[0].substr(aPrefix.length), scroll: entries[1],
			postdata: decodeURI(entries[2] || ""), title: decodeURI(entries[3] || ""),
			subframe: (entries[4] || "") == "1", Child: []
		};
		
		aPrefix += "+";
		while (aTabs[aIx + 1] && aTabs[aIx + 1].substr(0, aPrefix.length) == aPrefix)
		{
			entry.Child.push(parseEntry(aTabs, aIx + 1, aPrefix));
			aTabs.splice(aIx + 1, 1);
		}
		
		return entry;
	}
	
	var tabData = { Entry: [], index: 0 };
	var tabs = aTab.split("\n");
	if (/^(\d+) zoom:(\S+)/.test(tabs.shift()))
	{
		tabData.index = parseInt(RegExp.$1) + 1;
		tabData.zoom = RegExp.$2;
	}
	
	for (var i = 0; i < tabs.length; i++)
	{
		if (tabs[i].charAt(0) == "@") break;
		tabData.Entry.push(parseEntry(tabs, i));
	}
	for (; i < tabs.length; i++)
	{
		if (/^@(text|xulattr|disallow) (.*)/.test(tabs[i]))
		{
			tabData[RegExp.$1] = RegExp.$2;
		}
	}
	
	return tabData;
}


/* :::::::: Service Registration & Initialization ::::::::::::::: */

/*const*/ var CrashRecoveryModuleAndFactory = {

/* ........ nsIModule .............. */

	getClassObject: function(aCompMgr, aCID, aIID)
	{
		if (aCID.equals(CrashRecoveryService.mCID))
		{
			return this.QueryInterface(aIID);
		}
		
		Components.returnCode = Cr.NS_ERROR_NOT_REGISTERED;
		return null;
	},

	registerSelf: function(aCompMgr, aFileSpec, aLocation, aType)
	{
		aCompMgr.QueryInterface(Ci.nsIComponentRegistrar);
		aCompMgr.registerFactoryLocation(CrashRecoveryService.mCID, CrashRecoveryService.mClassName, CrashRecoveryService.mContractID, aFileSpec, aLocation, aType);
		
		Cc["@mozilla.org/categorymanager;1"].getService(Ci.nsICategoryManager).addCategoryEntry("app-startup", CrashRecoveryService.mClassName, "service," + CrashRecoveryService.mContractID, true, true);
	},

	unregisterSelf: function(aCompMgr, aLocation, aType)
	{
		aCompMgr.QueryInterface(Ci.nsIComponentRegistrar);
		aCompMgr.unregisterFactoryLocation(CrashRecoveryService.mCID, aLocation);
		
		Cc["@mozilla.org/categorymanager;1"].getService(Ci.nsICategoryManager).deleteCategoryEntry("app-startup", "service," + CrashRecoveryService.mContractID, true);
	},

	canUnload: function(aCompMgr)
	{
		return true;
	},

/* ........ nsIFactory .............. */

	createInstance: function(aOuter, aIID)
	{
		if (aOuter != null)
		{
			Components.returnCode = Cr.NS_ERROR_NO_AGGREGATION;
			return null;
		}
		
		return CrashRecoveryService.QueryInterface(aIID);
	},

	lockFactory: function(aLock) { },

/* ........ QueryInterface .............. */

	QueryInterface: function(aIID)
	{
		if (!aIID.equals(Ci.nsISupports) && !aIID.equals(Ci.nsIModule) && !aIID.equals(Ci.nsIFactory))
		{
			Components.returnCode = Cr.NS_ERROR_NO_INTERFACE;
			return null;
		}
		
		return this;
	}
};

function NSGetModule(aComMgr, aFileSpec)
{
	return CrashRecoveryModuleAndFactory;
}
