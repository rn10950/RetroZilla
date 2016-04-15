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
  var szCurrentVersion;

  winreg.setRootKey(winreg.HKEY_LOCAL_MACHINE);
  subkey              = "SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion";
  szCurrentVersion    = winreg.getValueString(subkey, "CurrentVersion");
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

function registerProgramFolderKey(winreg, fFolderPath)
{
  var subkey;
  var err;

  /* set the Program Folder Path in the Mozilla key in the Windows Registry */
  winreg.createKey("SOFTWARE\\RetroZilla", "");

  subkey  = "SOFTWARE\\RetroZilla\\RetroZilla";
  winreg.createKey(subkey,"");
  err     = winreg.setValueString(subkey, "CurrentVersion", "1.1 (en)");

  subkey  = "SOFTWARE\\RetroZilla\\RetroZilla\\1.1 (en)";
  winreg.createKey(subkey,"");

  subkey  = "SOFTWARE\\RetroZilla\\RetroZilla\\1.1 (en)\\Main";
  winreg.createKey(subkey,"");
  err     = winreg.setValueString(subkey, "Program Folder Path", fFolderPath);
}

function createShortcuts() 
{
  var subkey;
  var szStartMenuPrograms;
  var szStartMenu;
  var szFolderDesktop;
  var szFolderQuickLaunch;
  var szFolderSendTo;
  var szFolderAppData;
  var winreg;
  var fWindows;
  var fTemp;
  var fProgram;
  var fileExe;
  var scExeDesc;
  var scProfileDesc;
  var scProfileDescParam;
  var scFolderName;
  var fFolderDesktop;
  var fFolderPath;
  var fFolderPathStr;
  var fFolderQuickLaunch;
  var is_winnt;
  var szCurrentVersion;
  var restrictedAccess;
  var ikwDefined;
  var folderQuickLaunchExists;
  var filePalmSyncInstallExe;
  var scDescPalmSyncInstall;
  var scDescPalmSyncUninstall;
  var folderPalmSyncName;

  winreg                    = getWinRegistry();
  fWindows                  = getFolder("Windows");
  fProgram                  = getFolder("Program");
  fileExe                   = getFolder("Program", "RetroZilla.exe");
  filePalmSyncInstallExe    = getFolder("Program", "PalmSyncInstall.exe");
  scDescPalmSyncInstall     = "Address Book Palm Sync Install";
  scDescPalmSyncUninstall   = "Address Book Palm Sync Uninstall";
  filePalmSyncReadme        = getFolder("Program", "palm.html");
  scDescPalmSyncReadme      = "Palm Sync User Guide";
  fileMailIcon              = getFolder("Chrome", "icons/default/messengerWindow.ico");
  scExeDesc                 = "Mail";
  scParam                   = "-mail";
  scFolderName              = "RetroZilla";
  folderPalmSyncName        = "Palm Tools";
  if(winreg != null) 
  {
    /* This will check to see if the user has restricted access or not.
     * It checks to see if HKEY_LOCALMACHINE\SOFTWARE is writable.  If
     * it is, then access is not restricted.  This is only used to
     * determine which Desktop, Programs, and Start Menu folders
     * are to used: common or per user
     */
    restrictedAccess = false;
    ikwDefined = typeof(winreg.isKeyWritable);
    logComment("winreg.isKeyWritable(): " + ikwDefined);
    if(ikwDefined == "function")
    {
      winreg.setRootKey(winreg.HKEY_LOCAL_MACHINE);
      if(!winreg.isKeyWritable("SOFTWARE"))
        restrictedAccess = true;
    }

    /* determine if the script is running under NT or not */
    winreg.setRootKey(winreg.HKEY_LOCAL_MACHINE);
    subkey              = "SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion";
    szCurrentVersion    = winreg.getValueString(subkey, "CurrentVersion");
    logComment("szCurrentVersion: " + szCurrentVersion);
    if((szCurrentVersion == "") || (szCurrentVersion == null))
    {
      is_winnt = false;
    }
    else
    {
      is_winnt = true;
    }

    logComment("is_winnt value: " + is_winnt);
    logComment("restrictedAccess value: " + restrictedAccess);
    if(!is_winnt || restrictedAccess)
    {
      winreg.setRootKey(winreg.HKEY_CURRENT_USER);
      subkey              = "SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Shell Folders";
      szStartMenuPrograms = winreg.getValueString(subkey, "Programs");
      szStartMenu         = winreg.getValueString(subkey, "Start Menu");
      szFolderDesktop     = winreg.getValueString(subkey, "Desktop");
    }
    else
    {
      winreg.setRootKey(winreg.HKEY_LOCAL_MACHINE);
      subkey              = "SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Shell Folders";
      szStartMenuPrograms = winreg.getValueString(subkey, "Common Programs");
      szStartMenu         = winreg.getValueString(subkey, "Common Start Menu");
      szFolderDesktop     = winreg.getValueString(subkey, "Common Desktop");
    }

    winreg.setRootKey(winreg.HKEY_CURRENT_USER);
    subkey              = "SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Shell Folders";
    szFolderSendTo      = winreg.getValueString(subkey, "SendTo");

    subkey              = "SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Shell Folders";
    szFolderAppData     = winreg.getValueString(subkey, "AppData");

    // locate the Quick Launch folder
    szFolderQuickLaunch     = szFolderAppData + "\\Microsoft\\Internet Explorer\\Quick Launch";
    fFolderQuickLaunch      = getFolder("file:///", szFolderQuickLaunch);
    folderQuickLaunchExists = File.isDirectory(fFolderQuickLaunch);
    if(!folderQuickLaunchExists)
    {
      subkey                  = "SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\GrpConv\\MapGroups";
      szFolderQuickLaunch     = winreg.getValueString(subkey, "Quick Launch");
      folderQuickLaunchExists = File.isDirectory(fFolderPath);
      if(folderQuickLaunchExists)
        fFolderQuickLaunch = getFolder("file:///", szFolderQuickLaunch);
    }
    logComment("folderQuickLaunchExists: " + folderQuickLaunchExists);

    subkey              = "SOFTWARE\\RetroZilla\\RetroZilla\\1.1 (en)\\Main";
    fFolderPathStr      = winreg.getValueString(subkey, "Program Folder Path");
    if((fFolderPathStr == "") || (fFolderPathStr == null))
    {
      fTemp       = szStartMenuPrograms + "\\" + scFolderName;
      fFolderPath = getFolder("file:///", fTemp);
    }
    else
    {
      /* convert the path string to a path folder object */
      fFolderPath = getFolder("file:///", fFolderPathStr);
    }
    /* convert the path string to a path folder object */
    fFolderDesktop = getFolder("file:///", szFolderDesktop);

    logComment("Folder StartMenuPrograms: " + szStartMenuPrograms);
    logComment("Folder StartMenu        : " + szStartMenu);
    logComment("Folder FolderDesktop    : " + szFolderDesktop);
    logComment("Folder FolderSendTo     : " + szFolderSendTo);
    logComment("Folder FolderQuickLaunch: " + szFolderQuickLaunch);
    logComment("fileExe                 : " + fileExe);
    logComment("fFolderPath             : " + fFolderPath);
    logComment("scExeDesc               : " + scExeDesc);
    logComment("fProgram                : " + fProgram);

    /* explicitly create the fFolderPath even though the windowsShortcut function creates the folder.
     * This is so that the folder creation gets logged for uninstall to remove it. */
    if(!File.exists(fFolderPath))
      File.dirCreate(fFolderPath);

    /* create the shortcuts */
    File.windowsShortcut(fileExe, fFolderPath, scExeDesc, fProgram, scParam, fileMailIcon, 0);

    // only create these two shortcuts if the files exist
    if(File.exists(filePalmSyncInstallExe))
    {
      /* build the path to the sub folder to Palm Sync files */
      var fStartMenuPalmSync = getFolder("file:///", fFolderPath + "/" + folderPalmSyncName);
      if(!File.exists(fStartMenuPalmSync))
        File.dirCreate(fStartMenuPalmSync);

      /* clean up the shortcuts in the old place */
      deleteThisFile("file:///", fFolderPath + "/" + scDescPalmSyncInstall);
      deleteThisFile("file:///", fFolderPath + "/" + scDescPalmSyncUninstall);

      /* create the shortcuts in the new sub folder */
      File.windowsShortcut(filePalmSyncInstallExe, fStartMenuPalmSync, scDescPalmSyncInstall, fProgram, "", filePalmSyncInstallExe, 0);
      File.windowsShortcut(filePalmSyncInstallExe, fStartMenuPalmSync, scDescPalmSyncUninstall, fProgram, "/u", filePalmSyncInstallExe, 1);

      // only create the palm sync readme shortcut if the file exist
      if(File.exists(filePalmSyncReadme))
      {
        /* create the shortcuts in the new sub folder */
        File.windowsShortcut(filePalmSyncReadme, fStartMenuPalmSync, scDescPalmSyncReadme, fProgram, "", filePalmSyncReadme, 0);
      }
    }

    //
    // Disabled for now because mail does not have a different shortcut icon from Mozilla
    //
    //// create shortcut in the Quick Launch folder
    //if(folderQuickLaunchExists)
    //  File.windowsShortcut(fileExe, fFolderQuickLaunch, scExeDesc, fProgram,  "", fileExe, 0);

    if(!restrictedAccess)
    {
      winreg.setRootKey(winreg.HKEY_LOCAL_MACHINE);
      registerProgramFolderKey(winreg, fFolderPath);
    }

    winreg.setRootKey(winreg.HKEY_CURRENT_USER);
    registerProgramFolderKey(winreg, fFolderPath);

    // Register as a windows XP mail application
    if( IsWinnt() )
    {
      subkey = "Software\\Clients\\Mail\\RetroZilla";
      winreg.setRootKey(winreg.HKEY_LOCAL_MACHINE);

      winreg.createKey(subkey,"");
      winreg.createKey(subkey + "\\DefaultIcon", "");
      winreg.createKey(subkey + "\\shell", "");
      winreg.createKey(subkey + "\\shell\\open", "");
      winreg.createKey(subkey + "\\shell\\open\\command", "");
      winreg.createKey(subkey + "\\InstallInfo","");

      winreg.setValueString(subkey, "", "RetroZilla Mail");

      // path does not need to be quoted per MS doc
      data = fProgram + "chrome\\icons\\default\\messengerWindow.ico,0";
      winreg.setValueString(subkey + "\\DefaultIcon", "", data);

      data = "\"" + fProgram + "RetroZilla.exe\" -mail";
      winreg.setValueString(subkey + "\\shell\\open\\command", "", data);

      data = "\"" + fProgram + "uninstall\\retrozillaUninstall.exe\" /ua \"1.1 (en)\" /hs mail";
      winreg.setValueString(subkey + "\\InstallInfo", "HideIconsCommand", data);

      // set this value to 0 because we're not creating the mail shortcuts yet.
      winreg.setValueNumber(subkey + "\\InstallInfo", "IconsVisible", 0);

      data = "\"" + fProgram + "RetroZilla.exe\" -silent -nosplash -setDefaultMail";
      winreg.setValueString(subkey + "\\InstallInfo", "ReinstallCommand", data);

      data = "\"" + fProgram + "uninstall\\retrozillaUninstall.exe\" /ua \"1.1 (en)\" /ss mail";
      winreg.setValueString(subkey + "\\InstallInfo", "ShowIconsCommand", data);
    }
  }
  else
  {
    logComment("winreg is null");
  }
}

