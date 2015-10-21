/* cairo - a vector graphics library with display and print output
 *
 * Copyright © 2005 Red Hat, Inc
 *
 * This library is free software; you can redistribute it and/or
 * modify it either under the terms of the GNU Lesser General Public
 * License version 2.1 as published by the Free Software Foundation
 * (the "LGPL") or, at your option, under the terms of the Mozilla
 * Public License Version 1.1 (the "MPL"). If you do not alter this
 * notice, a recipient may use your version of this file under either
 * the MPL or the LGPL.
 *
 * You should have received a copy of the LGPL along with this library
 * in the file COPYING-LGPL-2.1; if not, write to the Free Software
 * Foundation, Inc., 59 Temple Place, Suite 330, Boston, MA 02111-1307 USA
 * You should have received a copy of the MPL along with this library
 * in the file COPYING-MPL-1.1
 *
 * The contents of this file are subject to the Mozilla Public License
 * Version 1.1 (the "License"); you may not use this file except in
 * compliance with the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * This software is distributed on an "AS IS" basis, WITHOUT WARRANTY
 * OF ANY KIND, either express or implied. See the LGPL or the MPL for
 * the specific language governing rights and limitations.
 *
 * The Original Code is the cairo graphics library.
 *
 * The Initial Developer of the Original Code is Red Hat, Inc.
 *
 * Contributor(s):
 *	Doodle <doodle@scenergy.dfmk.hu>
 */

#ifndef CAIRO_OS2_PRIVATE_H
#define CAIRO_OS2_PRIVATE_H

#define INCL_DOS
#define INCL_DOSSEMAPHORES
#define INCL_DOSERRORS
#define INCL_WIN
#define INCL_GPI
#ifdef __WATCOMC__
#include <os2.h>
#else
#include <os2emx.h>
#endif

#include <cairo-os2.h>
#include <cairoint.h>

typedef struct _cairo_os2_surface
{
  cairo_surface_t        base;

  /* Mutex semaphore to protect private fields from concurrent access */
  HMTX                   hmtxUsePrivateFields;
  /* Private fields: */
  HPS                    hpsClientWindow;
  HWND                   hwndClientWindow;
  BITMAPINFO2            bmi2BitmapInfo;
  unsigned char         *pchPixels;
  cairo_image_surface_t *pImageSurface;
  int                    iPixelArrayLendCounter;
  HEV                    hevPixelArrayCameBack;

  RECTL                  rclDirtyArea;
  int                    bDirtyAreaPresent;

  /* General flags: */
  int                    bBlitAsChanges;

} cairo_os2_surface_t;

#endif /* CAIRO_OS2_PRIVATE_H */
