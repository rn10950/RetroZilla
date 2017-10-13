// this function verifies disk space in kilobytes
function verifyDiskSpace(dirPath, spaceRequired)
{
  var spaceAvailable;

  // Get the available disk space on the given path
  spaceAvailable = fileGetDiskSpaceAvailable(dirPath);

  // Convert the available disk space into kilobytes
  spaceAvailable = parseInt(spaceAvailable / 1024);

  // do the verification
  if(spaceAvailable < spaceRequired)
  {
    logComment("Insufficient disk space: " + dirPath);
    logComment("  required : " + spaceRequired + " K");
    logComment("  available: " + spaceAvailable + " K");
    return(false);
  }

  return(true);
}

// this function deletes a file if it exists
function deleteThisFile(dirKey, file)
{
  var fFileToDelete;

  fFileToDelete = getFolder(dirKey, file);
  logComment("File to delete: " + fFileToDelete);
  if(File.isFile(fFileToDelete))
  {
    File.remove(fFileToDelete);
    return(true);
  }
  else
    return(false);
}

// this function deletes a folder if it exists
function deleteThisFolder(dirKey, folder, recursiveDelete)
{
  var fToDelete;

  if(typeof recursiveDelete == "undefined")
    recursiveDelete = true;

  fToDelete = getFolder(dirKey, folder);
  logComment("folder to delete: " + fToDelete);
  if(File.isDirectory(fToDelete))
  {
    File.dirRemove(fToDelete, recursiveDelete);
    return(true);
  }
  else
    return(false);
}

// OS type detection
// which platform?
function getPlatform()
{
  var platformStr;
  var platformNode;

  if('platform' in Install)
  {
    platformStr = new String(Install.platform);

    if (!platformStr.search(/^Macintosh/))
      platformNode = 'mac';
    else if (!platformStr.search(/^Win/))
      platformNode = 'win';
    else if (!platformStr.search(/^OS\/2/))
      platformNode = 'win';
    else
      platformNode = 'unix';
  }
  else
  {
    var fOSMac  = getFolder("Mac System");
    var fOSWin  = getFolder("Win System");

    logComment("fOSMac: "  + fOSMac);
    logComment("fOSWin: "  + fOSWin);

    if(fOSMac != null)
      platformNode = 'mac';
    else if(fOSWin != null)
      platformNode = 'win';
    else
      platformNode = 'unix';
  }

  return platformNode;
}

// main
var srDest;
var err;
var fProgram;
var searchPlugins = "searchplugins";
var platformNode = getPlatform();

// ----LOCALIZATION NOTE: translate only these ------
var prettyName = "US Region Pack";
var chromeNode = "US";
// --- END CHANGABLE STUFF ---

var regName    = "locales/mozilla/" + chromeNode;
var chromeName = chromeNode + ".jar";
var localeName = "locale/" + chromeNode + "/";

srDest = 1;
err    = initInstall(prettyName, regName, "2.1.0.0000000000"); 
logComment("initInstall: " + err);

if (platformNode == 'mac')
{
  searchPlugins = "Search Plugins";
}

fProgram = getFolder("Program");
logComment("fProgram: " + fProgram);

if(verifyDiskSpace(fProgram, srDest))
{
  var chromeType = LOCALE;
  var fTarget;

  setPackageFolder(fProgram);

  fTarget = getFolder("Chrome");
  err = addDirectory("",
                     "bin/chrome",       // dir name in jar to extract 
                     fTarget,            // Where to put this file (Returned from GetFolder) 
                     "");                // subdir name to create relative to fProgram
  logComment("addDirectory() returned: " + err);
  if (err == SUCCESS)
  {
    fTarget = getFolder("Program", "defaults");
    logComment("fTarget: " + fTarget);
    err = addDirectory("",
                       "bin/defaults", // dir name in jar to extract 
                       fTarget,        // Where to put this file (Returned from GetFolder) 
                       "");            // subdir name to create relative to fProgram 
    logComment("addDirectory() returned: " + err);
    if (err == SUCCESS)
    {
      fTarget = getFolder("Program", searchPlugins);
      logComment("fTarget: " + fTarget);
      err = addDirectory("",
                         "bin/searchplugins", // dir name in jar to extract 
                         fTarget,          // Where to put this file (Returned from GetFolder) 
                         "");                 // subdir name to create relative to fProgram 
      logComment("addDirectory() returned: " + err);
    }
  }
  if (err != SUCCESS)
  {
    logComment("addDirectory() to " + fProgram + "failed!");
    // couldn't install globally, try installing to the profile
    resetError();
    chromeType |= PROFILE_CHROME;
    fProgram = getFolder("Profile");
    logComment("try installing to the profile: " + fProgram);
    err = addDirectory("","bin/chrome",fProgram,"chrome");
  }

  if (err == SUCCESS)
  {
    // register chrome
    var cf = getFolder(fProgram, "chrome/"+ chromeName);
    registerChrome(chromeType, cf, localeName + "global-region/");
    registerChrome(chromeType, cf, localeName + "communicator-region/");
    registerChrome(chromeType, cf, localeName + "editor-region/");
    registerChrome(chromeType, cf, localeName + "messenger-region/");
    registerChrome(chromeType, cf, localeName + "navigator-region/");

    err = performInstall(); 
    logComment("performInstall() returned: " + err);
  }
  else
  {
    cancelInstall(err);
    logComment("cancelInstall due to error: " + err);
  }
}
else
  cancelInstall(INSUFFICIENT_DISK_SPACE);

// end main
