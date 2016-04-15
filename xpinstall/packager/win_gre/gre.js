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

function IsWinnt()
{
  /* Determines if the script is running under NT or not.
   *
   */
  var winreg = getWinRegistry();
  var subkey;
  var valname;
  var szCurrentVersion;

  winreg.setRootKey(winreg.HKEY_LOCAL_MACHINE);
  subkey              = "SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion";
  valname             = "CurrentVersion";
  szCurrentVersion    = winreg.getValueString(subkey, valname);
  logComment("szCurrentVersion: " + szCurrentVersion);
  if((szCurrentVersion == "") || (szCurrentVersion == null))
  {
    return false;
  }
  else
  {
    return true;
  }
}

function registerKeys()
{
  var subkey;  //the name of the subkey you are poking around in
  var err;
  var winreg;
  var tmpstr;

  winreg = getWinRegistry();
  winreg.setRootKey(winreg.HKEY_LOCAL_MACHINE);

  createRootRegKey(winreg);

  subkey = regRootKey;
  err    = winreg.setValueString(subkey, "Version", "1.8.1.24_0000000000");
  err    = winreg.setValueString(subkey, "BuildID", "0000000000");
  tmpstr = new String(fProgram);
  err    = winreg.setValueString(subkey, "GreHome", tmpstr.substring(0, tmpstr.length-1));
  err    = winreg.setValueString(subkey, "GreComponentsDir", fProgram + "Components");

  registerMainKeys(winreg);
}

function createRootRegKey(winreg)
{
  var subkey;
  var tmpstr;
  var tmpstr2;
  var index;

  tmpstr = new String(regRootKey);
  index = tmpstr.indexOf("\\");
  subkey = "";

  while(index > 0)
  {
    subkey = subkey + tmpstr.substring(0, index);
    winreg.createKey(subkey,"");

    tmpstr2 = tmpstr.substring(index+1, tmpstr.length);
    tmpstr = new String(tmpstr2);

    index = tmpstr.indexOf("\\");
    subkey = subkey + "\\";
  }

  if(tmpstr.length > 0)
  {
    subkey = subkey + tmpstr;
    logComment("subkey:  " + subkey);
    winreg.createKey(subkey,"");
  }

  winreg.createKey(subkey,"");
}

function registerMainKeys(winreg)
{
  var subkey;  //the name of the subkey you are poking around in
  var valname; //the name of the value you want to look at
  var value;   //the data in the value you want to look at.
  var err;

  winreg.createKey(regRootKey, "");

  subkey  = regRootKey + "\\Main";
  winreg.createKey(subkey,"");
  err     = winreg.setValueString(subkey, "Install Directory", fProgram);

  subkey  = regRootKey + "\\Uninstall";
  winreg.createKey(subkey,"");
  err     = winreg.setValueString(subkey, "Uninstall Log Folder", fProgram + "Uninstall");
  err     = winreg.setValueString(subkey, "Description", "GRE (1.1)");
}

// main
var srDest;
var err;
var err2;
var fProgram;
var fWindowsSystem;
var fileComponentRegStr;
var fileComponentReg;
var restrictedAccess;
var fileToRegister;
var regRootKey;

// So far the only argument passed in is the root path into the Windows registry.
regRootKey = new String(Install.arguments);

srDest = 1;
err    = initInstall("GRE", "GRE", "1.1.0.0000000000"); 
logComment("initInstall: " + err);

fProgram  = getFolder("Program");
logComment("fProgram: " + fProgram);

if(verifyDiskSpace(fProgram, srDest))
{
  setPackageFolder(fProgram);

  err = addDirectory("",
                     "",
                     "gre",              // dir name in jar to extract 
                     fProgram,           // Where to put this file (Returned from GetFolder) 
                     "",                 // subdir name to create relative to fProgram
                     true);              // Force Flag 
  logComment("addDirectory() of Program returned: " + err);

  err = addDirectory("",
                     "",
                     "Embed",              // dir name in jar to extract 
                     fProgram,           // Where to put this file (Returned from GetFolder) 
                     "",                 // subdir name to create relative to fProgram
                     true);              // Force Flag 
  logComment("addDirectory() of Program returned: " + err);

  // Let the uninstaller know about this generated file.
  logComment("Installing: "    + fProgram + ".autoreg");

  // check return value
  if( err == SUCCESS )
  {
    registerKeys();
//    // we don't want to fail on errors for the above
//    resetError();

      err = performInstall();
      logComment("performInstall() returned: " + err);
  }
  else
    cancelInstall(err);
}
else
  cancelInstall(INSUFFICIENT_DISK_SPACE);


// end main
