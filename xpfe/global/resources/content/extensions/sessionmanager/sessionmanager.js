/*const*/ var gSessionManager = {
	mCrashRecoveryService: Components.classes["@zeniko/crashrecoveryservice;1"].getService(Components.interfaces.nsICrashRecoveryService),
	mObserverService: Components.classes["@mozilla.org/observer-service;1"].getService(Components.interfaces.nsIObserverService),
	mPrefRoot: Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch2),
	mWindowMediator: Components.classes["@mozilla.org/appshell/window-mediator;1"].getService(Components.interfaces.nsIWindowMediator),
	mPromptService: Components.classes["@mozilla.org/embedcomp/prompt-service;1"].getService(Components.interfaces.nsIPromptService),
	mProfileDirectory: Components.classes["@mozilla.org/file/directory_service;1"].getService(Components.interfaces.nsIProperties).get("ProfD", Components.interfaces.nsILocalFile),
	mIOService: Components.classes["@mozilla.org/network/io-service;1"].getService(Components.interfaces.nsIIOService),
	mComponents: Components,

	mObserving: ["crashrecovery:windowclosed", "browser:purge-session-history", "quit-application-granted", "quit-application"],
	mPrefBranchName: "extensions.sessionmanager.",

	mClosedWindowFile: "sessionmanager.dat",
	mDataTabAttribute: "CR_closed_tabs",
	mBackupSessionName: "backup.session",
	mPromptSessionName: "?",
	mSessionExt: ".session",

	mClosedTabs: [],
	mSessionCache: {},
	mDataTab: null,

