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
 *   John L. Clark <jlc6@po.cwru.edu>
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

#include "nsXFormsActionModuleBase.h"
#include "nsXFormsActionElement.h"
#include "nsIDOM3Node.h"
#include "nsMemory.h"
#include "nsIDOMNodeList.h"
#include "nsXFormsModelElement.h"
#include "nsString.h"
#include "nsIDOMElement.h"
#include "nsIDOMNodeList.h"
#include "nsIXTFGenericElementWrapper.h"
#include "nsIDOMDocumentEvent.h"
#include "nsIDOMEventTarget.h"

#include "nsXFormsUtils.h"
#include "nsIDOMAttr.h"
#include "nsIXFormsControl.h"

#include "nsIPrefBranch.h"
#include "nsIPrefService.h"
#include "nsServiceManagerUtils.h"

nsXFormsActionModuleBase::nsXFormsActionModuleBase() : mElement(nsnull)
{
}

nsXFormsActionModuleBase::~nsXFormsActionModuleBase()
{
}

NS_IMPL_ISUPPORTS_INHERITED2(nsXFormsActionModuleBase,
                             nsXFormsStubElement,
                             nsIXFormsActionModuleElement,
                             nsIDOMEventListener)

NS_IMETHODIMP
nsXFormsActionModuleBase::OnCreated(nsIXTFGenericElementWrapper *aWrapper)
{
  // It's ok to keep a weak pointer to mElement.  mElement will have an
  // owning reference to this object, so as long as we null out mElement in
  // OnDestroyed, it will always be valid.
  nsCOMPtr<nsIDOMElement> node;
  aWrapper->GetElementNode(getter_AddRefs(node));
  mElement = node;
  NS_ASSERTION(mElement, "Wrapper is not an nsIDOMElement, we'll crash soon");

  aWrapper->SetNotificationMask(nsIXTFElement::NOTIFY_WILL_CHANGE_DOCUMENT |
                                nsIXTFElement::NOTIFY_WILL_CHANGE_PARENT |
                                nsIXTFElement::NOTIFY_DOCUMENT_CHANGED |
                                nsIXTFElement::NOTIFY_PARENT_CHANGED);

  return NS_OK;
}

NS_IMETHODIMP nsXFormsActionModuleBase::OnDestroyed()
{
  mElement = nsnull;
  return NS_OK;
}

NS_IMETHODIMP
nsXFormsActionModuleBase::WillChangeParent(nsIDOMElement *aNewParent)
{
  SetRepeatState(eType_Unknown);
  return NS_OK;
}

NS_IMETHODIMP
nsXFormsActionModuleBase::ParentChanged(nsIDOMElement *aNewParent)
{
  nsXFormsStubElement::ParentChanged(aNewParent);
  UpdateRepeatState(aNewParent);
  return NS_OK;
}

NS_IMETHODIMP
nsXFormsActionModuleBase::WillChangeDocument(nsIDOMDocument *aNewDocument)
{
  SetRepeatState(eType_Unknown);
  return NS_OK;
}

NS_IMETHODIMP
nsXFormsActionModuleBase::DocumentChanged(nsIDOMDocument *aNewDocument)
{
  nsXFormsStubElement::DocumentChanged(aNewDocument);

  nsCOMPtr<nsIDOMNode> parent;
  mElement->GetParentNode(getter_AddRefs(parent));
  UpdateRepeatState(parent);
  return NS_OK;
}

NS_IMETHODIMP
nsXFormsActionModuleBase::HandleEvent(nsIDOMEvent* aEvent)
{
  if (GetRepeatState() == eType_Template) {
    return NS_OK;
  }

  return nsXFormsUtils::EventHandlingAllowed(aEvent, mElement) ?
           HandleAction(aEvent, nsnull) : NS_OK;
}

NS_IMETHODIMP
nsXFormsActionModuleBase::HandleAction(nsIDOMEvent            *aEvent,
                                       nsIXFormsActionElement *aParentAction)
{
  return nsXFormsActionModuleBase::DoHandleAction(this, aEvent, aParentAction);
}

