# RetroZilla

RetroZilla is a fork of Gecko 1.8.1 for improved compatibility on the modern web, with Windows 95 and Windows NT 4.0 in mind. Right now, RetroZilla's rendering capabilities are pretty similar to Firefox 2.0's, but as RetroZilla progresses, so will its capabilities.

RetroZilla Suite is the primary target of RetroZilla, but code exists in the tree to build RetroZilla Browser (Firefox 2) and xulrunner.

## Building

I currently do my builds on Windows 2000 SP4 with Visual Studio 6.0 and MozillaBuild 1.2. Building should also work on Windows XP/2003, and possibly Vista and above, but don't take my word on it.

1. You're going to need to install VC6, [MozillaBuild 1.2](https://ftp.mozilla.org/pub/mozilla/libraries/win32/MozillaBuildSetup-1.2.exe), [VC6 SP5](https://github.com/rn10950/RetroZillaWeb/releases/download/0/vs6sp5.exe) (not SP6) and [VC6 Processor Pack](https://github.com/rn10950/RetroZillaWeb/releases/download/0/vcpp5.exe).

2. Place your source somewhere in a directory without spaces if it's not already. I recommend something like C:\projects\RetroZilla\RetroZilla. 

3. Start "start-msvc6.bat" in C:\mozilla-build\. This will open a UNIX-type shell window. navigate to your source directory. It uses UNIX-style file paths with the Windows drive letters as the first child directory (e.g. C:\WINDOWS\System32 will be /c/WINDOWS/System32 in MSYS shell) 

4. Copy mozconfig-suite.txt to mozconfig (no extension). Open up your newly created mozconfig in a text editor. You're going to want to change the object directory, I recommend changing it to the parent directory of the source. Using my example for a source directory above, change
`mk_add_options MOZ_OBJDIR=@TOPSRCDIR@/obj-sm95-release`
to 
`mk_add_options MOZ_OBJDIR=/c/projects/RetroZilla/obj-rzSuite-release`

4. Now just run `make -f client.mk configure build` from the MSYS shell and wait. On a VM running on a modern host, building should take 20-40 minutes. On XP-era desktops expect building to take about 1 hour and 20 minutes to 2 hours.

If start-msvc6.bat can't find your VC6 installation, add the following line to start-msvc6.bat, after "SET MOZILLABUILD=..."
`SET VC6DIR=C:\Program Files\Microsoft Visual Studio\VC98`

## Incremental Builds
If you have already built RetroZilla and you would like to save time by building only a small subset of the program to test a change you made, run make from the corresponding folder in your object directory. Depending on what you changed, building should only take a few minutes.

EX: If you made a change to `retrozilla/xpfe/browser/resources/content/navigator.xul`, cd into `{OBJDIR}/xpfe/browser/resources/content` using MSYS shell and run `make`.