function updateMapi()
{
  var winreg;
  var szValue;
  var szMapiBackupDll;
  var szDefaultMailClient;
  var programMozMapi32File;
  var mainExePath;
  var sfpProgramMozMapi32File;
  var sfpMainExePath;
  var winsysMapi32File;
  var mapiProxyFile;
  var subkey;
  var mailDefaultDescription = "RetroZilla Mail";

  winreg = getWinRegistry();
  if(winreg != null) 
  {
    mainExePath = getFolder("Program", "RetroZilla.exe");
    programMozMapi32File = getFolder("Program", "mozMapi32.dll");
    winsysMapi32File = getFolder("Win System", "Mapi32.dll");
    winreg.setRootKey(winreg.HKEY_LOCAL_MACHINE);

    // If Mapi_backup_dll *and* the default var of
    // HKEY_LOCAL_MACHINE\Software\Clients\Mail is set, then install
    // mozMapi32.dll to the windows system dir as Mapi32.dll.
    szMapiBackupDll = winreg.getValueString("SOFTWARE\\Mozilla\\Desktop", "Mapi_backup_dll");
    szDefaultMailClient = winreg.getValueString("SOFTWARE\\Clients\\Mail", "");
    logComment("szMapiBackupDll: " + szMapiBackupDll);
    logComment("szDefaultMailClient: " + szDefaultMailClient);
    if((szMapiBackupDll != null) && (szMapiBackupDll != "") &&
       (szDefaultMailClient != null) && (szDefaultMailClient == "RetroZilla"))
    {
      // We do not want to log this file to be uninstalled because the
      // uninstaller already has a special way to deal with restoring the
      // appropriate previous Mapi32.dll.
      addFile("",
              "1.1.0.0000000000",
              "bin/mozMapi32.dll",           // file name in jar to extract 
              getFolder("Win System"),       // Where to put this file (Returned from getFolder) 
              "Mapi32.dll",                  // new name when installed
              DO_NOT_UNINSTALL);
    }

    sfpProgramMozMapi32File = File.windowsGetShortName(programMozMapi32File);
    sfpMainExePath = File.windowsGetShortName(mainExePath);

    subkey  = "SOFTWARE\\Clients\\Mail\\RetroZilla";
    winreg.createKey(subkey, "");
    winreg.setValueString(subkey, "", mailDefaultDescription);
    winreg.setValueString(subkey, "DLLPath", sfpProgramMozMapi32File);

    winreg.createKey(subkey      + "\\DefaultIcon", "");
    winreg.setValueString(subkey + "\\DefaultIcon", "", sfpMainExePath + ",0");

    winreg.createKey(subkey      + "\\protocols", "");
    winreg.createKey(subkey      + "\\protocols\\mailto", "");
    winreg.setValueString(subkey + "\\protocols\\mailto", "", "URL:MailTo Protocol");

    winreg.createKey(subkey      + "\\protocols\\mailto\\shell", "");
    winreg.createKey(subkey      + "\\protocols\\mailto\\shell\\open", "");
    winreg.createKey(subkey      + "\\protocols\\mailto\\shell\\open\\command", "");
    winreg.setValueString(subkey + "\\protocols\\mailto\\shell\\open\\command", "", sfpMainExePath + " \"%1\"");

    winreg.createKey(subkey      + "\\shell", "");
    winreg.createKey(subkey      + "\\shell\\open", "");
    winreg.createKey(subkey      + "\\shell\\open\\command", "");
    winreg.setValueString(subkey + "\\shell\\open\\command", "", sfpMainExePath + " -mail");

    // Register MapiProxy.dll
    mapiProxyFile = getFolder("Program", "MapiProxy.dll");
    err = File.windowsRegisterServer(mapiProxyFile);
    logComment("File.windowsRegisterServer(" + mapiProxyFile + ") returned: " + err);
  }
}