/* ........ Listeners / Observers.............. */

	onLoad_proxy: function()
	{
		this.removeEventListener("load", gSessionManager.onLoad_proxy, false);
		gSessionManager.onLoad();
	},

	onLoad: function(aDialog)
	{
		this.mBundle = document.getElementById("bundle_sessionmanager");
		this.mTitle = this._string("sessionManager");
		this.mEOL = this.getEOL();
		
		this.mPrefBranch = this.mPrefRoot.QueryInterface(Components.interfaces.nsIPrefService).getBranch(this.mPrefBranchName).QueryInterface(Components.interfaces.nsIPrefBranch2);
		
		if (aDialog || this.mFullyLoaded)
		{
			return;
		}
		
		if (this.getPref("_resume_session"))
		{
			this.setResumeCurrent(true);
			this.delPref("_resume_session");
		}
		
		this.mObserving.forEach(function(aTopic) {
			this.mObserverService.addObserver(this, aTopic, false);
		}, this);
		
		this.mPref_backup_session = this.getPref("backup_session", 1);
		this.mPref_max_backup_keep = this.getPref("max_backup_keep", 0);
		this.mPref_max_closed_undo = this.getPref("max_closed_undo", 10);
		this.mPref_max_tabs_undo = this.getPref("max_tabs_undo", 10);
		this.mPref_name_format = this.getPref("name_format", "%40t-%d");
		this.mPref_overwrite = this.getPref("overwrite", false);
		this.mPref_reload = this.getPref("reload", false);
		this.mPref_resume_session = this.getPref("resume_session", "");
		this.mPref_save_closed_tabs = this.getPref("save_closed_tabs", 0);
		this.mPref_save_window_list = this.getPref("save_window_list", false);
		this.mPref_session_list_order = this.getPref("session_list_order", 1);
		this.mPref_submenus = this.getPref("submenus", false);
		this.mPref__running = this.getPref("_running", false);
		this.mPrefBranch.addObserver("", this, false);
		
		getBrowser().addEventListener("CRTabRestoring", this.onTabRestoring_proxy, false);
		gBrowser.addEventListener("CRTabRestored", this.onTabRestored_proxy, false);
		gBrowser.addEventListener("SMTabClosing", this.onTabClosing_proxy, false);
		gBrowser.addEventListener("load", this.onTabLoading_proxy, true);
		
		this.recoverSession();
		this.patchTabBrowser();
		this.updateToolbarButton();
		
		if (!this.mPref__running)
		{
			this.setPref("_running", true);
			this.mPrefRoot.savePrefFile(null);
		}
		this.mFullyLoaded = true;
	},

	onUnload_proxy: function()
	{
		this.removeEventListener("unload", gSessionManager.onUnload_proxy, false);
		gSessionManager.onUnload();
	},

	onUnload: function()
	{
		this.mObserving.forEach(function(aTopic) {
			this.mObserverService.removeObserver(this, aTopic);
		}, this);
		this.mPrefBranch.removeObserver("", this);
		
		gBrowser.removeEventListener("CRTabRestoring", this.onTabRestoring_proxy, false);
		gBrowser.removeEventListener("CRTabRestored", this.onTabRestored_proxy, false);
		gBrowser.removeEventListener("SMTabClosing", this.onTabClosing_proxy, false);
		gBrowser.removeEventListener("load", this.onTabLoading_proxy, true);
		
		if (this.mPref__running && this.getBrowserWindows().length == 0)
		{
			this.mObserverService.addObserver(this, "quit-application", false);
			this.mObserverService.addObserver(this, "domwindowopened", false);
			
			this._string_preserve_session = this._string("preserve_session");
			this._string_backup_session = this._string("backup_session");
			this._string_old_backup_session = this._string("old_backup_session");
			
			this.setPref("_hibernating", true);
		}
		
		this.mBundle = null;
		this.mSessions = null;
		this.mClosedTabs = null;
		this.mFullyLoaded = false;
	},

	observe: function(aSubject, aTopic, aData)
	{
		switch (aTopic)
		{
		case "crashrecovery:windowclosed":
			if (aSubject == window)
			{
				this.appendClosedWindow(aData);
			}
			else if (this.mPref_max_closed_undo > 0)
			{
				this.updateToolbarButton(true);
			}
			break;
		case "browser:purge-session-history":
			this.clearUndoData("all");
			this.delFile(this.getSessionDir(this.mBackupSessionName));
			break;
		case "nsPref:changed":
			this["mPref_" + aData] = this.getPref(aData);
			
			switch (aData)
			{
			case "max_closed_undo":
				if (this.mPref_max_closed_undo == 0)
				{
					this.clearUndoData("window", true);
				}
				break;
			case "max_tabs_undo":
				if (this.mPref_max_tabs_undo == 0)
				{
					this.clearUndoData("tab", true);
				}
				break;
			case "resume_session":
				this.setResumeCurrent(this.mPref_resume_session == this.mBackupSessionName);
				break;
			case "save_closed_tabs":
				if (!this.mPref_save_closed_tabs)
				{
					this.clearUndoData("datatab");
				}
				else if (this.mClosedTabs.length > 0)
				{
					this.persistClosedTabList();
				}
				break;
			}
			break;
		case "quit-application-granted":
		case "quit-application":
			if (this.getPref("_running"))
			{
				this.delPref("_running");
				this.delPref("_hibernating");
				if (!this.mPref_save_window_list)
				{
					this.clearUndoData("window", true);
				}
				if (this.doResumeCurrent(true))
				{
					this.setPref("_resume_session_once", (this.mPref__resume_session_once = true))
				}
				this.backupCurrentSession();
			}
			break;
		case "domwindowopened":
			aSubject.__gSeMa = this;
			aSubject.addEventListener("load", this.onDomWindowOpened_proxy, false);
			break;
		}
	},

	onDomWindowOpened_proxy: function()
	{
		this.removeEventListener("load", this.__gSeMa.onDomWindowOpened_proxy, false);
		if (this.document.documentElement.getAttribute("windowtype") == "navigator:browser")
		{
			this.__gSeMa.mObserverService.removeObserver(this.__gSeMa, "quit-application");
			this.__gSeMa.mObserverService.removeObserver(this.__gSeMa, "domwindowopened");
		}
		delete this.__gSeMa;
	},

	onTabRestoring_proxy: function(aEvent)
	{
		gSessionManager.onTabRestoring(aEvent.originalTarget);
	},

	onTabRestoring: function(aTab)
	{
		if (aTab.hasAttribute(this.mDataTabAttribute))
		{
			if (this.mDataTab && this.mDataTab != aTab)
			{
				this.clearUndoData("datatab");
			}
			this.mDataTab = aTab;
			
			var serializedTabs = aTab.getAttribute(this.mDataTabAttribute);
			this.mClosedTabs = serializedTabs.split("\f\f").map(function(aData) {
				if (/^(\d+) (.*)\n([\s\S]*)/.test(aData))
				{
					return { name: RegExp.$2, pos: parseInt(RegExp.$1), state: RegExp.$3 };
				}
				return null;
			}).filter(function(aTab) { return aTab != null; }).slice(0, this.mPref_max_tabs_undo);
			
			this.updateToolbarButton((this.mClosedTabs.length > 0)?true:undefined);
			
			if (!this.mPref_save_closed_tabs)
			{
				this.clearUndoData("datatab");
			}
		}
	},

	onTabRestored_proxy: function(aEvent)
	{
		var browser = this.getBrowserForTab(aEvent.originalTarget);
		
		if (gSessionManager.mPref_reload && gSessionManager._allowReload && !browser.__CR_data && !gSessionManager.mIOService.offline)
		{
			var nsIWebNavigation = Components.interfaces.nsIWebNavigation;
			var webNav = browser.webNavigation;
			try
			{
				webNav = webNav.sessionHistory.QueryInterface(nsIWebNavigation);
			}
			catch (ex) { }
			webNav.reload(nsIWebNavigation.LOAD_FLAGS_BYPASS_PROXY | nsIWebNavigation.LOAD_FLAGS_BYPASS_CACHE);
		}
	},

	onTabClosing_proxy: function(aEvent)
	{
		gSessionManager.onTabClosing(aEvent.originalTarget);
	},

	onTabClosing: function(aTab)
	{
		if (this.mPref_max_tabs_undo == 0)
		{
			return;
		}
		if (this.mDataTab && this.mDataTab == aTab)
		{
			var dataTabData = aTab.getAttribute(this.mDataTabAttribute);
			this.mDataTab = gBrowser.mTabs[(aTab.previousSibling)?0:1] || null;
			if (this.mDataTab && dataTabData)
			{
				this.mDataTab.setAttribute(this.mDataTabAttribute, dataTabData);
				dataTabData = null;
			}
			aTab.removeAttribute(this.mDataTabAttribute);
		}
		if (!this._ignoreRemovedTabs && !this.isCleanBrowser(gBrowser.getBrowserForTab(aTab)))
		{
			var state = this.getSessionState(null, true);
			var position = (aTab._tPos != undefined)?aTab._tPos + 1:0;
			var title = aTab.label;
			if (!position || gBrowser.mTabs[position - 1] != aTab)
			{
				for (position = 1; (aTab = aTab.previousSibling); position++);
			}
			
			this.appendClosedTab(state, position, title, this.mDataTab || gBrowser.mTabs[(aTab.previousSibling)?0:1] || null);
		}
		else if (dataTabData)
		{
			this.mDataTab = aTab;
			this.mDataTab.setAttribute(this.mDataTabAttribute, dataTabData);
		}
	},

	onTabLoading_proxy: function(aEvent)
	{
		if (aEvent.originalTarget && aEvent.originalTarget.loadOverlay)
		{
			aEvent.originalTarget.loadOverlay("chrome://sessionmanager/content/zzz_closewindow_hack.xul", null);
		}
	},

	onToolbarClick: function(aEvent, aButton)
	{
		if (aEvent.button == 1)
		{
			eval("var event = { shiftKey: true }; " + aButton.getAttribute("oncommand"));
		}
		else if (aEvent.button == 2 && aButton.getAttribute("disabled") != "true")
		{
			aButton.open = true;
		}
	},

