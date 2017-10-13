==========================================================================

= = = = = = = = = = = = =  RetroZilla Read Me  = = = = = = = = = = = = = =

==========================================================================

RetroZilla is subject to the terms detailed in the license agreement
accompanying it.

This Read Me file contains information about system requirements and
installation instructions for the Windows builds of RetroZilla.

For more info on RetroZilla, see 

  https://rn10950.github.io/RetroZillaWeb/

To submit bugs or other feedback, see the Navigator QA menu and check out
GitHub at https://github.com/rn10950/RetroZilla for links to known bugs,
bug-writing guidelines, and more. 


==========================================================================

                          Getting RetroZilla

==========================================================================

You can download the source code of RetroZilla from the RetroZilla GitHub
at

  https://github.com/rn10950/RetroZilla

Keep in mind that the source code in its raw form may be buggy. If you are
looking for a more polished version of RetroZilla, the RetroZilla project 
releases builds of RetroZilla regularly that you can download from

  https://rn10950.github.io/RetroZillaWeb/
 
Be sure to read the RetroZilla release notes for information on known
problems and installation issues with RetroZilla.  The release notes 
can be found at the preceding URL along with the releases themselves.


==========================================================================

                         System Requirements

==========================================================================

* General

   If you want to view and use the "Modern" theme, your display monitor
   should be set to display thousands of colors. For users who cannot set
   their displays to use more than 256 colors, the RetroZilla project
   recommends using the "Classic" theme for RetroZilla.

   To select the Modern theme after you have installed RetroZilla, from 
   the browser, open the View menu, then open the Apply Theme submenu and
   choose Modern.

*Windows

   - Windows 95, 98, Me, NT4, 2000 or XP
   - Intel Pentium class processor (233 MHz or faster recommended)
   - 64 MB RAM
   - 26 MB free hard disk space

* We recommend that Windows XP, Vista, 7, 8.x and 10 users not use 
  RetroZilla, and instead use the current version of SeaMonkey or Firefox. 
  They are much more secure and compatible with the modern web than 
  RetroZilla is.

* We recommend that Windows 2000 users use Firefox 12 or SeaMonkey 2.9.

* We recommend that Windows 98 and Me users use Firefox 3.6 or SeaMonkey 
  2.0.14 with the KernelEx platform.


==========================================================================

                      Installation Instructions

==========================================================================

It is strongly recommended that you exit all programs before running the
setup program. Also, you should temporarily disable virus-detection
software.

Install into a clean (new) directory. Installing on top of previously
released builds may cause problems.

Note: These instructions do not tell you how to build RetroZilla.
For info on building RetroZilla from the mozilla.org source code, see

  https://rn10950.github.io/RetroZillaWeb/


Windows Installation Instructions
---------------------------------

Note: For Windows NT/2000/XP systems, you need Administrator privileges to
install RetroZilla. If you see an "Error 5" message during installation,
make sure you're running the installation with Administrator privileges.


   To install RetroZilla by downloading the RetroZilla installer,
   follow these steps:

   1. Click the link to seamonkey-x.xx.en-US.win32.installer.exe (or
      similar file name) on the site you're downloading RetroZilla from to
      download the installer file to your machine.

   2. Navigate to where you downloaded the file and double-click the
      installer file icon on your machine to begin the Setup program.

   3. Follow the on-screen instructions in the setup program. The program
      starts automatically the first time.


   To install RetroZilla by downloading the .zip file and installing
   manually, follow these steps:

   1. Click the link to seamonkey-x.xx.en-US.win32.zip (or similar file
      name) on the site you're downloading RetroZilla from to download the
      .zip file to your machine.

   2. Navigate to where you downloaded the file and double-click the
      compressed file.

      Note: This step assumes you already have a recent version of WinZip
      (or a similar zip tool) installed, and that you know how to use it.
      If not, you can get WinZip and information about the program at
      www.winzip.com.

   3. Extract the .zip file to a directory such as
        C:\Program Files\mozilla.org\RetroZilla.

   4. To start RetroZilla, navigate to the directory you extracted
      RetroZilla to and double-click the seamonkey.exe icon.



