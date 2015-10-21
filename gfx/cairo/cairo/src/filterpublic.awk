#!/bin/awk -f
# Reads cairo header files on stdin, and outputs a file with defines for
# renaming all public functions to Mozilla-specific names.
# Usage:
#   cat *.h | ./filterpublic.awk | sort > cairo-rename.h

BEGIN { state = "private"; }

/^CAIRO_BEGIN_DECLS/ {
  state = "public";
  next;
}

/^CAIRO_END_DECLS/ {
  state = "private";
  next;
}

/^cairo[a-zA-Z0-9_]+ \(.*/ {
  if (state == "public") {
    print "#define " $1 " _moz_" $1;
  }
}