/* ........ Menu Event Handlers .............. */

	init: function(aPopup, aIsToolbar)
	{
		function get_(a_id) { return aPopup.getElementsByAttribute("_id", a_id)[0] || null; }
		
		var separator = get_("separator");
		var startSep = get_("start-separator");
		
		for (var item = startSep.nextSibling; item != separator; item = startSep.nextSibling)
		{
			aPopup.removeChild(item);
		}
		
		this.mSessions = this.getSessions();
		this.mSessions.forEach(function(aSession, aIx) {
			var key = (aIx < 9)?aIx + 1:(aIx == 9)?"0":"";
			var menuitem = document.createElement("menuitem");
			menuitem.setAttribute("label", ((key)?key + ") ":"") + aSession.name);
			menuitem.setAttribute("oncommand", 'gSessionManager.load("' + aSession.fileName + '", (event.shiftKey && event.ctrlKey)?"overwrite":(event.shiftKey)?"newwindow":(event.ctrlKey)?"append":"");');
			menuitem.setAttribute("onclick", 'if (event.button == 1) gSessionManager.load("' + aSession.fileName + '", "newwindow");');
			menuitem.setAttribute("accesskey", key);
			aPopup.insertBefore(menuitem, separator);
		});
		separator.hidden = (this.mSessions.length == 0);
		this.setDisabled(separator.nextSibling, separator.hidden);
		this.setDisabled(separator.nextSibling.nextSibling, separator.hidden);
		
		try
		{
			get_("resume").setAttribute("checked", this.doResumeCurrent());
			get_("overwrite").setAttribute("checked", this.mPref_overwrite);
			get_("reload").setAttribute("checked", this.mPref_reload);
		}
		catch (ex) { } // not available for Firefox
		
		var undoMenu = get_("undo-menu");
		while (aPopup.lastChild != undoMenu)
		{
			aPopup.removeChild(aPopup.lastChild);
		}
		
		var undoDisabled = (this.mPref_max_closed_undo == 0 && this.mPref_max_tabs_undo == 0);
		var divertedMenu = aIsToolbar && document.getElementById("sessionmanager-undo");
		var canUndo = !undoDisabled && !divertedMenu && this.initUndo(undoMenu.firstChild);
		
		undoMenu.hidden = undoDisabled || divertedMenu || !this.mPref_submenus;
		undoMenu.previousSibling.hidden = !canUndo && undoMenu.hidden;
		this.setDisabled(undoMenu, !canUndo);
		
		if (!this.mPref_submenus && canUndo)
		{
			for (item = undoMenu.firstChild.firstChild; item; item = item.nextSibling)
			{
				aPopup.appendChild(item.cloneNode(true));
			}
		}
		
		// in case the popup belongs to a collapsed element
		aPopup.style.visibility = "visible";
	},

	uninit: function(aPopup)
	{
		aPopup.style.visibility = "";
		
		this.mSessions = null;
	},

	save: function(aName, aFileName, aOneWindow)
	{
		var values = { text: this.getFormattedName(content.document.title || "about:blank", new Date()) || (new Date()).toLocaleString() };
		if (!aName)
		{
			if (!this.prompt(this._string("save2_session"), this._string("save_" + ((aOneWindow)?"window":"session") + "_ok"), values, this._string("save_" + ((aOneWindow)?"window":"session")), this._string("save_session_ok2")))
			{
				return;
			}
			aName = values.text;
			aFileName = values.name;
		}
		if (aName)
		{
			var file = this.getSessionDir(aFileName || this.makeFileName(aName), !aFileName);
			try
			{
				this.writeFile(file, this.getSessionState(aName, aOneWindow, this.mPref_save_closed_tabs < 2));
			}
			catch (ex)
			{
				this.ioError(ex);
			}
		}
	},

	saveWindow: function(aName, aFileName)
	{
		this.save(aName, aFileName, true);
	},

	load: function(aFileName, aMode)
	{
		var state = this.readSessionFile(this.getSessionDir(aFileName));
		if (!state)
		{
			this.ioError();
			return;
		}
		
		var newWindow = false;
		var overwriteTabs = true;
		var tabsToMove = null;
		
		aMode = aMode || "default";
		if (aMode == "startup")
		{
			overwriteTabs = this.isCmdLineEmpty();
			tabsToMove = (!overwriteTabs)?Array.slice(gBrowser.mTabs):null;
		}
		else if (aMode == "append")
		{
			overwriteTabs = false;
		}
		else if (aMode == "newwindow" || (aMode != "overwrite" && !this.mPref_overwrite))
		{
			newWindow = true;
		}
		else
		{
			this.getBrowserWindows().forEach(function(aWindow) {
				if (aWindow != window) { aWindow.close(); }
			});
			this.mObserverService.notifyObservers(window, "crashrecovery:windowclosed", this.getSessionState(null, true));
		}
		
		setTimeout(function() {
			var tabcount = gBrowser.mTabs.length;
			gSessionManager.restoreSession((!newWindow)?window:null, state, overwriteTabs, true);
			if (tabsToMove)
			{
				var endPos = gBrowser.mTabs.length - 1;
				tabsToMove.forEach(function(aTab) { gBrowser.moveTabTo(aTab, endPos); });
			}
			else if (!overwriteTabs && gBrowser.mTabs[tabcount])
			{
				setTimeout(function(aTab) {
					gBrowser.selectedTab = aTab;
				}, 100, gBrowser.mTabs[tabcount]);
			}
		}, 0);
	},

	rename: function()
	{
		var values = {};
		if (!this.prompt(this._string("rename_session"), this._string("rename_session_ok"), values, this._string("rename2_session")))
		{
			return;
		}
		var file = this.getSessionDir(values.name);
		var filename = this.makeFileName(values.text);
		var newFile = (filename != file.leafName)?this.getSessionDir(filename, true):null;
		
		try
		{
			this.writeFile(newFile || file, this.nameState(this.readSessionFile(file), values.text));
			if (newFile)
			{
				if (this.mPref_resume_session == file.leafName && this.mPref_resume_session != this.mBackupSessionName)
				{
					this.setPref("resume_session", filename);
				}
				this.delFile(file);
			}
		}
		catch (ex)
		{
			this.ioError(ex);
		}
	},

	remove: function(aSession)
	{
		if (!aSession)
		{
			aSession = this.selectSession(this._string("remove_session"), this._string("remove_session_ok"), { multiSelect: true });
		}
		if (aSession)
		{
			aSession.split("\n").forEach(function(aFileName) {
				this.delFile(this.getSessionDir(aFileName));
			}, this);
		}
	},

	openFolder: function()
	{
		try
		{
			this.getSessionDir().launch();
		}
		catch (ex)
		{
			this.ioError(ex);
		}
	},

	openOptions: function()
	{
		openDialog("chrome://sessionmanager/content/options.xul", "_blank", "chrome,dialog,modal,titlebar,centerscreen");
	},

	toggleResume: function()
	{
		this.setResumeCurrent(!this.doResumeCurrent());
	},

	toggleReload: function()
	{
		this.setPref("reload", !this.mPref_reload);
	},

	toggleOverwrite: function()
	{
		this.setPref("overwrite", !this.mPref_overwrite);
	},

