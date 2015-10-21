/* Cairo - a vector graphics library with display and print output
 *
 * Copyright © 2005 Red Hat, Inc.
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

#include <stdio.h>
#include <float.h>
#include "cairoint.h"
#include "cairo-os2-private.h"
#include "fontconfig/fontconfig.h"

/* Forward declaration */
static const cairo_surface_backend_t cairo_os2_surface_backend;

/* Unpublished API:
 *   GpiEnableYInversion = PMGPI.723
 *   GpiQueryYInversion = PMGPI.726
 *   BOOL APIENTRY GpiEnableYInversion(HPS hps, LONG lHeight);
 *   LONG APIENTRY GpiQueryYInversion(HPS hps);
 */

BOOL APIENTRY GpiEnableYInversion(HPS hps, LONG lHeight);
LONG APIENTRY GpiQueryYInversion(HPS hps);

/* Initialization counter: */
static int cairo_os2_initialization_count = 0;

static void inline
DisableFPUException (void)
{
  unsigned short usCW;

  /* Some OS/2 PM API calls modify the FPU Control Word,
   * but forget to restore it.
   *
   * This can result in XCPT_FLOAT_INVALID_OPCODE exceptions,
   * so to be sure, we disable Invalid Opcode FPU exception
   * before using FPU stuffs.
   */
  usCW = _control87 (0, 0);
  usCW = usCW | EM_INVALID | 0x80;
  _control87 (usCW, MCW_EM | 0x80);
}

void cairo_os2_initialize (void)
{
  /* This may initialize some stuffs */

  cairo_os2_initialization_count++;
  if (cairo_os2_initialization_count > 1) return;

  DisableFPUException ();

  /* Initialize FontConfig */
  FcInit ();
}

void cairo_os2_uninitialize (void)
{
  /* This has to uninitialize some stuffs */

  if (cairo_os2_initialization_count <= 0) return;
  cairo_os2_initialization_count--;
  if (cairo_os2_initialization_count > 0) return;

  DisableFPUException ();

  /* Free allocated memories! */
  /* (Check cairo_debug_reset_static_date () for an example of this!) */
  _cairo_font_reset_static_data ();
#ifdef CAIRO_HAS_FT_FONT
  _cairo_ft_font_reset_static_data ();
#endif

  /* Uninitialize FontConfig */
  FcFini ();
}

static void _cairo_os2_surface_blit_pixels(cairo_os2_surface_t *pOS2Surface,
                                           HPS hpsBeginPaint,
                                           PRECTL prclBeginPaintRect)
{
  POINTL aptlPoints[4];
  LONG lOldYInversion, rc = GPI_OK;

  /* Enable Y Inversion for the HPS, so the
   * GpiDrawBits will work with upside-top image, not with upside-down image!
   */
  lOldYInversion = GpiQueryYInversion(hpsBeginPaint);
  GpiEnableYInversion(hpsBeginPaint, pOS2Surface->bmi2BitmapInfo.cy-1);

  /* Target coordinates (Noninclusive) */
  aptlPoints[0].x = prclBeginPaintRect->xLeft;
  aptlPoints[0].y = prclBeginPaintRect->yBottom;
  
  aptlPoints[1].x = prclBeginPaintRect->xRight-1;
  aptlPoints[1].y = prclBeginPaintRect->yTop-1;

  /* Source coordinates (Inclusive) */
  aptlPoints[2].x = prclBeginPaintRect->xLeft;
  aptlPoints[2].y = prclBeginPaintRect->yBottom;

  aptlPoints[3].x = prclBeginPaintRect->xRight;
  aptlPoints[3].y = (prclBeginPaintRect->yTop);

  /* Some extra checking for limits
   * (Dunno if really needed, but had some crashes sometimes without it,
   *  while developing the code...)
   */
  
  {
    int i;
    for (i=0; i<4; i++)
    {
      if (aptlPoints[i].x<0)
        aptlPoints[i].x = 0;
      if (aptlPoints[i].y<0)
        aptlPoints[i].y = 0;
      if (aptlPoints[i].x>pOS2Surface->bmi2BitmapInfo.cx)
        aptlPoints[i].x = pOS2Surface->bmi2BitmapInfo.cx;
      if (aptlPoints[i].y>pOS2Surface->bmi2BitmapInfo.cy)
        aptlPoints[i].y = pOS2Surface->bmi2BitmapInfo.cy;
    }
  }
  

  /* Debug code to draw rectangle limits */
  /*
  {
    int x, y;
    unsigned char *pchPixels;

    pchPixels = pOS2Surface->pchPixels;
    for (x=0; x<pOS2Surface->bmi2BitmapInfo.cx; x++)
      for (y=0; y<pOS2Surface->bmi2BitmapInfo.cy; y++)
      {
        if ((x==0) ||
            (y==0) ||
            (x==y) ||
            (x>=pOS2Surface->bmi2BitmapInfo.cx-1) ||
            (y>=pOS2Surface->bmi2BitmapInfo.cy-1)
            )
          pchPixels[y*pOS2Surface->bmi2BitmapInfo.cx*4+x*4] = 255;
      }
  }
  */
  rc = GpiDrawBits (hpsBeginPaint,
                    pOS2Surface->pchPixels,
                    &(pOS2Surface->bmi2BitmapInfo),
                    4,
                    aptlPoints,
                    ROP_SRCCOPY,
                    BBO_IGNORE);

  if (rc != GPI_OK) {
    /* if GpiDrawBits () failed then this is most likely because the
     * display driver could not handle a 32bit bitmap. So we need to
     * - create a buffer that only contains 3 bytes per pixel
     * - change the bitmap info header to contain 24bit
     * - pass the new buffer to GpiDrawBits () again
     * - clean up the new buffer
     */
    BITMAPINFOHEADER2 bmpheader;
    unsigned char *pchPixBuf, *pchPixSource;
    void *pBufStart;
    unsigned int iPixels;

    /* allocate temporary pixel buffer */
    pchPixBuf = (unsigned char *) malloc (3 * pOS2Surface->bmi2BitmapInfo.cx *
                                          pOS2Surface->bmi2BitmapInfo.cy);
    pchPixSource = pOS2Surface->pchPixels; /* start at beginning of pixel buffer */
    pBufStart = pchPixBuf; /* remember beginning of the new pixel buffer */

    /* copy the first three bytes for each pixel but skip over the fourth */
    for (iPixels = 0; iPixels < pOS2Surface->bmi2BitmapInfo.cx * pOS2Surface->bmi2BitmapInfo.cy; iPixels++)
    {
      memcpy (pchPixBuf, pchPixSource, 3); /* copy BGR */
      pchPixSource += 4; /* jump over BGR and alpha channel in source buffer */
      pchPixBuf += 3; /* just advance over BGR in target buffer */
    }

    /* jump back to start of the buffer for display and cleanup */
    pchPixBuf = pBufStart;

    /* set up the bitmap header, but this time with 24bit depth only */
    memset (&bmpheader, 0, sizeof (bmpheader));
    bmpheader.cbFix = sizeof (BITMAPINFOHEADER2);
    bmpheader.cx = pOS2Surface->bmi2BitmapInfo.cx;
    bmpheader.cy = pOS2Surface->bmi2BitmapInfo.cy;
    bmpheader.cPlanes = pOS2Surface->bmi2BitmapInfo.cPlanes;
    bmpheader.cBitCount = 24;
    rc = GpiDrawBits (hpsBeginPaint,
                      pchPixBuf,
                      (PBITMAPINFO2)&bmpheader,
                      4,
                      aptlPoints,
                      ROP_SRCCOPY,
                      BBO_IGNORE);

    free (pchPixBuf);
  }

  /* Restore Y inversion */
  GpiEnableYInversion(hpsBeginPaint, lOldYInversion);
}

