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
var platformNode;

platformNode = getPlatform();
logComment("initInstall: platformNode=" + platformNode);
// end
// end - OS type detection

// ----LOCALIZATION NOTE: translate only these ------
var prettyName = "English (US) Language Pack";
var langcode = "en";
var chromeNode = langcode + "-US";
// --- END CHANGABLE STUFF ---
var regName    = "locales/mozilla/" + chromeNode;
var chromeName = chromeNode + ".jar";
var platformName = langcode + "-" + platformNode + ".jar";
var localeName = "locale/" + chromeNode + "/";

srDest = 1;
err    = initInstall(prettyName, regName, "2.2.0.0000000000"); 
logComment("initInstall: " + err);

fProgram = getFolder("Program");
logComment("fProgram: " + fProgram);

if(verifyDiskSpace(fProgram, srDest))
{
  var chromeType = LOCALE;
  err = addDirectory("",
                     "bin",     // dir name in jar to extract 
                     fProgram,  // Where to put this file (Returned from GetFolder) 
                     "");       // Force Flag 
  logComment("addDirectory() returned: " + err);

  if (err != SUCCESS)
  {
    logComment("addDirectory() to " + fProgram + "failed!");
    // couldn't install globally, try installing to the profile
    resetError();
    chromeType |= PROFILE_CHROME;
    fProgram = getFolder("Profile");
    logComment("try installing to the user profile:" + fProgram);
    err = addDirectory("","bin",fProgram,"");
  }
 
  setPackageFolder(fProgram);
 
  // check return value
  if (err == SUCCESS)
  {
    // register chrome
    var cf = getFolder(fProgram, "chrome/"+chromeName);
    var pf = getFolder(fProgram, "chrome/"+platformName);

    registerChrome(chromeType, cf, localeName + "global/");
    registerChrome(chromeType, cf, localeName + "communicator/");
    registerChrome(chromeType, cf, localeName + "branding/");

    registerChrome(chromeType, cf, localeName + "messenger/");
    registerChrome(chromeType, cf, localeName + "messenger-smime/");

    registerChrome(chromeType, cf, localeName + "editor/");
    registerChrome(chromeType, cf, localeName + "navigator/");
    registerChrome(chromeType, cf, localeName + "necko/");
    registerChrome(chromeType, cf, localeName + "mozldap/");
    registerChrome(chromeType, cf, localeName + "autoconfig/");
    registerChrome(chromeType, cf, localeName + "cookie/");
    registerChrome(chromeType, cf, localeName + "wallet/");
    registerChrome(chromeType, cf, localeName + "content-packs/");
    registerChrome(chromeType, cf, localeName + "help/");
    registerChrome(chromeType, cf, localeName + "pippki/");
    registerChrome(chromeType, cf, localeName + "pipnss/");
    registerChrome(chromeType, cf, localeName + "p3p/");

    registerChrome(chromeType, pf, localeName + "global-platform/");
    registerChrome(chromeType, pf, localeName + "communicator-platform/");
    registerChrome(chromeType, pf, localeName + "navigator-platform/");
    // mesenger-mapi package exists only on windows.
    // Register this package only for windows.
    if (platformNode == "win")
      registerChrome(chromeType, cf, localeName + "messenger-mapi/");
 
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