/* ........ Undo Menu Event Handlers .............. */

	initUndo: function(aPopup, aStandAlone)
	{
		function get_(a_id) { return aPopup.getElementsByAttribute("_id", a_id)[0] || null; }
		
		var separator = get_("closed-separator");
		var label = get_("windows");
		
		for (var item = separator.previousSibling; item != label; item = separator.previousSibling)
		{
			aPopup.removeChild(item);
		}
		
		var closedWindows = this.getClosedWindows();
		closedWindows.forEach(function(aWindow, aIx) {
			var menuitem = document.createElement("menuitem");
			menuitem.setAttribute("label", aWindow.name);
			menuitem.setAttribute("oncommand", 'gSessionManager.undoCloseWindow(' + aIx + ', (event.shiftKey && event.ctrlKey)?"overwrite":(event.ctrlKey)?"append":"");');
			aPopup.insertBefore(menuitem, separator);
		});
		label.hidden = (closedWindows.length == 0);
		
		var listEnd = get_("end-separator");
		for (item = separator.nextSibling.nextSibling; item != listEnd; item = separator.nextSibling.nextSibling)
		{
			aPopup.removeChild(item);
		}
		
		this.mClosedTabs.forEach(function(aTab, aIx) {
			var menuitem = document.createElement("menuitem");
			menuitem.setAttribute("label", aTab.name);
			menuitem.setAttribute("oncommand", 'gSessionManager.undoCloseTab(' + aIx + ');');
			aPopup.insertBefore(menuitem, listEnd);
		});
		separator.nextSibling.hidden = (this.mClosedTabs.length == 0);
		separator.hidden = separator.nextSibling.hidden || label.hidden;
		
		var showPopup = closedWindows.length + this.mClosedTabs.length > 0;
		
		if (aStandAlone)
		{
			if (!showPopup)
			{
				this.updateToolbarButton(false);
				setTimeout(function(aPopup) { aPopup.parentNode.open = false; }, 0, aPopup);
			}
			else
			{
				aPopup.style.visibility = "visible";
			}
		}
		
		return showPopup;
	},

	uninitUndo: function(aPopup)
	{
		aPopup.style.visibility = "";
	},

	undoCloseWindow: function(aIx, aMode)
	{
		var closedWindows = this.getClosedWindows();
		if (closedWindows[aIx || 0])
		{
			var state = closedWindows.splice(aIx || 0, 1)[0].state;
			this.storeClosedWindows(closedWindows);
			
			if (aMode == "overwrite")
			{
				this.mObserverService.notifyObservers(window, "crashrecovery:windowclosed", this.getSessionState(null, true));
			}
			else if (aMode == "append")
			{
				state = this.stripTabUndoData(state);
			}
			
			this.restoreSession((aMode == "overwrite" || aMode == "append")?window:null, state, aMode != "append");
		}
	},

	undoCloseTab: function(aIx)
	{
		if (this.mClosedTabs[aIx || 0])
		{
			var tabData = this.mClosedTabs.splice(aIx || 0, 1)[0];
			this.restoreSession(window, tabData.state);
			if (this.mClosedTabs.length == 0)
			{
				this.updateToolbarButton();
			}
			
			var newTab = document.getAnonymousElementByAttribute(gBrowser, "linkedpanel", gBrowser.mPanelContainer.lastChild.id);
			if (gBrowser.mTabs.length == 2 && !this.getPref("browser.tabs.autoHide", true, true) && this.isCleanBrowser(gBrowser.selectedBrowser))
			{
				gBrowser.removeTab(gBrowser.selectedTab);
			}
			if (tabData.pos && tabData.pos < gBrowser.mTabs.length)
			{
				gBrowser.moveTabTo(newTab, tabData.pos - 1);
			}
			gBrowser.selectedTab = newTab;
		}
	},

	clearUndoList: function()
	{
		var max_tabs_undo = this.getPref("max_tabs_undo", 10);
		
		this.setPref("max_tabs_undo", 0);
		this.setPref("max_tabs_undo", max_tabs_undo);
		
		this.clearUndoData("window");
	},