static void _cairo_os2_surface_get_pixels_from_screen(cairo_os2_surface_t *pOS2Surface,
                                                      HPS hpsBeginPaint,
                                                      PRECTL prclBeginPaintRect)
{
  HPS hps;
  HDC hdc;
  HAB hab;
  SIZEL sizlTemp;
  HBITMAP hbmpTemp;
  BITMAPINFO2 bmi2Temp;
  POINTL aptlPoints[4];
  int y;
  char *pchTemp;

  /* To copy pixels from screen to our buffer, we do the following steps:
   *
   * - Blit pixels from screen to a HBITMAP:
   *   -- Create Memory Device Context
   *   -- Create a PS into it
   *   -- Create a HBITMAP
   *   -- Select HBITMAP into memory PS
   *   -- Blit dirty pixels from screen to HBITMAP
   * - Copy HBITMAP lines (pixels) into our buffer
   * - Free resources
   *
   * These steps will require an Anchor Block (HAB). However,
   * WinQUeryAnchorBlock() documentation says that HAB is not
   * used in current OS/2 implementations, OS/2 deduces all information
   * it needs from the TID. Anyway, we'd be in trouble if we'd have to
   * get a HAB where we only know a HPS...
   * So, we'll simply use a fake HAB.
   */

  hab = (HAB) 1; /* OS/2 doesn't really use HAB... */

  /* Create a memory device context */
  hdc=DevOpenDC(hab, OD_MEMORY,"*",0L, NULL, NULLHANDLE);
  if (!hdc)
  {
    /* printf("Could not create DC!\n"); */
    return;
  }

  /* Create a memory PS */
  sizlTemp.cx = prclBeginPaintRect->xRight - prclBeginPaintRect->xLeft;
  sizlTemp.cy = prclBeginPaintRect->yTop - prclBeginPaintRect->yBottom;
  /* printf("Creating PS: %dx%d\n", sizlTemp.cx, sizlTemp.cy);*/
  hps = GpiCreatePS (hab,
                     hdc,
                     &sizlTemp,
                     PU_PELS | GPIT_NORMAL | GPIA_ASSOC );
  if (!hps)
  {
    /* printf("Could not create PS!\n"); */
    DevCloseDC(hdc);
    return;
  }

  /* Create an uninitialized bitmap. */
  /* Prepare BITMAPINFO2 structure for our buffer */

  memset(&bmi2Temp, 0, sizeof(bmi2Temp));
  bmi2Temp.cbFix = sizeof(BITMAPINFOHEADER2);
  bmi2Temp.cx = sizlTemp.cx;
  bmi2Temp.cy = sizlTemp.cy;
  bmi2Temp.cPlanes = 1;
  bmi2Temp.cBitCount = 32;

  hbmpTemp = GpiCreateBitmap (hps,
                              (PBITMAPINFOHEADER2) &bmi2Temp,
                              0,
                              NULL,
                              NULL);

  if (!hbmpTemp)
  {
    /* printf("Could not create Bitmap!\n"); */
    GpiDestroyPS(hps);
    DevCloseDC(hdc);
    return;
  }

  /* Select the bitmap into the memory device context. */
  GpiSetBitmap(hps,
               hbmpTemp);


  /* Target coordinates (Noninclusive) */
  aptlPoints[0].x = 0;
  aptlPoints[0].y = 0;
  
  aptlPoints[1].x = sizlTemp.cx;
  aptlPoints[1].y = sizlTemp.cy;

  /* Source coordinates (Inclusive) */
  aptlPoints[2].x = prclBeginPaintRect->xLeft;
  aptlPoints[2].y = pOS2Surface->bmi2BitmapInfo.cy - prclBeginPaintRect->yBottom;

  aptlPoints[3].x = prclBeginPaintRect->xRight;
  aptlPoints[3].y = pOS2Surface->bmi2BitmapInfo.cy - prclBeginPaintRect->yTop;

  /*
  printf("BitBlt... Surface: (%d x %d)\n",
         pOS2Surface->bmi2BitmapInfo.cx,
         pOS2Surface->bmi2BitmapInfo.cy);

  printf("BitBlt... Target: (%d x %d) -> (%d x %d)\n",
         aptlPoints[0].x, aptlPoints[0].y,
         aptlPoints[1].x, aptlPoints[1].y);
  printf("BitBlt... Source: (%d x %d) -> (%d x %d)\n",
         aptlPoints[2].x, aptlPoints[2].y,
         aptlPoints[3].x, aptlPoints[3].y);
         */

  /* Blit pixels from screen to bitmap */
  GpiBitBlt(hps, hpsBeginPaint,
            4,
            aptlPoints,
            ROP_SRCCOPY,
            BBO_IGNORE);

  /* Now we have to extract the pixels from the bitmap. */
  /* printf("Getting pixels from bitmap...\n"); */

  pchTemp =
    pOS2Surface->pchPixels +
    (prclBeginPaintRect->yBottom)*pOS2Surface->bmi2BitmapInfo.cx*4 +
    prclBeginPaintRect->xLeft*4;
  for (y = 0; y<sizlTemp.cy; y++)
  {
    /* Get one line of pixels */
    GpiQueryBitmapBits(hps,
                       sizlTemp.cy - y - 1, /* lScanStart */
                       1,                   /* lScans */
                       pchTemp,
                       &bmi2Temp);

    /* Go for next line */
    pchTemp += pOS2Surface->bmi2BitmapInfo.cx*4;
  }

  /* Clean up resources */
  GpiSetBitmap(hps,
               (HBITMAP) NULL);
  GpiDeleteBitmap(hbmpTemp);
  GpiDestroyPS(hps);
  DevCloseDC(hdc);
}

