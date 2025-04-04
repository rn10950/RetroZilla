#!/bin/sh

# Set up locale.
if [ -z "$AB_CD" ]; then
  if [ -z "$1" ]; then AB_CD=en-US; else AB_CD=$1; fi
fi
# Set up settings and paths for finding files.
if [ -z "$DEBUG" ]; then DEBUG=0; fi
if [ -z "$PERL" ]; then PERL=perl; fi
if [ -z "$FEDIR" ]; then FEDIR=$PWD/..; fi
if [ -z "$CONFIGDIR" ]; then CONFIGDIR=$FEDIR/../../config; fi
if [ -z "$XPIROOT" ]; then XPIROOT=$PWD/xpi-tree-$AB_CD; fi
if [ -z "$JARROOT" ]; then JARROOT=$PWD/jar-tree-$AB_CD; fi
if [ -z "$LOCALEDIR" ]; then LOCALEDIR=$FEDIR/locales; fi
# the dir containing the actual localisation files
# usually this is in l10n/ repository (parallel to mozilla/)
# note that toolkit/defines.inc is expected in parallel to extensions/irc there
if [ -z "$L10NDIR" ]; then L10NDIR="$FEDIR/../../../l10n/$AB_CD/extensions/irc"; fi

# Display all the settings and paths if we're in debug mode.
if [ $DEBUG -ge 1 ]; then
  echo "\$DEBUG     = $DEBUG"
  echo "\$PERL      = $PERL"
  echo "\$CONFIGDIR = $CONFIGDIR"
  echo "\$XPIROOT   = $XPIROOT"
  echo "\$JARROOT   = $JARROOT"
  echo "\$FEDIR     = $FEDIR"
  echo "\$LOCALEDIR = $LOCALEDIR"
  echo "\$AB_CD     = $AB_CD"
  echo "\$L10NDIR   = $L10NDIR"
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
  
  if [ $DEBUG -gt 0 ]; then
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
  if [ $DEBUG -gt 0 ]; then
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


if [ "$1" = "clean" ]; then
  echo -n "Cleaning up files"
  echo -n .
  rm -rf "$XPIROOT"
  echo -n .
  rm -rf "$JARROOT"
  echo   ". done."
  
  exit
fi

# Check that requested language is in all-locales file (i.e. exists and it
# allowed to be used).
# FIXME: THIS DOES NOT WORK WITH CYGWIN.
grep -sx "$AB_CD" "$LOCALEDIR/all-locales" > /dev/null
if [ $? != 0 ]; then
  echo "ERROR: Language $AB_CD is currently not supported."
  exit 1
fi
if [ $DEBUG -ge 1 ]; then echo "Language   = $AB_CD"; fi


# Check directory setup.
if ! [ -d "$FEDIR" ]; then
  echo "ERROR: Base ChatZilla directory (FEDIR) not found."
  exit 1
fi
if ! [ -d "$CONFIGDIR" ]; then
  echo "ERROR: mozilla/config directory (CONFIGDIR) not found."
  exit 1
fi
if ! [ -d "$L10NDIR" ]; then
  echo "ERROR: Directory with localized files for $AB_CD language (L10NDIR) not found."
  exit 1
fi


# Extract version number.
VERSION=`grep "const __cz_version" "$FEDIR/xul/content/static.js" | sed "s|.*\"\([^\"]\{1,\}\)\".*|\1|"`
BASE_VERSION=`echo "$VERSION" | sed "s|\([0-9]\{1,\}\.[0-9]\{1,\}\.[0-9]\{1,\}\).*|\1|"`

if [ -z "$VERSION" ]; then
  echo "ERROR: Unable to get version number."
  exit 1
fi

echo "Beginning build of $AB_CD language pack for ChatZilla $VERSION..."

# Set up LangPack XPI name using version and language.
XPINAME="chatzilla-$VERSION.$AB_CD.xpi"

# Check for an existing XPI file and print a warning.
if [ -r "$XPINAME" ]; then
  echo "  WARNING: output XPI will be overwritten."
fi


# Check for required directory layouts.
echo -n "  Checking XPI structure"
echo -n .
if ! [ -d "$XPIROOT" ]; then mkdir -p $XPIROOT; fi
echo -n .
if ! [ -d "$XPIROOT/chrome" ]; then mkdir $XPIROOT/chrome; fi
echo   ".                        done"

echo -n "  Checking JAR structure"
echo -n .
if ! [ -d "$JARROOT" ]; then mkdir -p $JARROOT; fi
echo   ".                         done"


# Make Firefox updates.
echo -n "  Updating Firefox Extension files"
echo -n .
# make sure we have all defines we need when preprocessing the install.rdf file
# toolkit/defines.inc contains the definition for the locale name we use in the langpack title
safeCommand $PERL "$CONFIGDIR/preprocessor.pl" -DAB_CD=$AB_CD -DCHATZILLA_VERSION=$VERSION -DCHATZILLA_BASE_VERSION=$BASE_VERSION -DINSTALL_EXTENSION_ID=langpack-$AB_CD@chatzilla.mozilla.org -I$L10NDIR/../../toolkit/defines.inc -I$L10NDIR/defines.inc "$LOCALEDIR/generic/install.rdf" '>' "$XPIROOT/install.rdf"
echo -n .
echo   ".              done"


# Make Mozilla Suite updates.
echo -n "  Updating Mozilla Extension files"
echo -n .
# make sure we have all defines we need when preprocessing the install.js file
# toolkit/defines.inc contains the definition for the locale name we use in the langpack title
safeCommand $PERL "$CONFIGDIR/preprocessor.pl" -DAB_CD=$AB_CD -DCHATZILLA_VERSION=$VERSION -DCHATZILLA_BASE_VERSION=$BASE_VERSION -DINSTALL_EXTENSION_ID=langpack-$AB_CD@chatzilla.mozilla.org -I$L10NDIR/../../toolkit/defines.inc -I$L10NDIR/defines.inc "$LOCALEDIR/generic/install.js" '>' "$XPIROOT/install.js"
echo -n .
echo   ".              done"


# Create JAR.
echo -n "  Constructing JAR package"
echo -n .
OLDPWD=`pwd`
cd "$CONFIGDIR"
echo -n .

safeCommand $PERL preprocessor.pl -DAB_CD="$AB_CD" "$LOCALEDIR/jar.mn" '>' "$LOCALEDIR/jar.mn.pp"
echo -n .
safeCommand $PERL make-jars.pl -e -v -z zip -p preprocessor.pl -s "$LOCALEDIR" -d "$JARROOT" -c "$L10NDIR" -- "-DAB_CD=\"$AB_CD\"" '<' "$LOCALEDIR/jar.mn.pp"
echo -n .
safeCommand rm "$LOCALEDIR/jar.mn.pp"
cd "$OLDPWD"
echo   ".                    done"


# Make XPI.
echo -n "  Constructing XPI package"
echo -n .
safeCommand cp -v "$JARROOT/chatzilla.jar" "$XPIROOT/chrome/"
echo -n .
safeCommand mv "$JARROOT/../chrome.manifest" "$XPIROOT/chrome.manifest"
echo -n .
safeCommand chmod 664 "$XPIROOT/chrome/chatzilla.jar"
echo -n .
OLDPWD=`pwd`
cd "$XPIROOT"
safeCommand zip -vr ../$XPINAME . -i "*" -x "log*"
cd "$OLDPWD"
echo   ".                    done"


echo "Build of $AB_CD language pack for ChatZilla $VERSION... ALL DONE"
