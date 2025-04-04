#!/bin/sh

# Set up settings and paths for finding files.
if [ -z "$DEBUG" ]; then DEBUG=0; fi
if [ -z "$PERL" ]; then PERL=perl; fi
if [ -z "$FEDIR" ]; then FEDIR=$PWD/..; fi
if [ -z "$CONFIGDIR" ]; then CONFIGDIR=$FEDIR/../../config; fi
if [ -z "$XPIFILES" ]; then XPIFILES=$PWD/resources; fi
if [ -z "$XPIROOT" ]; then XPIROOT=$PWD/xpi-tree; fi
if [ -z "$JARROOT" ]; then JARROOT=$PWD/jar-tree; fi
if [ -z "$LOCALEDIR" ]; then LOCALEDIR=$FEDIR/locales; fi

# Display all the settings and paths if we're in debug mode.
if [ $DEBUG -ge 1 ]; then
	echo "\$DEBUG     = $DEBUG"
	echo "\$PERL      = $PERL"
	echo "\$CONFIGDIR = $CONFIGDIR"
	echo "\$XPIFILES  = $XPIFILES"
	echo "\$XPIROOT   = $XPIROOT"
	echo "\$JARROOT   = $JARROOT"
	echo "\$FEDIR     = $FEDIR"
	echo "\$LOCALEDIR = $LOCALEDIR"
fi

## Simple function to display all the parameters/arguments to itself.
function showParams()
{
  I=0
  for P in "$@"; do
    I=$((I+1))
    echo PARAM $I: "$P"
  done
}

## Call this with lots of parameters to run a command, log errors, and abort
## if it fails. Supports redirection if '>' and '<' are passed as arguments,
## e.g.:
##   safeCommand cmd arg1 arg2 '<' input.file '>' output-file
##
## Note: only a single input and single output redirection is supported.
##
function safeCommand()
{
  local -a CMD
  CMD_COUNT=$((0))
  INF=""
  OUTF=""
  LASTP=""
  for P in "$@"; do
    if [ "$LASTP" = "<" ]; then
      if [ -n "$INF" ]; then
        echo "ERROR: Multiple input files passed to safeCommand()." >&2
        exit 2
      fi
      INF="$P"
    elif [ "$LASTP" = ">" ]; then
      if [ -n "$OUTF" ]; then
        echo "ERROR: Multiple output files passed to safeCommand()." >&2
        exit 2
      fi
      OUTF="$P"
    elif [ "$P" = ">" -o "$P" = "<" ]; then
      echo >/dev/null
    else
      CMD[$CMD_COUNT]="$P"
      CMD_COUNT=$((CMD_COUNT+1))
    fi
    LASTP="$P"
  done
  
  if [ $DEBUG -ge 2 ]; then
    echo
    showParams "${CMD[@]}"
    echo 'INPUT  :' "$INF"
    echo 'OUTPUT :' "$OUTF"
  fi
  
  touch log.stdout log.stderr
  if [ -z "$INF" -a -z "$OUTF" ]; then
    "${CMD[@]}" 1>log.stdout 2>log.stderr
  elif [ -z "$INF" ]; then
    "${CMD[@]}" 1> "$OUTF" 2>log.stderr
  elif [ -z "$OUTF" ]; then
    "${CMD[@]}" < "$INF" 1>log.stdout 2>log.stderr
  else
    "${CMD[@]}" < "$INF" 1> "$OUTF" 2>log.stderr
  fi
  
  EC=$?
  if [ $DEBUG -ge 2 ]; then
    echo 'RESULT :' $EC
  fi
  if [ "$EC" != "0" ]; then
    echo "ERROR ($EC)"
    cat log.stdout
    cat log.stderr
    rm -f log.stdout log.stderr
    exit 1
  fi
  rm -f log.stdout log.stderr
  return $EC
}


## Begin real program ##


# Clean up XPI and JAR build directories.
if [ "$1" = "clean" ]; then
  echo -n "Cleaning up files"
  echo -n .
  rm -rf "$XPIROOT"
  echo -n .
  rm -rf "$JARROOT"
  echo   ". done."
  
  exit
fi


# Check directory setup.
if ! [ -d "$FEDIR" ]; then
  echo "ERROR: Base ChatZilla directory (FEDIR) not found."
  exit 1
fi
if ! [ -d "$CONFIGDIR" ]; then
  echo "ERROR: mozilla/config directory (CONFIGDIR) not found."
  exit 1
fi


# Extract version number.
VERSION=`grep "const __cz_version" "$FEDIR/xul/content/static.js" | sed "s|.*\"\([^\"]\{1,\}\)\".*|\1|"`
if [ -z "$VERSION" ]; then
  echo "ERROR: Unable to get version number."
  exit 1
fi


echo Beginning build of ChatZilla $VERSION...