static cairo_status_t _cairo_os2_surface_acquire_source_image (void                    *abstract_surface,
                                                               cairo_image_surface_t  **image_out,
                                                               void                   **image_extra)
{
  cairo_os2_surface_t *pOS2Surface;

  pOS2Surface = (cairo_os2_surface_t *) abstract_surface;
  if ((!pOS2Surface) || (pOS2Surface->base.backend != &cairo_os2_surface_backend))
  {
    /* Invalid parameter (wrong surface)! */
    return CAIRO_STATUS_SURFACE_TYPE_MISMATCH;
  }

  DosRequestMutexSem(pOS2Surface->hmtxUsePrivateFields, SEM_INDEFINITE_WAIT);

  /* Increase lend counter */
  pOS2Surface->iPixelArrayLendCounter++;

  *image_out = pOS2Surface->pImageSurface;
  *image_extra = NULL;

  DosReleaseMutexSem(pOS2Surface->hmtxUsePrivateFields);

  return CAIRO_STATUS_SUCCESS;
}

static void _cairo_os2_surface_release_source_image (void                   *abstract_surface,
                                                     cairo_image_surface_t  *image,
                                                     void                   *image_extra)
{
  cairo_os2_surface_t *pOS2Surface;

  pOS2Surface = (cairo_os2_surface_t *) abstract_surface;
  if ((!pOS2Surface) || (pOS2Surface->base.backend != &cairo_os2_surface_backend))
  {
    /* Invalid parameter (wrong surface)! */
    return;
  }

  /* Decrease Lend counter! */
  DosRequestMutexSem(pOS2Surface->hmtxUsePrivateFields, SEM_INDEFINITE_WAIT);

  if (pOS2Surface->iPixelArrayLendCounter>0)
    pOS2Surface->iPixelArrayLendCounter--;
  DosPostEventSem(pOS2Surface->hevPixelArrayCameBack);

  DosReleaseMutexSem(pOS2Surface->hmtxUsePrivateFields);
  return;
}