/* ........ User Prompts .............. */

	prompt: function(aSessionLabel, aAcceptLabel, aValues, aTextLabel, aAcceptExistingLabel)
	{
		var params = Components.classes["@mozilla.org/embedcomp/dialogparam;1"].createInstance(Components.interfaces.nsIDialogParamBlock);
		aValues = aValues || {};
		
		params.SetNumberStrings(7);
		params.SetString(1, aSessionLabel);
		params.SetString(2, aAcceptLabel);
		params.SetString(3, aValues.name || "");
		params.SetString(4, aTextLabel || "");
		params.SetString(5, aAcceptExistingLabel || "");
		params.SetString(6, aValues.text || "");
		params.SetInt(1, ((aValues.addCurrentSession)?1:0) | ((aValues.multiSelect)?2:0) | ((aValues.ignorable)?4:0) | ((aValues.allowNamedReplace)?256:0));
		
		this.openWindow("chrome://sessionmanager/content/session_prompt.xul", "chrome,modal,centerscreen,titlebar,resizable", params, (this.mFullyLoaded)?window:null);
		
		aValues.name = params.GetString(3);
		aValues.text = params.GetString(6);
		aValues.ignore = params.GetInt(1);
		
		return !params.GetInt(0);
	},

	selectSession: function(aSessionLabel, aAcceptLabel, aValues)
	{
		var values = aValues || {};
		
		if (this.prompt(aSessionLabel, aAcceptLabel, values))
		{
			return values.name;
		}
		
		return null;
	},

	ioError: function(aException)
	{
		this.mPromptService.alert(window, this.mTitle, (this.mBundle)?this.mBundle.getFormattedString("io_error", [(aException)?aException.message:this._string("unknown_error")]):aException);
	},

	openWindow: function(aChromeURL, aFeatures, aArgument, aParent)
	{
		if (!aArgument || typeof aArgument == "string")
		{
			var argString = Components.classes["@mozilla.org/supports-string;1"].createInstance(Components.interfaces.nsISupportsString);
			argString.data = aArgument || "";
			aArgument = argString;
		}
		
		return Components.classes["@mozilla.org/embedcomp/window-watcher;1"].getService(Components.interfaces.nsIWindowWatcher).openWindow(aParent || null, aChromeURL, "_blank", aFeatures, aArgument);
	},

	clearUndoListPrompt: function()
	{
		if (this.mPromptService.confirm(window, this.mTitle, this._string("clear_list_prompt")))
		{
			this.clearUndoList();
		}
	},