# Set up XPI name.
XPINAME="chatzilla-$VERSION.xpi"
# Check for an existing XPI file and print a warning.
if [ -r "$XPINAME" ]; then
  echo "  WARNING: output XPI will be overwritten."
fi


# Check for required directory layouts.
echo -n "  Checking XPI structure"
echo -n .
if ! [ -d "$XPIROOT" ]; then mkdir -p "$XPIROOT"; fi
echo -n .
if ! [ -d "$XPIROOT/chrome" ]; then mkdir "$XPIROOT/chrome"; fi
echo -n .
if ! [ -d "$XPIROOT/chrome/icons" ]; then mkdir "$XPIROOT/chrome/icons"; fi
echo -n .
if ! [ -d "$XPIROOT/chrome/icons/default" ]; then mkdir "$XPIROOT/chrome/icons/default"; fi
echo -n .
if ! [ -d "$XPIROOT/components" ]; then mkdir "$XPIROOT/components"; fi
echo   ".           done"

echo -n "  Checking JAR structure"
echo -n .
if ! [ -d "$JARROOT" ]; then mkdir -p "$JARROOT"; fi
echo   ".               done"


# Make Firefox updates.
echo -n "  Updating Firefox Extension files"
echo -n .
safeCommand $PERL "$CONFIGDIR/preprocessor.pl" -DCHATZILLA_VERSION=$VERSION "$XPIFILES/install.rdf" '>' "$XPIROOT/install.rdf"
echo -n .
safeCommand cp "$XPIFILES/chatzilla-window.ico" "$XPIROOT/chrome/icons/default/chatzilla-window.ico"
echo -n .
safeCommand cp "$XPIFILES/chatzilla-window.xpm" "$XPIROOT/chrome/icons/default/chatzilla-window.xpm"
echo -n .
safeCommand cp "$XPIFILES/chatzilla-window16.xpm" "$XPIROOT/chrome/icons/default/chatzilla-window16.xpm"
echo   ".  done"


# Make Mozilla Suite updates.
echo -n "  Updating Mozilla Extension files"
echo -n .
safeCommand sed "s|@REVISION@|$VERSION|g" '<' "$XPIFILES/install.js" '>' "$XPIROOT/install.js"
echo -n .
safeCommand mv "$FEDIR/xul/content/contents.rdf" "$FEDIR/xul/content/contents.rdf.in"
safeCommand sed "s|\(chrome:displayName=\)\"[^\"]\{1,\}\"|\1\"ChatZilla $VERSION\"|g" '<' "$FEDIR/xul/content/contents.rdf.in" '>' "$FEDIR/xul/content/contents.rdf"
safeCommand rm "$FEDIR/xul/content/contents.rdf.in"
echo   ".    done"


# Create JAR.
echo -n "  Constructing JAR package"
echo -n .
OLDPWD=`pwd`
cd "$CONFIGDIR"
echo -n .

safeCommand $PERL make-jars.pl -e -v -z zip -p preprocessor.pl -s "$FEDIR" -d "$JARROOT" '<' "$FEDIR/jar.mn"
echo -n .
safeCommand $PERL make-jars.pl -e -v -z zip -p preprocessor.pl -s "$FEDIR/sm" -d "$JARROOT" '<' "$FEDIR/sm/jar.mn"
echo -n .
safeCommand $PERL make-jars.pl -e -v -z zip -p preprocessor.pl -s "$FEDIR/ff" -d "$JARROOT" '<' "$FEDIR/ff/jar.mn"
echo -n .
safeCommand $PERL preprocessor.pl -DAB_CD="en-US" "$LOCALEDIR/jar.mn" '>' "$LOCALEDIR/jar.mn.pp"
safeCommand $PERL make-jars.pl -e -v -z zip -p preprocessor.pl -s "$LOCALEDIR" -d "$JARROOT" -c "$LOCALEDIR/en-US" -- "-DAB_CD=\"en-US\"" '<' "$LOCALEDIR/jar.mn.pp"
safeCommand rm "$LOCALEDIR/jar.mn.pp"
echo -n .
cd "$OLDPWD"
echo   ".        done"


# Make XPI.
echo -n "  Constructing XPI package"
echo -n .
safeCommand cp -v "$JARROOT/chatzilla.jar" "$XPIROOT/chrome/"
echo -n .
safeCommand cp -v "$FEDIR/js/lib/chatzilla-service.js" "$XPIROOT/components/"
echo -n .
safeCommand mv "$JARROOT/../chrome.manifest" "$XPIROOT/chrome.manifest"
echo -n .
safeCommand chmod 664 "$XPIROOT/chrome/chatzilla.jar"
echo -n .
safeCommand chmod 664 "$XPIROOT/components/chatzilla-service.js"
echo -n .
OLDPWD=`pwd`
cd "$XPIROOT"
safeCommand zip -vr ../$XPINAME . -i "*" -x "log*"
cd "$OLDPWD"
echo   ".        done"


echo "Build of ChatZilla $VERSION...         ALL DONE"