static cairo_status_t _cairo_os2_surface_acquire_dest_image (void                    *abstract_surface,
                                                             cairo_rectangle_t       *interest_rect,
                                                             cairo_image_surface_t  **image_out,
                                                             cairo_rectangle_t       *image_rect,
                                                             void                   **image_extra)
{
  cairo_os2_surface_t *pOS2Surface;

  pOS2Surface = (cairo_os2_surface_t *) abstract_surface;
  if ((!pOS2Surface) || (pOS2Surface->base.backend != &cairo_os2_surface_backend))
  {
    /* Invalid parameter (wrong surface)! */
    return CAIRO_STATUS_SURFACE_TYPE_MISMATCH;
  }

  DosRequestMutexSem(pOS2Surface->hmtxUsePrivateFields, SEM_INDEFINITE_WAIT);

  /* Increase lend counter */
  pOS2Surface->iPixelArrayLendCounter++;

  *image_out = pOS2Surface->pImageSurface;
  *image_extra = NULL;

  image_rect->x = 0;
  image_rect->y = 0;
  image_rect->width = pOS2Surface->bmi2BitmapInfo.cx;
  image_rect->height = pOS2Surface->bmi2BitmapInfo.cy;

  DosReleaseMutexSem(pOS2Surface->hmtxUsePrivateFields);

  return CAIRO_STATUS_SUCCESS;
}

static void _cairo_os2_surface_release_dest_image(void                   *abstract_surface,
                                                  cairo_rectangle_t      *interest_rect,
                                                  cairo_image_surface_t  *image,
                                                  cairo_rectangle_t      *image_rect,
                                                  void                   *image_extra)
{
  cairo_os2_surface_t *pOS2Surface;
  RECTL rclToBlit;

  pOS2Surface = (cairo_os2_surface_t *) abstract_surface;
  if ((!pOS2Surface) || (pOS2Surface->base.backend != &cairo_os2_surface_backend))
  {
    /* Invalid parameter (wrong surface)! */
    return;
  }

  /* So, we got back the image, and if all goes well, then
   * something has been changed inside the interest_rect.
   * So, we blit it to the screen!
   */

  if (pOS2Surface->bBlitAsChanges)
  {
    /* Get mutex, we'll work with the pixel array! */
    if (DosRequestMutexSem(pOS2Surface->hmtxUsePrivateFields, SEM_INDEFINITE_WAIT)!=NO_ERROR)
    {
      /* Could not get mutex! */
      return;
    }

    if (pOS2Surface->hwndClientWindow)
    {
      /* We know the HWND, so let's invalidate the window region,
       * so the application will redraw itself, using the
       * cairo_os2_surface_repaint_window() API from its own PM thread.
       *
       * This is the safe method, which should be preferred every time.
       */

      rclToBlit.xLeft = interest_rect->x;
      rclToBlit.xRight = interest_rect->x+interest_rect->width; /* Noninclusive */
      rclToBlit.yTop = pOS2Surface->bmi2BitmapInfo.cy - (interest_rect->y);
      rclToBlit.yBottom = pOS2Surface->bmi2BitmapInfo.cy - (interest_rect->y+interest_rect->height); /* Noninclusive */

      WinInvalidateRect(pOS2Surface->hwndClientWindow,
                        &rclToBlit,
                        FALSE);
    } else
    {
      /* We don't know the HWND, so try to blit the pixels from here!
       * Please note that it can be problematic if this is not the PM thread!
       *
       * It can cause internal PM stuffs to be scewed up, for some reason.
       * Please always tell the HWND to the surface using the
       * cairo_os2_surface_set_HWND() API, and call cairo_os2_surface_repaint_window()
       * from your WM_PAINT, if it's possible!
       */

      rclToBlit.xLeft = interest_rect->x;
      rclToBlit.xRight = interest_rect->x+interest_rect->width; /* Noninclusive */
      rclToBlit.yBottom = interest_rect->y;
      rclToBlit.yTop = interest_rect->y+interest_rect->height; /* Noninclusive */
      /* Now blit there the stuffs! */
      _cairo_os2_surface_blit_pixels(pOS2Surface,
                                     pOS2Surface->hpsClientWindow,
                                     &rclToBlit);
    }

    /* Done! */
    DosReleaseMutexSem(pOS2Surface->hmtxUsePrivateFields);
  }
  /* Also decrease Lend counter! */
  DosRequestMutexSem(pOS2Surface->hmtxUsePrivateFields, SEM_INDEFINITE_WAIT);

  if (pOS2Surface->iPixelArrayLendCounter>0)
    pOS2Surface->iPixelArrayLendCounter--;
  DosPostEventSem(pOS2Surface->hevPixelArrayCameBack);

  DosReleaseMutexSem(pOS2Surface->hmtxUsePrivateFields);
}

static cairo_int_status_t _cairo_os2_surface_get_extents(void *abstract_surface,
                                                         cairo_rectangle_t *rectangle)
{
  cairo_os2_surface_t *pOS2Surface;

  pOS2Surface = (cairo_os2_surface_t *) abstract_surface;
  if ((!pOS2Surface) || (pOS2Surface->base.backend != &cairo_os2_surface_backend))
  {
    /* Invalid parameter (wrong surface)! */
    return CAIRO_STATUS_SURFACE_TYPE_MISMATCH;
  }

  rectangle->x = 0;
  rectangle->y = 0;
  rectangle->width  = pOS2Surface->bmi2BitmapInfo.cx;
  rectangle->height = pOS2Surface->bmi2BitmapInfo.cy;

  return CAIRO_STATUS_SUCCESS;
}

