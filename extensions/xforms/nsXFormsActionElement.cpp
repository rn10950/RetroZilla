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
 * Olli Pettay.
 * Portions created by the Initial Developer are Copyright (C) 2004
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Olli Pettay <Olli.Pettay@helsinki.fi> (original author)
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either of the GNU General Public License Version 2 or later (the "GPL"),
 * or the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
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

#include "nsXFormsActionElement.h"
#include "nsIXFormsModelElement.h"
#include "nsIDOMNodeList.h"
#include "nsIDOMDocument.h"
#include "nsIDOMEvent.h"
#include "nsIDOMElement.h"
#include "nsIXTFBindableElementWrapper.h"

#define DEFERRED_REBUILD     0x01
#define DEFERRED_RECALCULATE 0x02
#define DEFERRED_REVALIDATE  0x04
#define DEFERRED_REFRESH     0x08

NS_IMPL_ADDREF_INHERITED(nsXFormsActionElement, nsXFormsBindableControlStub)
NS_IMPL_RELEASE_INHERITED(nsXFormsActionElement, nsXFormsBindableControlStub)

NS_INTERFACE_MAP_BEGIN(nsXFormsActionElement)
  NS_INTERFACE_MAP_ENTRY(nsIXFormsActionModuleElement)
  NS_INTERFACE_MAP_ENTRY(nsIXFormsActionElement)
  NS_INTERFACE_MAP_ENTRY(nsIDOMEventListener)
NS_INTERFACE_MAP_END_INHERITING(nsXFormsBindableControlStub)

NS_IMETHODIMP
nsXFormsActionElement::OnCreated(nsIXTFBindableElementWrapper* aWrapper)
{
  nsresult rv = nsXFormsBindableControlStub::OnCreated(aWrapper);
  NS_ENSURE_SUCCESS(rv, rv);

  aWrapper->SetNotificationMask(nsIXTFElement::NOTIFY_WILL_CHANGE_DOCUMENT |
                                nsIXTFElement::NOTIFY_WILL_CHANGE_PARENT |
                                nsIXTFElement::NOTIFY_DOCUMENT_CHANGED |
                                nsIXTFElement::NOTIFY_PARENT_CHANGED);

  return NS_OK;
}

NS_IMETHODIMP
nsXFormsActionElement::OnDestroyed() {
  mParentAction = nsnull;
  mElement = nsnull;
  return NS_OK;
}

NS_IMETHODIMP
nsXFormsActionElement::WillChangeParent(nsIDOMElement *aNewParent)
{
  SetRepeatState(eType_Unknown);
  return NS_OK;
}

NS_IMETHODIMP
nsXFormsActionElement::ParentChanged(nsIDOMElement *aNewParent)
{
  mHasParent = aNewParent != nsnull;
  UpdateRepeatState(aNewParent);
  return NS_OK;
}

NS_IMETHODIMP
nsXFormsActionElement::WillChangeDocument(nsIDOMDocument *aNewDocument)
{
  SetRepeatState(eType_Unknown);
  return NS_OK;
}

NS_IMETHODIMP
nsXFormsActionElement::DocumentChanged(nsIDOMDocument *aNewDocument)
{
  mHasDoc = aNewDocument != nsnull;

  nsCOMPtr<nsIDOMNode> parent;
  mElement->GetParentNode(getter_AddRefs(parent));
  UpdateRepeatState(parent);
  return NS_OK;
}

NS_IMETHODIMP
nsXFormsActionElement::HandleEvent(nsIDOMEvent* aEvent)
{
  if (GetRepeatState() == eType_Template) {
    return NS_OK;
  }

  return nsXFormsUtils::EventHandlingAllowed(aEvent, mElement) ?
           HandleAction(aEvent, nsnull) : NS_OK;
}

PR_STATIC_CALLBACK(PLDHashOperator) DoDeferredActions(nsISupports * aModel, 
                                                      PRUint32 aDeferred,
                                                      void * data)
{
  if (aModel && aDeferred) {
    nsCOMPtr<nsIModelElementPrivate> model(do_QueryInterface(aModel));

    if (aDeferred & DEFERRED_REBUILD)
      model->RequestRebuild();
    if (aDeferred & DEFERRED_RECALCULATE)
      model->RequestRecalculate();
    if (aDeferred & DEFERRED_REVALIDATE)
      model->RequestRevalidate();
    if (aDeferred & DEFERRED_REFRESH)
      model->RequestRefresh();
  }
  return PL_DHASH_NEXT;
}

NS_IMETHODIMP
nsXFormsActionElement::HandleAction(nsIDOMEvent* aEvent,
                                    nsIXFormsActionElement* aParentAction)
{
  return nsXFormsActionModuleBase::DoHandleAction(this, aEvent, aParentAction);
}