function upgradeCleanup()
{
  // Obsolete files from Netscape 6.0 and Netscape 6.01 that
  // need to be cleaned up.
  deleteThisFile("Program",    "msgMapi.dll");
  deleteThisFile("Components", "signed.dll");
  deleteThisFile("Components", "smimestb.dll");
  deleteThisFile("Components", "nsMapiRegistry.dll");
  deleteThisFile("Components", "absyncsv.dll");
}

function updateWinIni()
{
  var fWinIni  = getWinProfile(getFolder("Windows"), "win.ini");
  if(fWinIni != null)
  {
    fWinIni.writeString("Mail", "MAPI", "1");
    fWinIni.writeString("Mail", "MAPIX", "1");
  }
}

// main
var srDest;
var err;
var fProgram;

srDest = 1;
err    = initInstall("RetroZilla Mail", "Mail", "1.1.0.0000000000"); 
logComment("initInstall: " + err);

fProgram = getFolder("Program");
logComment("fProgram: " + fProgram);

if(verifyDiskSpace(fProgram, srDest))
{
  setPackageFolder(fProgram);

  upgradeCleanup();
  err = addDirectory("",
                     "1.1.0.0000000000",
                     "bin",              // dir name in jar to extract 
                     fProgram,           // Where to put this file (Returned from GetFolder) 
                     "",                 // subdir name to create relative to fProgram
                     true);              // Force Flag 
  logComment("addDirectory() returned: " + err);

  // check return value
  if( err == SUCCESS )
  {
    createShortcuts();
    updateWinIni();
    updateMapi();

    // we don't want to fail on errors for the above
    resetError();

    // register chrome
    registerChrome(CONTENT | DELAYED_CHROME, 
                   getFolder("Chrome","messenger.jar"),
                   "content/messenger/");
    registerChrome(CONTENT | DELAYED_CHROME,
                   getFolder("Chrome","messenger.jar"),
                   "content/messenger-region/");
    registerChrome(CONTENT | DELAYED_CHROME,
                   getFolder("Chrome","messenger.jar"),
                   "content/messenger-smime/");
    registerChrome(CONTENT | DELAYED_CHROME,
                   getFolder("Chrome","messenger.jar"),
                   "content/messenger-mdn/");
    registerChrome(CONTENT | DELAYED_CHROME,
                   getFolder("Chrome","messenger.jar"),
                   "content/messenger-views/");
    registerChrome(CONTENT | DELAYED_CHROME,
                   getFolder("Chrome","messenger.jar"),
                   "content/messenger-mapi/");

    // log comments for uninstalling the registry keys created by mail for setting
    // itself up in WinXP's Start menu
    logComment("Create Registry Key: HKEY_LOCAL_MACHINE\\Software\\Clients\\Mail\\RetroZilla []");
    logComment("Store Registry Value: HKEY_LOCAL_MACHINE\\Software\\Clients\\Mail\\RetroZilla []");
    logComment("Store Registry Value: HKEY_LOCAL_MACHINE\\Software\\Clients\\Mail\\RetroZilla [DLLPath]");
    logComment("Create Registry Key: HKEY_LOCAL_MACHINE\\Software\\Clients\\Mail\\RetroZilla\\DefaultIcon []");
    logComment("Store Registry Value: HKEY_LOCAL_MACHINE\\Software\\Clients\\Mail\\RetroZilla\\DefaultIcon []");
    logComment("Create Registry Key: HKEY_LOCAL_MACHINE\\Software\\Clients\\Mail\\RetroZilla\\protocols []");
    logComment("Create Registry Key: HKEY_LOCAL_MACHINE\\Software\\Clients\\Mail\\RetroZilla\\protocols\\mailto []");
    logComment("Store Registry Value: HKEY_LOCAL_MACHINE\\Software\\Clients\\Mail\\RetroZilla\\protocols\\mailto []");
    logComment("Create Registry Key: HKEY_LOCAL_MACHINE\\Software\\Clients\\Mail\\RetroZilla\\protocols\\mailto\\shell []");
    logComment("Create Registry Key: HKEY_LOCAL_MACHINE\\Software\\Clients\\Mail\\RetroZilla\\protocols\\mailto\\shell\\open []");
    logComment("Create Registry Key: HKEY_LOCAL_MACHINE\\Software\\Clients\\Mail\\RetroZilla\\protocols\\mailto\\shell\\open\\command []");
    logComment("Store Registry Value: HKEY_LOCAL_MACHINE\\Software\\Clients\\Mail\\RetroZilla\\protocols\\mailto\\shell\\open\\command []");
    logComment("Create Registry Key: HKEY_LOCAL_MACHINE\\Software\\Clients\\Mail\\RetroZilla\\shell []");
    logComment("Create Registry Key: HKEY_LOCAL_MACHINE\\Software\\Clients\\Mail\\RetroZilla\\shell\\open []");
    logComment("Create Registry Key: HKEY_LOCAL_MACHINE\\Software\\Clients\\Mail\\RetroZilla\\shell\\open\\command []");
    logComment("Store Registry Value: HKEY_LOCAL_MACHINE\\Software\\Clients\\Mail\\RetroZilla\\shell\\open\\command []");

    // check return value
    err = getLastError();
    if(err == SUCCESS)
    {
      err = performInstall(); 
      logComment("performInstall() returned: " + err);

      // Commenting this out for now until bug 182423 is fixed. This will at least prevent
      // people who have not run PalmSyncInstall.exe to run into bug 182423.  However,
      // if they run the PalmSync uninstall by hand via the Start menu, then they will
      // still run into the bug.
      //if(err == SUCCESS)
      //{
      //  // Log the uninstall command to run PalmSyncInstall.exe to uninstall itself.
      //  // This needs to be logged after all the files have been installed.
      //  logComment("Uninstall Command: \"" + fProgram + "PalmSyncInstall.exe\" /us");
      //}
    }
    else
      cancelInstall(err);
  }
  else
    cancelInstall(err);
}
else
  cancelInstall(INSUFFICIENT_DISK_SPACE);

// end main