cairo_surface_t *cairo_os2_surface_create(HPS hpsClientWindow,
                                          int iWidth, int iHeight)
{
  cairo_os2_surface_t *pOS2Surface;
  int rc;

  /* Check the size of the window */
  if (
      (iWidth<=0) ||
      (iHeight<=0)
     )
  {
    /* Invalid window size! */
    _cairo_error(CAIRO_STATUS_NO_MEMORY);
    return (cairo_surface_t *) &_cairo_surface_nil;
  }


  pOS2Surface = (cairo_os2_surface_t *) malloc(sizeof(cairo_os2_surface_t));
  if (!pOS2Surface)
  {
    /* Not enough memory! */
    _cairo_error(CAIRO_STATUS_NO_MEMORY);
    return (cairo_surface_t *) &_cairo_surface_nil;
  }

  /* Initialize the OS/2 specific parts of the surface! */

  /* Create mutex semaphore */
  rc = DosCreateMutexSem(NULL,
                         &(pOS2Surface->hmtxUsePrivateFields),
                         0,
                         FALSE);
  if (rc!=NO_ERROR)
  {
    /* Could not create mutex semaphore! */
    _cairo_error(CAIRO_STATUS_NO_MEMORY);
    return (cairo_surface_t *) &_cairo_surface_nil;
  }

  /* Save PS handle */
  pOS2Surface->hpsClientWindow = hpsClientWindow;

  /* Defaults */
  pOS2Surface->hwndClientWindow = NULLHANDLE;
  pOS2Surface->bBlitAsChanges = TRUE;
  pOS2Surface->iPixelArrayLendCounter = 0;
  rc = DosCreateEventSem(NULL,
                         &(pOS2Surface->hevPixelArrayCameBack),
                         0,
                         FALSE);

  if (rc!=NO_ERROR)
  {
    /* Could not create event semaphore! */
    DosCloseMutexSem(pOS2Surface->hmtxUsePrivateFields);
    free(pOS2Surface);
    _cairo_error(CAIRO_STATUS_NO_MEMORY);
    return (cairo_surface_t *) &_cairo_surface_nil;
  }

  /* Prepare BITMAPINFO2 structure for our buffer */
  memset(&(pOS2Surface->bmi2BitmapInfo), 0, sizeof(pOS2Surface->bmi2BitmapInfo));
  pOS2Surface->bmi2BitmapInfo.cbFix = sizeof(BITMAPINFOHEADER2);
  pOS2Surface->bmi2BitmapInfo.cx = iWidth;
  pOS2Surface->bmi2BitmapInfo.cy = iHeight;
  pOS2Surface->bmi2BitmapInfo.cPlanes = 1;
  pOS2Surface->bmi2BitmapInfo.cBitCount = 32;

  /*
  pOS2Surface->bmi2BitmapInfo.ulCompression = BCA_UNCOMP;
  pOS2Surface->bmi2BitmapInfo.cbImage = 0;
  pOS2Surface->bmi2BitmapInfo.cxResolution = 70;
  pOS2Surface->bmi2BitmapInfo.cyResolution = 70;
  pOS2Surface->bmi2BitmapInfo.cclrUsed = 0;
  pOS2Surface->bmi2BitmapInfo.cclrImportant = 0;
  pOS2Surface->bmi2BitmapInfo.usUnits = BRU_METRIC;
  pOS2Surface->bmi2BitmapInfo.usReserved = 0;
  pOS2Surface->bmi2BitmapInfo.usRecording = BRA_BOTTOMUP;
  pOS2Surface->bmi2BitmapInfo.usRendering = BRH_NOTHALFTONED;
  pOS2Surface->bmi2BitmapInfo.cSize1 = 0;
  pOS2Surface->bmi2BitmapInfo.cSize2 = 0;
  pOS2Surface->bmi2BitmapInfo.ulColorEncoding = BCE_RGB;
  pOS2Surface->bmi2BitmapInfo.ulIdentifier = 0;
  */

  /* Allocate memory for pixels */
  pOS2Surface->pchPixels = (unsigned char *) malloc(iWidth * iHeight * 4);
  if (!(pOS2Surface->pchPixels))
  {
    /* Not enough memory for the pixels! */
    DosCloseEventSem(pOS2Surface->hevPixelArrayCameBack);
    DosCloseMutexSem(pOS2Surface->hmtxUsePrivateFields);
    free(pOS2Surface);
    _cairo_error(CAIRO_STATUS_NO_MEMORY);
    return (cairo_surface_t *) &_cairo_surface_nil;
  }

  /* This is possibly not needed, malloc'd space is
   * usually zero'd out!
   */
  /*
   memset(pOS2Surface->pchPixels, 0x00, swpTemp.cx * swpTemp.cy * 4);
   */

  /* Create image surface from pixel array */
  pOS2Surface->pImageSurface = (cairo_image_surface_t *)
    cairo_image_surface_create_for_data(pOS2Surface->pchPixels,
                                        CAIRO_FORMAT_RGB24,
                                        iWidth,      /* Width */
                                        iHeight,     /* Height */
                                        iWidth * 4); /* Rowstride */

  if (pOS2Surface->pImageSurface->base.status)
  {
    /* Could not create image surface! */
    free(pOS2Surface->pchPixels);
    DosCloseEventSem(pOS2Surface->hevPixelArrayCameBack);
    DosCloseMutexSem(pOS2Surface->hmtxUsePrivateFields);
    free(pOS2Surface);
    _cairo_error (CAIRO_STATUS_NO_MEMORY);
    return (cairo_surface_t *) &_cairo_surface_nil;
  }

  /* Initialize base surface */
  _cairo_surface_init(&pOS2Surface->base, &cairo_os2_surface_backend);

  /* All done! */
  return (cairo_surface_t *)pOS2Surface;
}


