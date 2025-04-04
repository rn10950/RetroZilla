#filter substitution
// variables
var version = "@CHATZILLA_VERSION@";
var locale = "@AB_CD@";
var jarFile = "chatzilla.jar";
var installName = "ChatZilla " + version + " @MOZ_LANG_TITLE@ Language Pack";
// size of the locale jar file in kibibytes (1024 bytes per KiB)
// en-US files need about 110 KiB currently, estimate up to 200 KiB for others
var srDest = 200;

// end variables, start real work

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

var err = initInstall(installName, "ChatZilla " + locale, version); 
logComment("initInstall: " + err);

if (verifyDiskSpace(getFolder("Program"), srDest))
{
    addFile("ChatZilla " + locale,
            "chrome/" + jarFile,        // jar source folder 
            getFolder("Chrome"),        // target folder
            "");                        // target subdir 

    registerChrome(LOCALE | DELAYED_CHROME, getFolder("Chrome", jarFile), "locale/" + locale + "/chatzilla/");

    if (err==SUCCESS)
        performInstall(); 
    else
        cancelInstall(err);
}
else
    cancelInstall(INSUFFICIENT_DISK_SPACE);
