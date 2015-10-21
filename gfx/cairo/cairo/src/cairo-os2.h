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

#ifndef _CAIRO_OS2_H_
#define _CAIRO_OS2_H_

#include <cairo.h>

CAIRO_BEGIN_DECLS

/* The OS/2 Specific Cairo API */

/* cairo_os2_initialize() :                                       */
/*                                                                */
/* Initializes the Cairo library. This function is automatically  */
/* called if Cairo was compiled to be a DLL (however it's not a   */
/* problem if it's called multiple times), but if you link to     */
/* Cairo statically, you have to call it once to set up Cairo's   */
/* internal structures and mutexes.                               */

void
cairo_os2_initialize (void);

/* cairo_os2_uninitialize() :                                     */
/*                                                                */
/* Uninitializes the Cairo library. This function is automatically*/
/* called if Cairo was compiled to be a DLL (however it's not a   */
/* problem if it's called multiple times), but if you link to     */
/* Cairo statically, you have to call it once to shut down Cairo, */
/* to let it free all the resources it has allocated.             */

void
cairo_os2_uninitialize (void);

#if CAIRO_HAS_OS2_SURFACE

/* cairo_os2_surface_create() :                                   */
/*                                                                */
/* Create a Cairo surface which is bounded to a given presentation*/
/* space (HPS). The surface will be created to have the given     */
/* size.                                                          */
/* By default: Every change to the surface will be made visible   */
/*             immediately by blitting it into the window. This   */
/*             can be changed with the                            */
/*             cairo_os2_surface_set_blit_as_changes() API.       */
/* Note that the surface will contain garbage when created, so the*/
/* pixels have to be initialized by hand first. You can use the   */
/* Cairo functions to fill it with black, or use the              */
/* cairo_surface_mark_dirty() API to fill the surface with pixels */
/* from the window/HPS.                                           */

cairo_surface_t *
cairo_os2_surface_create (HPS hpsClientWindow,
                          int iWidth, int iHeight);

/* cairo_os2_surface_set_HWND() :                                 */
/*                                                                */
/* Sets window handle for surface. If Cairo wants to blit into the*/
/* window because it's set that it should blit as the surface     */
/* changes (see cairo_os2_surface_set_blit_as_changes() API), then*/
/* there are two ways it can choose:                              */
/* If it knows the HWND of the surface, then it invalidates that  */
/* area, so the application will get a WM_PAINT message and it can*/
/* call cairo_os2_surface_repaint_window() to redraw that area.   */
/* Otherwise cairo itself will use the HPS it got at surface      */
/* creation time, and blit the pixels itself.                     */
/* It's also a solution, but experience shows that if this happens*/
/* from a non-PM thread, then it can screw up PM internals.       */
/*                                                                */
/* So, best solution is to set the HWND for the surface after the */
/* surface creation, so every blit will be done from application's*/
/* message processing loop, which is the safest way to do.        */

void
cairo_os2_surface_set_HWND (cairo_surface_t *pSurface,
                            HWND hwndClientWindow);

/* cairo_os2_surface_set_blit_as_changes() :                      */
/*                                                                */
/* This API can tell Cairo if it should show every change to this */
/* surface immediately in the window, or if it should be cached   */
/* and will only be visible if the user calls the                 */
/* cairo_os2_surface_repaint_window() API explicitly.             */
/* If the HWND was not told to Cairo, then it will use the HPS to */
/* blit the graphics. Otherwise it will invalidate the given      */
/* window region so the user will get WM_PAINT to redraw that area*/
/* of the window.                                                 */

void
cairo_os2_surface_set_blit_as_changes (cairo_surface_t *pSurface,
                                       int bBlitAsChanges);

/* cairo_os2_surface_get_blit_as_changes() :                      */
/*                                                                */
/* This API can return the current mode of the surface. It is     */
/* TRUE by default.                                               */

int
cairo_os2_surface_get_blit_as_changes (cairo_surface_t *pSurface);

/* cairo_os2_surface_window_resized() :                           */
/*                                                                */
/* When the client window is resized, call this API so the        */
/* underlaying surface will also be resized. This function will   */
/* reallocate everything, so you'll have to redraw everything in  */
/* the surface after this call.                                   */
/* The surface will contain garbage after the resizing, just like */
/* after cairo_os2_surface_create(), so all those notes also apply*/
/* here, please read that!                                        */
/*                                                                */
/* The timeout value is in milliseconds, and tells how much the   */
/* function should wait on other parts of the program to release  */
/* the buffers. It is necessary, because it can be that Cairo is  */
/* just drawing something into the surface while we want to       */
/* destroy and recreate it.                                       */
/* Returns CAIRO_STATUS_SUCCESS if the surface could be resized,  */
/* or returns other error code if                                 */
/*  - the surface is not a real OS/2 Surface                      */
/*  - there is not enough memory to resize the surface            */
/*  - waiting for all the buffers to be released timed out        */

int
cairo_os2_surface_window_resized (cairo_surface_t *pSurface,
                                  int iNewWidth, int iNewHeight,
                                  int iTimeOut);

/* cairo_os2_surface_repaint_window() :                           */
/*                                                                */
/* This function can be used to force a repaint of a given area   */
/* of the client window. Most of the time it is called from the   */
/* WM_PAINT processing of the window proc. However, it can be     */
/* called anytime if a given part of the window has to be updated.*/
/*                                                                */
/* The function expects a HPS of the window, and a RECTL to tell  */
/* which part of the window should be redrawn.                    */
/* The returned values of WinBeginPaint() is just perfect here,   */
/* but you can also get the HPS by using the WinGetPS() function, */
/* and you can assemble your own update rect by hand.             */
/* If the hpsBeginPaint parameter is NULL, the function will use  */
/* the HPS you passed in to cairo_os2_surface_create(). If the    */
/* prclBeginPaintRect parameter is NULL, the function will query  */
/* the current window size and repaint the whole window.          */
/*                                                                */
/* Cairo/2 assumes that if you told the HWND to the surface using */
/* the cairo_os2_surface_set_HWND() API, then this function will  */
/* be called by the application every time it gets a WM_PAINT for */
/* that HWND. If the HWND is told to the surface, Cairo uses this */
/* function to handle dirty areas too, so you were warned. :)     */

void
cairo_os2_surface_repaint_window (cairo_surface_t *pSurface,
                                  HPS hpsBeginPaint,
                                  PRECTL prclBeginPaintRect);

#endif /* CAIRO_HAS_OS2_SURFACE */

CAIRO_END_DECLS

#endif /* _CAIRO_OS2_H_ */