int  cairo_os2_surface_window_resized(cairo_surface_t *pSurface,
                                      int iNewWidth, int iNewHeight,
                                      int iTimeOut)
{
  cairo_os2_surface_t *pOS2Surface;
  unsigned char *pchNewPixels;
  int rc;
  cairo_image_surface_t *pNewImageSurface;

  pOS2Surface = (cairo_os2_surface_t *) pSurface;
  if ((!pOS2Surface) || (pOS2Surface->base.backend != &cairo_os2_surface_backend))
  {
    /* Invalid parameter (wrong surface)! */
    return CAIRO_STATUS_SURFACE_TYPE_MISMATCH;
  }

  if ((iNewWidth<=0) || (iNewHeight<=0))
  {
    /* Invalid size! */
    return CAIRO_STATUS_NO_MEMORY;
  }

  /* Allocate memory for new stuffs */
  pchNewPixels = (unsigned char *) malloc(iNewWidth * iNewHeight * 4);
  if (!pchNewPixels)
  {
    /* Not enough memory for the pixels!
     * Everything remains the same!
     */
    return CAIRO_STATUS_NO_MEMORY;
  }

  /* This is possibly not needed, malloc'd space is usually
   * already zero'd out!
   */
  /*
   memset(pchNewPixels, 0x00, iNewWidth * iNewHeight * 4);
   */

  /* Create image surface from new pixel array */
  pNewImageSurface = (cairo_image_surface_t *)
    cairo_image_surface_create_for_data(pchNewPixels,
                                        CAIRO_FORMAT_RGB24,
                                        iNewWidth,      /* Width */
                                        iNewHeight,     /* Height */
                                        iNewWidth * 4); /* Rowstride */

  if (pNewImageSurface->base.status)
  {
    /* Could not create image surface!
     * Everything remains the same!
     */
    free(pchNewPixels);
    return CAIRO_STATUS_NO_MEMORY;
  }


  /* Okay, new memory allocated, so it's time to swap old buffers
   * to new ones!
   */

  if (DosRequestMutexSem(pOS2Surface->hmtxUsePrivateFields, SEM_INDEFINITE_WAIT)!=NO_ERROR)
  {
    /* Could not get mutex!
     * Everything remains the same!
     */
    cairo_surface_destroy((cairo_surface_t *) pNewImageSurface);
    free(pchNewPixels);
    return CAIRO_STATUS_NO_MEMORY;
  }

  /* We have to make sure that we won't destroy a surface which
   * is lent to some other code (Cairo is drawing into it)!
   */
  while (pOS2Surface->iPixelArrayLendCounter>0)
  {
    ULONG ulPostCount;
    DosResetEventSem(pOS2Surface->hevPixelArrayCameBack, &ulPostCount);
    DosReleaseMutexSem(pOS2Surface->hmtxUsePrivateFields);
    /* Wait for somebody to return the pixels! */
    rc = DosWaitEventSem(pOS2Surface->hevPixelArrayCameBack, iTimeOut);
    if (rc!=NO_ERROR)
    {
      /* Either timeout or something wrong... Exit. */
      cairo_surface_destroy((cairo_surface_t *) pNewImageSurface);
      free(pchNewPixels);
      return CAIRO_STATUS_NO_MEMORY;
    }
    /* Okay, grab mutex and check counter again! */
    if (DosRequestMutexSem(pOS2Surface->hmtxUsePrivateFields, SEM_INDEFINITE_WAIT)!=NO_ERROR)
    {
      /* Could not get mutex!
       * Everything remains the same!
       */
      cairo_surface_destroy((cairo_surface_t *) pNewImageSurface);
      free(pchNewPixels);
      return CAIRO_STATUS_NO_MEMORY;
    }
  }

  /* Destroy old image surface */
  cairo_surface_destroy((cairo_surface_t *) (pOS2Surface->pImageSurface));
  /* Destroy old pixel buffer */
  free(pOS2Surface->pchPixels);
  /* Set new image surface */
  pOS2Surface->pImageSurface = pNewImageSurface;
  /* Set new pixel buffer */
  pOS2Surface->pchPixels = pchNewPixels;
  /* Change bitmap2 structure */
  pOS2Surface->bmi2BitmapInfo.cx = iNewWidth;
  pOS2Surface->bmi2BitmapInfo.cy = iNewHeight;

  /* Okay, things have been changed successfully! */
  DosReleaseMutexSem(pOS2Surface->hmtxUsePrivateFields);
  return CAIRO_STATUS_SUCCESS;
}