/* static */ nsresult
nsXFormsActionModuleBase::DoHandleAction(nsXFormsActionModuleHelper *aXFormsAction,
                                         nsIDOMEvent                *aEvent,
                                         nsIXFormsActionElement     *aParentAction)
{
  nsCOMPtr<nsIDOMElement> element = aXFormsAction->GetElement();
  if (!element) {
    return NS_OK;
  }
  aXFormsAction->SetCurrentEvent(aEvent);

  // Set the maximum run time for the loop (in microseconds).
  PRTime microseconds = nsXFormsUtils::waitLimit * PR_USEC_PER_SEC;

  PRTime runTime = 0, start = PR_Now();

  while (PR_TRUE) {
    // Test the `if` and `while` attributes to determine whether this action
    // can be performed and should be repeated.
    PRBool usesWhile;
    if (!nsXFormsActionModuleBase::CanPerformAction(element, &usesWhile)) {
      return NS_OK;
    }

    nsresult rv = aXFormsAction->HandleSingleAction(aEvent, aParentAction);
    NS_ENSURE_SUCCESS(rv, rv);

    // Repeat this action if it can iterate and if it uses the `while`
    // attribute (the expression of which must have evaluated to true to
    // arrive here).
    if (!aXFormsAction->CanIterate() || !usesWhile) {
      return NS_OK;
    }

    // See if we've exceeded our time limit, and if so, prompt the user to
    // determine if she wants to cancel the loop.
    LL_SUB(runTime, PR_Now(), start);
    if (microseconds <= 0 || runTime < microseconds) {
      continue;
    }

    // The remaining part of the loop prompts the user about cancelling the
    // loop, and is only executed if we've gone over the time limit.
    PRBool stopWaiting = nsXFormsUtils::AskStopWaiting(element);

    if (stopWaiting) {
      // Stop the loop
      return NS_OK;
    } else {
      start = PR_Now();
    }
  }
}

/* static */
PRBool
nsXFormsActionModuleBase::CanPerformAction(nsIDOMElement *aElement,
                                           PRBool        *aUsesWhile,
                                           nsIDOMNode    *aContext,
                                           PRInt32        aContextSize,
                                           PRInt32        aContextPosition)
{
  *aUsesWhile = PR_FALSE;

  nsAutoString ifExpr;
  nsAutoString whileExpr;
  aElement->GetAttribute(NS_LITERAL_STRING("if"), ifExpr);
  aElement->GetAttribute(NS_LITERAL_STRING("while"), whileExpr);

  if (whileExpr.IsEmpty() && ifExpr.IsEmpty()) {
    return PR_TRUE;
  }

  nsresult rv;
  nsCOMPtr<nsIDOMXPathResult> res;
  PRBool condTrue;

  nsCOMPtr<nsIDOMNode> contextNode;

  if (aContext) {
    contextNode = aContext;
  } else {
    // Determine evaluation context.
    nsCOMPtr<nsIModelElementPrivate> model;
    nsCOMPtr<nsIDOMElement> bindElement;
    nsCOMPtr<nsIXFormsControl> parentControl;
    PRBool outerBind;
    rv = nsXFormsUtils::GetNodeContext(aElement, 0,
                                       getter_AddRefs(model),
                                       getter_AddRefs(bindElement),
                                       &outerBind,
                                       getter_AddRefs(parentControl),
                                       getter_AddRefs(contextNode),
                                       &aContextPosition, &aContextSize, PR_FALSE);
    NS_ENSURE_SUCCESS(rv, PR_FALSE);
  }

  if (!whileExpr.IsEmpty()) {
    *aUsesWhile = PR_TRUE;

    rv = nsXFormsUtils::EvaluateXPath(whileExpr, contextNode, aElement,
                                      nsIDOMXPathResult::BOOLEAN_TYPE,
                                      getter_AddRefs(res),
                                      aContextPosition, aContextSize);
    NS_ENSURE_SUCCESS(rv, PR_FALSE);
    
    rv = res->GetBooleanValue(&condTrue);
    if (NS_FAILED(rv) || !condTrue) {
      return PR_FALSE;
    }
  }

  if (!ifExpr.IsEmpty()) {
    rv = nsXFormsUtils::EvaluateXPath(ifExpr, contextNode, aElement,
                                      nsIDOMXPathResult::BOOLEAN_TYPE,
                                      getter_AddRefs(res),
                                      aContextPosition, aContextSize);
    NS_ENSURE_SUCCESS(rv, PR_FALSE);
    
    rv = res->GetBooleanValue(&condTrue);
    if (NS_FAILED(rv) || !condTrue) {
      return PR_FALSE;
    }
  }

  return PR_TRUE;
}

NS_IMETHODIMP
nsXFormsActionModuleBase::GetCurrentEvent(nsIDOMEvent **aEvent)
{
  NS_IF_ADDREF(*aEvent = mCurrentEvent);
  return NS_OK;
}
