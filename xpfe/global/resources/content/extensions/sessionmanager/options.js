gSessionManager._onLoad = gSessionManager.onLoad;
gSessionManager.onLoad = function() {
	this._onLoad(true);
	
	var resume_session = _("resume_session");
	var sessions = this.getSessions();
	resume_session.appendItem(this._string("startup_none"), "", "");
	resume_session.appendItem(this._string("startup_prompt"), this.mPromptSessionName, "");
	if (!sessions.some(function(aSession) { return aSession.fileName == this.mBackupSessionName; }, this))
	{
		resume_session.appendItem(this._string("startup_resume"), this.mBackupSessionName, "");
	}
	sessions.forEach(function(aSession) {
		resume_session.appendItem(aSession.name, aSession.fileName, "");
	});
	resume_session.value = _("extensions.sessionmanager.resume_session").value;
	
	_("SessionManagerPrefs").selectedIndex = _("extensions.sessionmanager.options_selected_tab").value;
};
gSessionManager.onUnload = function() {
	_("extensions.sessionmanager.options_selected_tab").valueFromPreferences = _("SessionManagerPrefs").selectedIndex;
};

var _disable = gSessionManager.setDisabled;

function readMaxClosedUndo()
{
	var value = _("extensions.sessionmanager.max_closed_undo").value;
	
	_disable(_("save_window_list"), value == 0);
	
	return value;
}

function readMaxTabsUndo()
{
	var value = _("extensions.sessionmanager.max_tabs_undo").value;
	
	_disable(_("save_closed_tabs"), value == 0);
	_disable(document.getElementsByAttribute("control", "save_closed_tabs")[0], value == 0);
	
	return value;
}

function promptClearUndoList()
{
	var max_tabs_undo = _("max_tabs").value;
	
	gSessionManager.clearUndoListPrompt();
	
	_("max_tabs").value = max_tabs_undo;
};

function readInterval()
{
	return _("extensions.crashrecovery.interval").value / 1000;
}

function writeInterval()
{
	return Math.round(parseFloat(_("interval").value) * 1000 || 0);
}

function readPrivacyLevel()
{
	var value = _("extensions.crashrecovery.privacy_level").value;
	
	_disable(_("postdata"), value > 1);
	_disable(document.getElementsByAttribute("control", "postdata")[0], value > 1);
	
	return value;
}

function _(aId)
{
	return document.getElementById(aId);
}