void cairo_os2_surface_repaint_window(cairo_surface_t *pSurface,
                                      HPS hpsBeginPaint,
                                      PRECTL prclBeginPaintRect)
{
  cairo_os2_surface_t *pOS2Surface;
  RECTL rclTemp;

  pOS2Surface = (cairo_os2_surface_t *) pSurface;
  if ((!pOS2Surface) || (pOS2Surface->base.backend != &cairo_os2_surface_backend))
  {
    /* Invalid parameter (wrong surface)! */
    return;
  }

  /* Manage defaults (NULLs) */
  if (hpsBeginPaint == NULL)
      hpsBeginPaint = pOS2Surface->hpsClientWindow;

  if (prclBeginPaintRect == NULL)
  {
    /* Update the whole window! */
    rclTemp.xLeft = 0;
    rclTemp.xRight = pOS2Surface->bmi2BitmapInfo.cx;
    rclTemp.yTop = pOS2Surface->bmi2BitmapInfo.cy;
    rclTemp.yBottom = 0;
  } else
  {
    /* Use the rectangle we got passed as parameter! */
    rclTemp.xLeft = prclBeginPaintRect->xLeft;
    rclTemp.xRight = prclBeginPaintRect->xRight;
    rclTemp.yTop = pOS2Surface->bmi2BitmapInfo.cy - prclBeginPaintRect->yBottom;
    rclTemp.yBottom = pOS2Surface->bmi2BitmapInfo.cy - prclBeginPaintRect->yTop ;
  }

  /* Get mutex, we'll work with the pixel array! */
  if (DosRequestMutexSem(pOS2Surface->hmtxUsePrivateFields, SEM_INDEFINITE_WAIT)!=NO_ERROR)
  {
    /* Could not get mutex! */
    return;
  }

  if ((pOS2Surface->bDirtyAreaPresent) &&
      (pOS2Surface->rclDirtyArea.xLeft == rclTemp.xLeft) &&
      (pOS2Surface->rclDirtyArea.xRight == rclTemp.xRight) &&
      (pOS2Surface->rclDirtyArea.yTop == rclTemp.yTop) &&
      (pOS2Surface->rclDirtyArea.yBottom == rclTemp.yBottom))
  {
    /* Aha, this call was because of a dirty area, so in this case we
     * have to blit the pixels from the screen to the surface!
     */
    pOS2Surface->bDirtyAreaPresent = 0;
    _cairo_os2_surface_get_pixels_from_screen(pOS2Surface,
                                              hpsBeginPaint,
                                              &rclTemp);
  } else
  {
    /* Okay, we have the surface, have the HPS
     * (might be from WinBeginPaint() or from WinGetPS() )
     * Now blit there the stuffs!
     */
    _cairo_os2_surface_blit_pixels(pOS2Surface,
                                   hpsBeginPaint,
                                   &rclTemp);
  }
  /* Done! */
  DosReleaseMutexSem(pOS2Surface->hmtxUsePrivateFields);
}

static cairo_status_t _cairo_os2_surface_finish(void *abstract_surface)
{
  cairo_os2_surface_t *pOS2Surface;

  pOS2Surface = (cairo_os2_surface_t *) abstract_surface;
  if ((!pOS2Surface) || (pOS2Surface->base.backend != &cairo_os2_surface_backend))
  {
    /* Invalid parameter (wrong surface)! */
    return CAIRO_STATUS_SURFACE_TYPE_MISMATCH;
  }

  DosRequestMutexSem(pOS2Surface->hmtxUsePrivateFields, SEM_INDEFINITE_WAIT);

  /* Destroy old image surface */
  cairo_surface_destroy((cairo_surface_t *) (pOS2Surface->pImageSurface));
  /* Destroy old pixel buffer */
  free(pOS2Surface->pchPixels);
  DosCloseMutexSem(pOS2Surface->hmtxUsePrivateFields);
  DosCloseEventSem(pOS2Surface->hevPixelArrayCameBack);

  /* The memory itself will be free'd by the cairo_surface_destroy()
   * who called us.
   */

  return CAIRO_STATUS_SUCCESS;
}

void cairo_os2_surface_set_HWND(cairo_surface_t *pSurface,
                                HWND hwndClientWindow)
{
  cairo_os2_surface_t *pOS2Surface;

  pOS2Surface = (cairo_os2_surface_t *) pSurface;
  if ((!pOS2Surface) || (pOS2Surface->base.backend != &cairo_os2_surface_backend))
  {
    /* Invalid parameter (wrong surface)! */
    return;
  }

  if (DosRequestMutexSem(pOS2Surface->hmtxUsePrivateFields, SEM_INDEFINITE_WAIT)!=NO_ERROR)
  {
    /* Could not get mutex! */
    return;
  }

  pOS2Surface->hwndClientWindow = hwndClientWindow;

  DosReleaseMutexSem(pOS2Surface->hmtxUsePrivateFields);
}

