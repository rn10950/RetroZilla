/* -*- Mode: c++; tab-width: 2; indent-tabs-mode: nil; -*- */
/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is mozilla.org code.
 *
 * The Initial Developer of the Original Code is
 * Netscape Communications Corporation.
 * Portions created by the Initial Developer are Copyright (C) 1998
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *  Mark Mentovai <mark@moxienet.com>
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */

/*
 * Runs the main native Carbon run loop.
 */

#include "nsAppShell.h"
#include "nsToolkit.h"
#include "nsMacMessagePump.h"

#include <Carbon/Carbon.h>

NS_IMPL_THREADSAFE_ISUPPORTS1(nsAppShell, nsIAppShell)

nsMacMessagePump* nsAppShell::sMacPump;
nsAppShell* nsAppShell::sMacPumpOwner;

nsAppShell::nsAppShell()
{
}

nsAppShell::~nsAppShell()
{
  if (sMacPumpOwner == this) {
    delete sMacPump;
    sMacPump = NULL;
  }
}

NS_IMETHODIMP
nsAppShell::Create(int* argc, char** argv)
{
  nsresult rv = NS_GetCurrentToolkit(getter_AddRefs(mToolkit));
  if (NS_FAILED(rv))
   return rv;

  nsIToolkit* toolkit = mToolkit.get();

  if (!sMacPump) {
    sMacPump = new nsMacMessagePump(NS_STATIC_CAST(nsToolkit*, toolkit));
    if (sMacPump)
      sMacPumpOwner = this;
    else
      return NS_ERROR_OUT_OF_MEMORY;
  }

  return NS_OK;
}

NS_IMETHODIMP
nsAppShell::Run()
{
  if (!sMacPump)
    return NS_ERROR_NOT_INITIALIZED;

  PRBool wasProcessing = sMacPump->ProcessEvents(PR_TRUE);
  ::RunApplicationEventLoop();
  sMacPump->ProcessEvents(wasProcessing);

  return NS_OK;
}

NS_IMETHODIMP
nsAppShell::Exit()
{
  ::QuitApplicationEventLoop();
  return NS_OK;
}

NS_IMETHODIMP
nsAppShell::Spinup()
{
  // Nothing to do
  return NS_OK;
}

NS_IMETHODIMP
nsAppShell::Spindown()
{
  // Nothing to do
  return NS_OK;
}

NS_IMETHODIMP
nsAppShell::ListenToEventQueue(nsIEventQueue* aQueue, PRBool aListen)
{
  // Nothing to do
  return NS_OK;
}

NS_IMETHODIMP
nsAppShell::GetNativeEvent(PRBool& aRealEvent, void*& aEvent)
{
  aRealEvent = PR_FALSE;
  aEvent = nsnull;

  EventRef carbonEvent;
  OSStatus err =
   ::ReceiveNextEvent(0, nsnull, 0.1, PR_TRUE, &carbonEvent);
  if (err == noErr && carbonEvent) {
    aRealEvent = PR_TRUE;
    aEvent = carbonEvent;
  }

  return NS_OK;
}

NS_IMETHODIMP
nsAppShell::DispatchNativeEvent(PRBool aRealEvent, void* aEvent)
{
  if (aRealEvent) {
    EventRef carbonEvent = NS_STATIC_CAST(EventRef, aEvent);

    if (!sMacPump)
      return NS_ERROR_NOT_INITIALIZED;

    PRBool wasProcessing = sMacPump->ProcessEvents(PR_TRUE);
    ::SendEventToEventTarget(carbonEvent, ::GetEventDispatcherTarget());
    sMacPump->ProcessEvents(wasProcessing);

    // This can be bad, but the only way DispatchNativeEvent is ever
    // used, it's tightly coupled to GetNativeEvent and is only called
    // once.  This is really the only good place to release it and
    // avoid leaking.
    ::ReleaseEvent(carbonEvent);
  }

  return NS_OK;
}