nsresult
nsXFormsActionElement::HandleSingleAction(nsIDOMEvent* aEvent,
                                          nsIXFormsActionElement* aParentAction)
{
  if (!mDeferredUpdates.IsInitialized()) {
    NS_ENSURE_TRUE(mDeferredUpdates.Init(), NS_ERROR_OUT_OF_MEMORY);
  } else {
    mDeferredUpdates.Clear();
  }

  mParentAction = aParentAction;
  nsCOMPtr<nsIDOMNodeList> childNodes;
  mElement->GetChildNodes(getter_AddRefs(childNodes));
  if (!childNodes) {
    return NS_OK;
  }

  PRUint32 count;
  childNodes->GetLength(&count);
  nsCOMPtr<nsIXFormsActionModuleElement> actionChild;
  nsCOMPtr<nsIDOMEvent> event(aEvent);
  for (PRUint32 i = 0; i < count; ++i) {
    nsCOMPtr<nsIDOMNode> child;
    childNodes->Item(i, getter_AddRefs(child));
    actionChild = do_QueryInterface(child);
    if (actionChild) {
      actionChild->HandleAction(event, this);
    }
  }
  if (!aParentAction) { //Otherwise parent will handle deferred updates
    mDeferredUpdates.EnumerateRead(DoDeferredActions, nsnull);
  }
  return NS_OK;
}

NS_IMETHODIMP
nsXFormsActionElement::SetRebuild(nsIModelElementPrivate* aModel,
                                  PRBool aEnable)
{
  if (mParentAction) {
    return mParentAction->SetRebuild(aModel, aEnable);
  }

  PRUint32 deferred = 0;

  // It is possible that QI's to an interface that isn't nsISupports (like
  // nsIModelElementPrivate) could produce different values even from the same
  // model element.  So we'll convert the model to nsISupports before querying
  // it or storing it via hashtable.
  nsCOMPtr<nsISupports> temp(do_QueryInterface(aModel));
  mDeferredUpdates.Get(temp, &deferred);
  if (aEnable) {
    deferred |= DEFERRED_REBUILD;
  } else {
    deferred &= ~DEFERRED_REBUILD;
  }
  
  mDeferredUpdates.Put(temp, deferred);
  return NS_OK;
}

NS_IMETHODIMP
nsXFormsActionElement::SetRecalculate(nsIModelElementPrivate* aModel,
                                      PRBool aEnable)
{
  if (mParentAction) {
    return mParentAction->SetRecalculate(aModel, aEnable);
  }

  PRUint32 deferred = 0;

  // It is possible that QI's to an interface that isn't nsISupports (like
  // nsIModelElementPrivate) could produce different values even from the same
  // model element.  So we'll convert the model to nsISupports before querying
  // it or storing it via hashtable.
  nsCOMPtr<nsISupports> temp(do_QueryInterface(aModel));
  mDeferredUpdates.Get(temp, &deferred);
  if (aEnable) {
    deferred |= DEFERRED_RECALCULATE;
  } else {
    deferred &= ~DEFERRED_RECALCULATE;
  }
  mDeferredUpdates.Put(temp, deferred);
  return NS_OK;
}

NS_IMETHODIMP
nsXFormsActionElement::SetRevalidate(nsIModelElementPrivate* aModel,
                                     PRBool aEnable)
{
  if (mParentAction) {
    return mParentAction->SetRevalidate(aModel, aEnable);
  }

  PRUint32 deferred = 0;

  // It is possible that QI's to an interface that isn't nsISupports (like
  // nsIModelElementPrivate) could produce different values even from the same
  // model element.  So we'll convert the model to nsISupports before querying
  // it or storing it via hashtable.
  nsCOMPtr<nsISupports> temp(do_QueryInterface(aModel));
  mDeferredUpdates.Get(temp, &deferred);
  if (aEnable) {
    deferred |= DEFERRED_REVALIDATE;
  } else {
    deferred &= ~DEFERRED_REVALIDATE;
  }
  mDeferredUpdates.Put(temp, deferred);
  return NS_OK;
}

NS_IMETHODIMP
nsXFormsActionElement::SetRefresh(nsIModelElementPrivate* aModel,
                                  PRBool aEnable)
{
  if (mParentAction) {
    return mParentAction->SetRefresh(aModel, aEnable);
  }

  PRUint32 deferred = 0;

  // It is possible that QI's to an interface that isn't nsISupports (like
  // nsIModelElementPrivate) could produce different values even from the same
  // model element.  So we'll convert the model to nsISupports before querying
  // it or storing it via hashtable.
  nsCOMPtr<nsISupports> temp(do_QueryInterface(aModel));
  mDeferredUpdates.Get(temp, &deferred);
  if (aEnable) {
    deferred |= DEFERRED_REFRESH;
  } else {
    deferred &= ~DEFERRED_REFRESH;
  }
  mDeferredUpdates.Put(temp, deferred);
  return NS_OK;
}

NS_IMETHODIMP
nsXFormsActionElement::GetCurrentEvent(nsIDOMEvent** aEvent)
{
  NS_IF_ADDREF(*aEvent = mCurrentEvent);
  return NS_OK;
}

NS_HIDDEN_(nsresult)
NS_NewXFormsActionElement(nsIXTFElement **aResult)
{
  *aResult = new nsXFormsActionElement();
  if (!*aResult) {
    return NS_ERROR_OUT_OF_MEMORY;
  }

  NS_ADDREF(*aResult);
  return NS_OK;
}