void cairo_os2_surface_set_blit_as_changes(cairo_surface_t *pSurface,
                                           int bBlitAsChanges)
{
  cairo_os2_surface_t *pOS2Surface;

  pOS2Surface = (cairo_os2_surface_t *) pSurface;
  if ((!pOS2Surface) || (pOS2Surface->base.backend != &cairo_os2_surface_backend))
  {
    /* Invalid parameter (wrong surface)! */
    return;
  }

  pOS2Surface->bBlitAsChanges = bBlitAsChanges;
}

int cairo_os2_surface_get_blit_as_changes(cairo_surface_t *pSurface)
{
  cairo_os2_surface_t *pOS2Surface;

  pOS2Surface = (cairo_os2_surface_t *) pSurface;
  if ((!pOS2Surface) || (pOS2Surface->base.backend != &cairo_os2_surface_backend))
  {
    /* Invalid parameter (wrong surface)! */
    return 0;
  }

  return pOS2Surface->bBlitAsChanges;
}

static cairo_status_t _cairo_os2_surface_mark_dirty_rectangle(void *surface,
                                                              int   x,
                                                              int   y,
                                                              int   width,
                                                              int   height)
{
  cairo_os2_surface_t *pOS2Surface;
  RECTL rclToBlit;

  pOS2Surface = (cairo_os2_surface_t *) surface;
  if ((!pOS2Surface) || (pOS2Surface->base.backend != &cairo_os2_surface_backend))
  {
    /* Invalid parameter (wrong surface)! */
    return CAIRO_STATUS_SURFACE_TYPE_MISMATCH;
  }

  /* Get mutex, we'll work with the pixel array! */
  if (DosRequestMutexSem(pOS2Surface->hmtxUsePrivateFields, SEM_INDEFINITE_WAIT)!=NO_ERROR)
  {
    /* Could not get mutex! */
    return CAIRO_STATUS_NO_MEMORY;
  }

  /* Check for defaults */
  if (width<0)
    width = pOS2Surface->bmi2BitmapInfo.cx;
  if (height<0)
    height = pOS2Surface->bmi2BitmapInfo.cy;

  if (pOS2Surface->hwndClientWindow)
  {
    /* We know the HWND, so let's invalidate the window region,
     * so the application will redraw itself, using the
     * cairo_os2_surface_repaint_window() API from its own PM thread.
     * From that function we'll note that it's not a redraw but a
     * dirty-rectangle deal stuff, so we'll handle the things from
     * there.
     *
     * This is the safe method, which should be preferred every time.
     */

    rclToBlit.xLeft = x;
    rclToBlit.xRight = x + width; /* Noninclusive */
    rclToBlit.yTop = pOS2Surface->bmi2BitmapInfo.cy - (y);
    rclToBlit.yBottom = pOS2Surface->bmi2BitmapInfo.cy - (y + height); /* Noninclusive */

#if 0
    if (pOS2Surface->bDirtyAreaPresent)
    {
      /* Yikes, there is already a dirty area which should be
       * cleaned up, but we'll overwrite it. Sorry.
       * TODO: Something clever should be done here.
       */
    }
#endif

    /* Set up dirty area reminder stuff */
    memcpy(&(pOS2Surface->rclDirtyArea), &rclToBlit, sizeof(RECTL));
    pOS2Surface->bDirtyAreaPresent = 1;

    /* Invalidate window area */
    WinInvalidateRect(pOS2Surface->hwndClientWindow,
                      &rclToBlit,
                      FALSE);
  } else
  {
    /* We don't know the HWND, so try to blit the pixels from here!
     * Please note that it can be problematic if this is not the PM thread!
     *
     * It can cause internal PM stuffs to be scewed up, for some reason.
     * Please always tell the HWND to the surface using the
     * cairo_os2_surface_set_HWND() API, and call cairo_os2_surface_repaint_window()
     * from your WM_PAINT, if it's possible!
     */

    rclToBlit.xLeft = x;
    rclToBlit.xRight = x + width; /* Noninclusive */
    rclToBlit.yBottom = y;
    rclToBlit.yTop = y + height; /* Noninclusive */
    /* Now get the pixels from the screen! */
    _cairo_os2_surface_get_pixels_from_screen(pOS2Surface,
                                              pOS2Surface->hpsClientWindow,
                                              &rclToBlit);
  }

  /* Done! */
  DosReleaseMutexSem(pOS2Surface->hmtxUsePrivateFields);

  return CAIRO_STATUS_SUCCESS;
}

static const cairo_surface_backend_t cairo_os2_surface_backend = {
    NULL, /* create_similar */
    _cairo_os2_surface_finish,
    _cairo_os2_surface_acquire_source_image,
    _cairo_os2_surface_release_source_image,
    _cairo_os2_surface_acquire_dest_image,
    _cairo_os2_surface_release_dest_image,
    NULL, /* clone_similar */
    NULL, /* composite */
    NULL, /* fill_rectangles */
    NULL, /* composite_trapezoids */
    NULL, /* copy_page */
    NULL, /* show_page */
    NULL, /* set_clip_region */
    NULL, /* intersect_clip_path */
    _cairo_os2_surface_get_extents,
    NULL, /* show_glyphs */
    NULL, /* fill_path */
    NULL, /* get_font_options */
    NULL, /* flush */
    _cairo_os2_surface_mark_dirty_rectangle
};
