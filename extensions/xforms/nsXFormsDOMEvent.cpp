/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
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
 * The Original Code is Mozilla XForms support.
 *
 * The Initial Developer of the Original Code is
 * IBM Corporation
 * Portions created by the Initial Developer are Copyright (C) 2007
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *  Merle Sterling <msterlin@us.ibm.com>
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

#include "nsXFormsDOMEvent.h"

/**
 * Implementation for XForms events.
 *
 */

// Setup the interface map so that an nsIXFormsDOMEvent can be QI'ed to
// nsIDOMEvent, nsIDOMNSEvent, nsIPrivateDOMEvent, and nsISupports.
//
// nsISupports is ambiguous because all of the interfaces inherit from
// nsISupports. NS_INTERFACE_MAP_ENTRY_AMBIGOUS will cast to the
// nsISupports of nsXFormsDOMEvent.
//
// nsXFormsDOMEvent contains an nsIDOMEvent (mInner) and nsIDOMEvent
// implements nsIDOMNSEvent and nsIPrivateDOMEvent. The event dispatcher
// will QI to those interfaces. We use NS_INTERFACE_MAP_END_AGGREGATED to
// forward QIs for those interfaces to mInner.

NS_INTERFACE_MAP_BEGIN(nsXFormsDOMEvent)
  NS_INTERFACE_MAP_ENTRY(nsIXFormsDOMEvent)
  NS_INTERFACE_MAP_ENTRY(nsIDOMEvent)
  NS_INTERFACE_MAP_ENTRY(nsIDOMNSEvent)
  NS_INTERFACE_MAP_ENTRY(nsIPrivateDOMEvent)
  NS_INTERFACE_MAP_ENTRY_AMBIGUOUS(nsISupports, nsIXFormsDOMEvent)
NS_INTERFACE_MAP_END_AGGREGATED(mInner)

NS_IMPL_ADDREF(nsXFormsDOMEvent)
NS_IMPL_RELEASE(nsXFormsDOMEvent)

nsXFormsDOMEvent::nsXFormsDOMEvent(nsIDOMEvent *aInner,
                                   nsCOMArray<nsIXFormsContextInfo> *aContextInfo)
{
  mInner = aInner;
  mContextInfo.Init();
  SetContextInfo(aContextInfo);
}

nsXFormsDOMEvent::~nsXFormsDOMEvent()
{}

nsresult
nsXFormsDOMEvent::SetContextInfo(nsCOMArray<nsIXFormsContextInfo> *aContextInfo)
{
 if (aContextInfo) {
   for (int i = 0; i < aContextInfo->Count(); i++) {
     nsCOMPtr<nsIXFormsContextInfo> ctxtInfo = aContextInfo->ObjectAt(i);
     nsAutoString name;
     ctxtInfo->GetName(name);
     mContextInfo.Put(name, ctxtInfo);
   }
 }
 return NS_OK;
}

NS_IMETHODIMP
nsXFormsDOMEvent::GetContextInfo(const nsAString &aName,
                                 nsIXFormsContextInfo **aResult)
{
  NS_ENSURE_ARG_POINTER(aResult);
  mContextInfo.Get(aName, aResult);
  return NS_OK;
}

// nsIDOMNSEvent interface
NS_IMETHODIMP
nsXFormsDOMEvent::GetOriginalTarget(nsIDOMEventTarget **aOriginalTarget)
{
  nsCOMPtr<nsIDOMNSEvent> nsevent = do_QueryInterface(mInner);
  return nsevent->GetOriginalTarget(aOriginalTarget);
}

NS_IMETHODIMP
nsXFormsDOMEvent::GetExplicitOriginalTarget(nsIDOMEventTarget **aExplicitOriginalTarget)
{
  nsCOMPtr<nsIDOMNSEvent> nsevent = do_QueryInterface(mInner);
  return nsevent->GetExplicitOriginalTarget(aExplicitOriginalTarget);
}

NS_IMETHODIMP
nsXFormsDOMEvent::GetTmpRealOriginalTarget(nsIDOMEventTarget **aTmpRealOriginalTarget)
{
  nsCOMPtr<nsIDOMNSEvent> nsevent = do_QueryInterface(mInner);
  return nsevent->GetTmpRealOriginalTarget(aTmpRealOriginalTarget);
}

NS_IMETHODIMP
nsXFormsDOMEvent::PreventBubble(void)
{
  nsCOMPtr<nsIDOMNSEvent> nsevent = do_QueryInterface(mInner);
  return nsevent->PreventBubble();
}

NS_IMETHODIMP
nsXFormsDOMEvent::PreventCapture(void)
{
  nsCOMPtr<nsIDOMNSEvent> nsevent = do_QueryInterface(mInner);
  return nsevent->PreventCapture();
}

NS_IMETHODIMP
nsXFormsDOMEvent::GetIsTrusted(PRBool *aIsTrusted)
{
  nsCOMPtr<nsIDOMNSEvent> nsevent = do_QueryInterface(mInner);
  return nsevent->GetIsTrusted(aIsTrusted);
}

// nsIPrivateDOMEvent interface
NS_METHOD
nsXFormsDOMEvent::DuplicatePrivateData()
{
  nsCOMPtr<nsIPrivateDOMEvent> privEvent = do_QueryInterface(mInner);
  return privEvent->DuplicatePrivateData();
}

NS_METHOD
nsXFormsDOMEvent::SetTarget(nsIDOMEventTarget* aTarget)
{
  nsCOMPtr<nsIPrivateDOMEvent> privEvent = do_QueryInterface(mInner);
  return privEvent->SetTarget(aTarget);
}

NS_METHOD
nsXFormsDOMEvent::SetCurrentTarget(nsIDOMEventTarget* aTarget)
{
  nsCOMPtr<nsIPrivateDOMEvent> privEvent = do_QueryInterface(mInner);
  return privEvent->SetCurrentTarget(aTarget);
}

NS_METHOD
nsXFormsDOMEvent::SetOriginalTarget(nsIDOMEventTarget* aTarget)
{
  nsCOMPtr<nsIPrivateDOMEvent> privEvent = do_QueryInterface(mInner);
  return privEvent->SetOriginalTarget(aTarget);
}

NS_METHOD
nsXFormsDOMEvent::IsDispatchStopped(PRBool* aIsDispatchPrevented)
{
  nsCOMPtr<nsIPrivateDOMEvent> privEvent = do_QueryInterface(mInner);
  return privEvent->IsDispatchStopped(aIsDispatchPrevented);
}

NS_METHOD
nsXFormsDOMEvent::GetInternalNSEvent(nsEvent** aNSEvent)
{
  nsCOMPtr<nsIPrivateDOMEvent> privEvent = do_QueryInterface(mInner);
  return privEvent->GetInternalNSEvent(aNSEvent);
}

NS_METHOD
nsXFormsDOMEvent::HasOriginalTarget(PRBool* aResult)
{
  nsCOMPtr<nsIPrivateDOMEvent> privEvent = do_QueryInterface(mInner);
  return privEvent->HasOriginalTarget(aResult);
}

NS_METHOD
nsXFormsDOMEvent::SetTrusted(PRBool aTrusted)
{
  nsCOMPtr<nsIPrivateDOMEvent> privEvent = do_QueryInterface(mInner);
  return privEvent->SetTrusted(aTrusted);
}
