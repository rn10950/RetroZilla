==============================================================

= = = = = = = = = =   RetroZilla Read Me    = = = = = = = = = = =

==============================================================

RetroZilla is subject to the terms detailed in the license
agreement accompanying it.

This Read Me file contains information about system
requirements and installation instructions for the Windows,
Mac OS, and Linux builds of RetroZilla.

For more info on RetroZilla, see www.mozilla.org. To submit bugs
or other feedback, see the Navigator QA menu and check out
Bugzilla at http://bugzilla.mozilla.org for links to known
bugs, bug-writing guidelines, and more. You can also get help
with Bugzilla by pointing your IRC client to #mozillazine
at irc.mozilla.org.


==============================================================

                      Getting RetroZilla

==============================================================

You can download nightly builds of RetroZilla from the
RetroZilla.org FTP site at

  ftp://ftp.mozilla.org/pub/mozilla.org/mozilla/nightly/

For the very latest builds, see

  ftp://ftp.mozilla.org/pub/mozilla.org/mozilla/nightly/latest-trunk

Keep in mind that nightly builds, which are used by
RetroZilla.org developers for testing, may be buggy. If you are
looking for a more polished version of RetroZilla, RetroZilla.org
releases Milestone builds of RetroZilla every six weeks or so
that you can download from

  http://www.mozilla.org/releases

Be sure to read the RetroZilla release notes for information
on known problems and installation issues with RetroZilla.
The release notes can be found at the preceding URL along
with the milestone releases themselves.

Note: Please use Talkback builds whenever possible. These
builds allow transmission of crash data back to RetroZilla
developers, improved crash analysis, and posting of crash
information to our crash-data newsgroup.


==============================================================

                    System Requirements

==============================================================

*All Platforms

	To view and use the new streamlined "Modern" theme,
	your display monitor should be set to display
	thousands of colors. For users who cannot set their
	displays to use	more than 256 colors, RetroZilla.org
	recommends using the "Classic" theme for RetroZilla.

	To select the Modern theme after you have installed
	RetroZilla, from the Navigator browser, open the View
	menu, and then open then open the Apply Theme submenu
	and choose Modern.

*Mac OS

	-Mac OS X or later
	-PowerPC processor (266 MHz or faster recommended)
	-64 MB RAM
	-36 MB of free hard disk space

*Windows

	-Windows 95, 98, Me, NT4, 2000 or XP
	-Intel Pentium class processor (233 MHz or faster
	 recommended)
	-64 MB RAM
	-26 MB free hard disk space

*Linux

	-The following library versions (or compatible) are
	 required: glibc 2.1, XFree86 3.3.x, GTK 1.2.x, Glib
	 1.2.x, Libstdc++ 2.9.0. Red Hat Linux 6.0,
	 Debian 2.1, and SuSE 6.2 (or later) installations
	 should work.
	-Red Hat 6.x users who want to install the RetroZilla
	 RPM must have at least version 4.0.2 of rpm
	 installed.
	-Intel Pentium class processor (233 MHz or faster
	 recommended)
	-64MB RAM
	-26MB free hard disk space


==============================================================

                 Installation Instructions

==============================================================

For Mac OS and Windows users, it is strongly recommended that
you exit all programs before running the setup program. Also,
you should temporarily disable virus-detection software.

For Linux users, note that the installation instructions use
the bash shell. If you're not using bash, adjust the commands
accordingly.

For all platforms, install into a clean (new) directory.
Installing on top of previously released builds may cause
problems.

Note: These instructions do not tell you how to build RetroZilla.
For info on building the RetroZilla source, see

  http://www.mozilla.org/source.html


Windows Installation Instructions
---------------------------------

Note: For Windows NT/2000/XP systems, you need Administrator
privileges to install RetroZilla. If you see an "Error 5" message
during installation, make sure you're running the installation
with Administrator privileges.


    To install RetroZilla by downloading the RetroZilla installer,
    follow these steps:

	1. Click the the mozilla-win32-installer.exe link on
	the site you're downloading RetroZilla from to download
	the installer file to your machine.

	2. Navigate to where you downloaded the file and
	double-click the RetroZilla program icon on your machine
	to begin the Setup program.

	3. Follow the on-screen instructions in the setup
	program. The program starts automatically the first
	time.


    To install RetroZilla by downloading the .zip file and
    installing manually, follow these steps:

	1. Click the mozilla-win32-talkback.zip link or the
	mozilla-win32.zip link on the site you're down-
	loading RetroZilla from to download the .zip file to
	your machine.

	2. Navigate to where you downloaded the file and
	double-click the compressed file.

	Note: This step assumes you already have a recent
	version of WinZip installed, and that you know how to
	use it. If not,	you can get WinZip and information
	about the program at www.winzip.com.

	3. Extract the .zip file to a directory such as
	C:\Program Files\mozilla.org\RetroZilla.

	4. To start RetroZilla, navigate to the directory you
	extracted RetroZilla to and double-click the RetroZilla.exe
	icon.


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