Mac OS X Installation Instructions
----------------------------------

    To install RetroZilla by downloading the RetroZilla disk image,
    follow these steps:

	1. Click the mozilla-mac-MachO.dmg.gz link to download
	it to your machine. By default, the download file is
	downloaded to your desktop.

	2. Once you have downloaded the .dmg.gz file, drag it
	onto Stuffit Expander to decompress it. If the disk
	image doesn't mount automatically, double-click on the
	.dmg file to mount it. If that fails, and the file
	does not look like a disk image file, do a "Show Info"
	on the file, and, in the "Open with application"
	category, choose Disk Copy. In Mac OS 10.2, you can
	use "Open with" from the context menu.

	3. Once the disk image mounts, open it, and drag the
	RetroZilla icon onto your hard disk.

	4. We recommend that you copy it to the Applications
	folder.

	5. Now Eject the disk image.

	6. If you like, you can drag RetroZilla to your dock to
	have it easily accessible at all times. You might also
	wish to select RetroZilla as your default browser in the
	Internet system preferences pane (under the Web tab).


Linux Installation Instructions
-------------------------------

Note: If you install in the default directory (which is
usually /usr/local/mozilla), or any other directory where
only the root user normally has write-access, you must
start RetroZilla first as root before other users can start
the program. Doing so generates a set of files required
for later use by other users.


    To install RetroZilla by downloading the RetroZilla installer,
    follow these steps:

	1. Create a directory named mozilla (mkdir mozilla)
	and change to that directory (cd mozilla).

	2. Click the link on the site you're downloading
	RetroZilla from to download the installer file
	(called mozilla-1686-pc-linux-gnu-installer.tar.gz)
	to your machine.

	3. Change to the mozilla directory (cd mozilla) and
	decompress the archive with the following command:

	  tar zxvf moz*.tar.gz

	The installer is now located in a subdirectory of
	RetroZilla	named mozilla-installer.

	4. Change to the mozilla-installer directory
	(cd mozilla-installer) and run the installer with the
	./mozilla-installer command.

 	5. Follow the instructions in the install wizard for
	installing RetroZilla.

	Note: If you have a slower machine, be aware that the
	installation may take some time. In this case, the
	installation progress may appear to hang indefinitely,
	even though the installation is still in process.

	6. To start RetroZilla, change to the directory where you
	installed it and run the ./mozilla command.


    To install RetroZilla by downloading the tar.gz file:

	1. Create a directory named "mozilla" (mkdir mozilla)
	and change to that directory (cd mozilla).

	2. Click the link on the site you're downloading
	RetroZilla from to download the non-installer
	(mozilla*.tar.gz) file into the mozilla directory.

	3. Change to the mozilla directory (cd mozilla) and
	decompress the file with the following command:

	  tar zxvf moz*.tar.gz

	This creates a "mozilla" directory under your mozilla
	directory.

	4. Change to the mozilla directory (cd mozilla).

	5. Run RetroZilla with the following run script:

	  ./mozilla


    To hook up RetroZilla complete with icon to the GNOME Panel,
    follow these steps:

	1. Click the GNOME Main Menu button, open the Panel menu,
	and then open the Add to Panel submenu and choose Launcher.

	2. Right-click the icon for RetroZilla on the Panel and
	enter the following command:
	  directory_name./mozilla

	where directory_name is the name of the directory
	you downloaded mozilla to. For example, the default
	directory that RetroZilla suggests is /usr/local/mozilla.

	3. Type in a name for the icon, and type in a comment
	if you wish.

	4. Click the icon button and type in the following as
	the icon's location:

	  directory_name/icons/mozicon50.xpm

	where directory name is the directory where you
	installed RetroZilla. For example, the default directory
	is /usr/local/mozilla/icons/mozicon50.xpm.