/* ........ File Handling .............. */

	getProfileFile: function(aFileName)
	{
		var file = this.mProfileDirectory.clone();
		file.append(aFileName);
		return file;
	},

	getSessionDir: function(aFileName, aUnique)
	{
		var dir = this.getProfileFile("sessions");
		if (!dir.exists())
		{
			dir.create(this.mComponents.interfaces.nsIFile.DIRECTORY_TYPE, 0700);
		}
		if (aFileName)
		{
			dir.append(aFileName);
			if (aUnique)
			{
				var postfix = 1, ext = "";
				if (aFileName.slice(-this.mSessionExt.length) == this.mSessionExt)
				{
					aFileName = aFileName.slice(0, -this.mSessionExt.length);
					ext = this.mSessionExt;
				}
				while (dir.exists())
				{
					dir = dir.parent;
					dir.append(aFileName + "-" + (++postfix) + ext);
				}
			}
		}
		return dir.QueryInterface(this.mComponents.interfaces.nsILocalFile);
	},

	getSessions: function()
	{
		var sessions = [];
		
		var filesEnum = this.getSessionDir().directoryEntries.QueryInterface(this.mComponents.interfaces.nsISimpleEnumerator);
		while (filesEnum.hasMoreElements())
		{
			var file = filesEnum.getNext().QueryInterface(this.mComponents.interfaces.nsIFile);
			var fileName = file.leafName;
			var cached = this.mSessionCache[fileName] || null;
			if (cached && cached.time == file.lastModifiedTime)
			{
				sessions.push({ fileName: fileName, name: cached.name, timestamp: cached.timestamp });
				continue;
			}
			if (/^\[SessionManager\]\n(?:name=(.*)\n)?(?:timestamp=(\d+))?/m.test(this.readSessionFile(file)))
			{
				var timestamp = parseInt(RegExp.$2) || file.lastModifiedTime;
				sessions.push({ fileName: fileName, name: RegExp.$1, timestamp: timestamp });
				this.mSessionCache[fileName] = { name: RegExp.$1, timestamp: timestamp, time: file.lastModifiedTime };
			}
		}
		
		if (!this.mPref_session_list_order)
		{
			this.mPref_session_list_order = this.getPref("session_list_order", 1);
		}
		switch (Math.abs(this.mPref_session_list_order))
		{
		case 1: // alphabetically
			sessions = sessions.sort(function(a, b) { return a.name.toLowerCase().localeCompare(b.name.toLowerCase()); });
			break;
		case 2: // chronologically
			sessions = sessions.sort(function(a, b) { return a.timestamp - b.timestamp; });
			break;
		}
		
		return (this.mPref_session_list_order < 0)?sessions.reverse():sessions;
	},

	getClosedWindows: function()
	{
		var data = this.readFile(this.getProfileFile(this.mClosedWindowFile));
		return (data)?data.split("\n\n").map(function(aEntry) {
			var parts = aEntry.split("\n");
			return { name: parts.shift(), state: parts.join("\n") };
		}):[];
	},

	storeClosedWindows: function(aList)
	{
		this.writeFile(this.getProfileFile(this.mClosedWindowFile), aList.map(function(aEntry) {
			return aEntry.name + "\n" + aEntry.state;
		}).join("\n\n"));
		
		this.updateToolbarButton(aList.length + this.mClosedTabs.length > 0);
	},

	appendClosedWindow: function(aState)
	{
		if (this.mPref_max_closed_undo == 0 || Array.every(gBrowser.browsers, this.isCleanBrowser))
		{
			return;
		}
		
		var name = content.document.title || ((gBrowser.currentURI.spec != "about:blank")?gBrowser.currentURI.spec:this._string("untitled_window"));
		var windows = this.getClosedWindows();
		
		aState = aState.replace(/^\n+|\n+$/g, "").replace(/\n{2,}/g, "\n");
		windows.unshift({ name: name, state: aState });
		this.storeClosedWindows(windows.slice(0, this.mPref_max_closed_undo));
	},

	clearUndoData: function(aType, aSilent)
	{
		if (aType == "window" || aType == "all")
		{
			this.delFile(this.getProfileFile(this.mClosedWindowFile), aSilent);
		}
		if (aType == "tab" || aType == "all")
		{
			this.mClosedTabs = [];
		}
		if ((aType == "tab" || aType == "datatab" || aType == "all") && this.mDataTab)
		{
			this.mDataTab.removeAttribute(this.mDataTabAttribute);
			this.mDataTab = null;
		}
		this.updateToolbarButton((aType == "all")?false:undefined);
	},

	backupCurrentSession: function()
	{
		var backup = this.getPref("backup_session", 1);
		if (backup == 2 && !this.mPref__resume_session_once)
		{
			backup = (this.mPromptService.confirmEx(null, this.mTitle, this._string_preserve_session || this._string("preserve_session"), this.mPromptService.BUTTON_TITLE_YES * this.mPromptService.BUTTON_POS_0 + this.mPromptService.BUTTON_TITLE_NO * this.mPromptService.BUTTON_POS_1, null, null, null, null, {}) == 1)?-1:1;
		}
		if (backup > 0)
		{
			this.keepOldBackups();
			try
			{
				var state = this.getSessionState(this._string_backup_session || this._string("backup_session"));
				this.writeFile(this.getSessionDir(this.mBackupSessionName), state);
			}
			catch (ex)
			{
				this.ioError(ex);
			}
		}
		else
		{
			this.setPref("_resume_session", this.doResumeCurrent());
			this.setResumeCurrent(false);
			this.delFile(this.getProfileFile("crashrecovery.dat"), true);
			this.delFile(this.getProfileFile("crashrecovery.bak"), true);
			this.delFile(this.getSessionDir(this.mBackupSessionName), true);
			this.keepOldBackups();
		}
	},

	keepOldBackups: function()
	{
		var backup = this.getSessionDir(this.mBackupSessionName);
		if (backup.exists() && this.mPref_max_backup_keep)
		{
			var oldBackup = this.getSessionDir(this.mBackupSessionName, true);
			var name = this.getFormattedName("", new Date(), this._string_old_backup_session || this._string("old_backup_session"));
			this.writeFile(oldBackup, this.nameState(this.readSessionFile(backup), name));
		}
		
		if (this.mPref_max_backup_keep != -1)
		{
			this.getSessions().filter(function(aSession) {
				return /^backup-\d+\.session$/.test(aSession.fileName);
			}).sort(function(a, b) {
				return b.timestamp - a.timestamp;
			}).slice(this.mPref_max_backup_keep).forEach(function(aSession) {
				this.delFile(this.getSessionDir(aSession.fileName), true);
			}, this);
		}
	},

	readSessionFile: function(aFile)
	{
		var state = this.readFile(aFile);
		
		if (/^-?\d+.*~~~~/.test(state)) // old file format
		{
			if ("@mozilla.org/extensions/manager;1" in Components.classes)
			{
				var GUID = "{1280606b-2510-4fe0-97ef-9b5a22eafe30}";
				var component = Components.classes["@mozilla.org/extensions/manager;1"].getService(Components.interfaces.nsIExtensionManager).getInstallLocation(GUID).getItemFile(GUID, "components/crashrecovery.js");
			}
			else // SeaMonkey
			{
				component = Components.classes["@mozilla.org/file/directory_service;1"].getService(Components.interfaces.nsIProperties).get("ComsD", Components.interfaces.nsILocalFile);
				component.append("crashrecovery.js");
			}
			var context = {};
			
			Components.classes["@mozilla.org/moz/jssubscript-loader;1"].getService(Components.interfaces.mozIJSSubScriptLoader).loadSubScript(this.mIOService.getProtocolHandler("file").QueryInterface(Components.interfaces.nsIFileProtocolHandler).getURLSpecFromFile(component), context);
			
			state = state.replace(/^(.*? ~~~~)( .*)?/, "$1");
			var name = RegExp.$2.substr(1) || this._string("untitled_window");
			state = context.encodeINI(context.CR_ini_decodeOldFormat(state));
			state = this.nameState(state.replace(/\n\[/g, "\n$&") + "\n", name);
			
			this.writeFile(aFile, state);
		}
		
		return state;
	},

	readFile: function(aFile)
	{
		try
		{
			var stream = this.mComponents.classes["@mozilla.org/network/file-input-stream;1"].createInstance(this.mComponents.interfaces.nsIFileInputStream);
			stream.init(aFile, 0x01, 0, 0);
			var cvstream = this.mComponents.classes["@mozilla.org/intl/converter-input-stream;1"].createInstance(this.mComponents.interfaces.nsIConverterInputStream);
			cvstream.init(stream, "UTF-8", 1024, this.mComponents.interfaces.nsIConverterInputStream.DEFAULT_REPLACEMENT_CHARACTER);
			
			var content = "";
			var data = {};
			while (cvstream.readString(4096, data))
			{
				content += data.value;
			}
			cvstream.close();
			
			return content.replace(/\r\n?/g, "\n");
		}
		catch (ex) { }
		
		return null;
	},

	writeFile: function(aFile, aData)
	{
		var stream = this.mComponents.classes["@mozilla.org/network/file-output-stream;1"].createInstance(this.mComponents.interfaces.nsIFileOutputStream);
		stream.init(aFile, 0x02 | 0x08 | 0x20, 0600, 0);
		var cvstream = this.mComponents.classes["@mozilla.org/intl/converter-output-stream;1"].createInstance(this.mComponents.interfaces.nsIConverterOutputStream);
		cvstream.init(stream, "UTF-8", 0, this.mComponents.interfaces.nsIConverterInputStream.DEFAULT_REPLACEMENT_CHARACTER);
		
		cvstream.writeString(aData.replace(/\n/g, this.mEOL));
		cvstream.flush();
		cvstream.close();
	},

	delFile: function(aFile, aSilent)
	{
		if (aFile.exists())
		{
			try
			{
				aFile.remove(false);
			}
			catch (ex)
			{
				if (!aSilent)
				{
					this.ioError(ex);
				}
			}
		}
	},

/* ........ Preference Access .............. */

	getPref: function(aName, aDefault, aUseRootBranch)
	{
		var pb = (aUseRootBranch)?this.mPrefRoot:this.mPrefBranch;
		switch (pb.getPrefType(aName))
		{
		case pb.PREF_STRING:
			return pb.getCharPref(aName);
		case pb.PREF_BOOL:
			return pb.getBoolPref(aName);
		case pb.PREF_INT:
			return pb.getIntPref(aName);
		default:
			return aDefault;
		}
	},

	setPref: function(aName, aValue, aUseRootBranch)
	{
		var pb = (aUseRootBranch)?this.mPrefRoot:this.mPrefBranch;
		switch (typeof aValue)
		{
		case "boolean":
			pb.setBoolPref(aName, aValue);
			break;
		case "number":
			pb.setIntPref(aName, parseInt(aValue));
			break;
		default:
			pb.setCharPref(aName, "" + aValue);
			break;
		}
	},

	delPref: function(aName, aUseRootBranch)
	{
		((aUseRootBranch)?this.mPrefRoot:this.mPrefBranch).deleteBranch(aName);
	},

/* ........ Miscellaneous Enhancements .............. */

	recoverSession: function()
	{
		var recovering = this.getPref("_recovering");
		var recoverOnly = recovering || this.mPref__running && !this.getPref("_hibernating") || this.doResumeCurrent() || this.getPref("_resume_session_once");
		if (recovering)
		{
			this.delPref("_recovering");
			this.load(recovering, "startup");
		}
		else if (!recoverOnly && this.mPref_resume_session && this.getSessions().length > 0)
		{
			var values = { ignorable: true };
			var session = (this.mPref_resume_session == this.mPromptSessionName)?this.selectSession(this._string("resume_session"), this._string("resume_session_ok"), values):this.mPref_resume_session;
			if (session && this.getSessionDir(session).exists())
			{
				this.load(session, "startup");
			}
			if (values.ignore)
			{
				this.setPref("resume_session", session || "");
			}
		}
		this.delPref("_hibernating");
		this.delPref("_resume_session_once");
	},

	isCmdLineEmpty: function()
	{
		var homepage = null;
		
		switch (this.getPref("browser.startup.page", 1, true))
		{
		case 0:
			homepage = "about:blank";
			break;
		case 1:
			try
			{
				homepage = this.mPrefRoot.getComplexValue("browser.startup.homepage", Components.interfaces.nsIPrefLocalizedString).data;
			}
			catch (ex)
			{
				homepage = this.getPref("browser.startup.homepage", "", true);
			}
			break;
		}
		if (window.arguments.length > 0 && window.arguments[0].split("\n")[0] == homepage)
		{
			window.arguments.shift();
		}
		
		return (window.arguments.length == 0);
	},

	patchTabBrowser: function()
	{
		eval("gBrowser.removeTab = " + gBrowser.removeTab.toString().replace(/\{/, '$& var $$SM_event = document.createEvent("Events"); $$SM_event.initEvent("SMTabClosing", true, false); ((aTab.localName != "tab")?this.mCurrentTab:aTab).dispatchEvent($$SM_event);'));
		
		if (!gBrowser.undoRemoveTab) // tweak for Tab Clicking Options
		{
			gBrowser.undoRemoveTab = function() { gSessionManager.undoCloseTab(); };
		}
	},

	updateToolbarButton: function(aEnable)
	{
		var button = (document)?document.getElementById("sessionmanager-undo"):null;
		if (button)
		{
			this.setDisabled(button, (aEnable != undefined)?!aEnable:this.mClosedTabs.length == 0 && this.getClosedWindows().length == 0);
		}
	},

	appendClosedTab: function(aState, aPosition, aTitle, aNewDataTab)
	{
		var oneTabRE = /\n\[Window(1\.Tab\d+)\]\n[\s\S]*?(?=\n\[Window(?!\1)|$)/;
		var tabData = aState.substr(aState.indexOf("\n[Window1.Tab" + aPosition + "]")).match(oneTabRE)[0].replace(/^(\[Window1\.Tab)\d+/gm, "$11");
		
		this.mClosedTabs.unshift({ name: aTitle, pos: aPosition, state: tabData });
		this.mClosedTabs.splice(this.mPref_max_tabs_undo);
		
		this.persistClosedTabList(aNewDataTab);
		this.updateToolbarButton(true);
	},

	persistClosedTabList: function(aNewDataTab)
	{
		if (!this.mDataTab && this.mPref_save_closed_tabs)
		{
			this.mDataTab = aNewDataTab || gBrowser.selectedTab;
		}
		if (this.mDataTab)
		{
			var serializedTabs = this.mClosedTabs.map(function(aTabData) {
				return aTabData.pos + " " + aTabData.name + "\n" + aTabData.state;
			}).join("\f\f");
			this.mDataTab.setAttribute(this.mDataTabAttribute, serializedTabs);
		}
	},

/* ........ Auxiliary Functions .............. */

	getSessionState: function(aName, aOneWindow, aNoUndoData)
	{
		var state = (aOneWindow)?this.mCrashRecoveryService.getWindowState(window):this.mCrashRecoveryService.getCurrentState();
		
		if (aNoUndoData)
		{
			state = this.stripTabUndoData(state);
		}
		
		return (aName != null)?this.nameState(("[SessionManager]\nname=" + (new Date()).toString() + "\ntimestamp=" + Date.now() + "\n" + state + "\n").replace(/\n\[/g, "\n$&"), aName || ""):state;
	},

	restoreSession: function(aWindow, aState, aReplaceTabs, aAllowReload)
	{
		if (!aWindow)
		{
			aWindow = this.openWindow(this.getPref("browser.chromeURL", null, true), "chrome,dialog=no,all");
			aWindow.__SM_restore = function() {
				this.removeEventListener("load", this.__SM_restore, true);
				this.gSessionManager.restoreSession(this, aState, aReplaceTabs, aAllowReload);
				delete this.__SM_restore;
			};
			aWindow.addEventListener("load", aWindow.__SM_restore, true);
			return;
		}
		
		if (aReplaceTabs)
		{
			this.clearUndoData("tab");
			
			if (aState.indexOf("\n[Window2]\n") == -1 && this.getBrowserWindows().length < 2)
			{
				aState = aState.replace(/^(\[Window1\]\n([^\[\s].*\n)*)hidden=.*\n/m, "$1");
			}
		}
		this._allowReload = aAllowReload;
		this._ignoreRemovedTabs = true;
		this.mCrashRecoveryService.restoreWindow(aWindow || window, aState, aReplaceTabs || false);
		this._ignoreRemovedTabs = false;
	},

	nameState: function(aState, aName)
	{
		if (!/^\[SessionManager\]/m.test(aState))
		{
			return "[SessionManager]\nname=" + aName + "\n\n" + aState;
		}
		return aState.replace(/^(\[SessionManager\])(?:\nname=.*)?/m, function($0, $1) { return $1 + "\nname=" + aName; });
	},

	stripTabUndoData: function(aState)
	{
		return aState.replace(new RegExp("^(xultab=)((?:\\S+ )*)" + this.mDataTabAttribute + "=\\S+( )?", "gm"), function($0, $1, $2, $3) { return $1 + ($2 + $3).slice(0, -1); });
	},

	getFormattedName: function(aTitle, aDate, aFormat)
	{
		function cut(aString, aLength)
		{
			return aString.replace(new RegExp("^(.{" + (aLength - 3) + "}).{4,}$"), "$1...");
		}
		function toISO8601(aDate)
		{
			return [aDate.getFullYear(), pad2(aDate.getMonth() + 1), pad2(aDate.getDate())].join("-");
		}
		function pad2(a) { return (a < 10)?"0" + a:a; }
		
		return (aFormat || this.mPref_name_format).split("%%").map(function(aPiece) {
			return aPiece.replace(/%(\d*)([tdm])/g, function($0, $1, $2) {
				$0 = ($2 == "t")?aTitle:($2 == "d")?toISO8601(aDate):pad2(aDate.getHours()) + ":" + pad2(aDate.getMinutes());
				return ($1)?cut($0, Math.max(parseInt($1), 3)):$0;
			});
		}).join("%");
	},

	makeFileName: function(aString)
	{
		return aString.replace(/[^\w ',;!()@&*+=~\x80-\xFE-]/g, "_").substr(0, 64) + this.mSessionExt;
	},

	getBrowserWindows: function()
	{
		var windowsEnum = this.mWindowMediator.getEnumerator("navigator:browser");
		var windows = [];
		
		while (windowsEnum.hasMoreElements())
		{
			windows.push(windowsEnum.getNext());
		}
		
		return windows;
	},

	doResumeCurrent: function(aOnce)
	{
		return this.getPref("extensions.crashrecovery.resume_session" + ((aOnce)?"_once":""), false, true);
	},

	setResumeCurrent: function(aValue)
	{
		this.setPref("extensions.crashrecovery.resume_session", aValue, true);
	},

	isCleanBrowser: function(aBrowser)
	{
		return aBrowser.sessionHistory.count < 2 && aBrowser.currentURI.spec == "about:blank";
	},

	setDisabled: function(aObj, aValue)
	{
		if (aValue)
		{
			aObj.setAttribute("disabled", "true");
		}
		else
		{
			aObj.removeAttribute("disabled");
		}
	},

	getEOL: function()
	{
		return /win|os[\/_]?2/i.test(navigator.platform)?"\r\n":/mac/i.test(navigator.platform)?"\r":"\n";
	},

	_string: function(aName)
	{
		return this.mBundle.getString(aName);
	}
};

window.addEventListener("load", gSessionManager.onLoad_proxy, false);
window.addEventListener("unload", gSessionManager.onUnload_proxy, false);

window.addEventListener("load", function() {
	if (!window.SessionManager) // if Tab Mix Plus isn't installed
	{
		window.SessionManager = gSessionManager;
	}
	if (typeof tabBarScrollStatus == "function") // hack for some Tab Mix Plus startup issue
	{
		setTimeout(tabBarScrollStatus, 0);
	}
}, false);
