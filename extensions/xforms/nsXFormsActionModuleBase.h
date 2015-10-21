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

#ifndef nsXFormsActionModuleBase_h_
#define nsXFormsActionModuleBase_h_

#include "nsIDOMEventListener.h"
#include "nsIXFormsActionElement.h"
#include "nsXFormsStubElement.h"
#include "nsIDOMElement.h"
#include "nsIXFormsActionModuleElement.h"
#include "nsCOMPtr.h"
#include "nsXFormsUtils.h"

class nsXFormsActionModuleHelper
{
  /**
   * nsXFormsActionModuleHelper provides the foundation that allows event
   * iteration to work.  Every xforms action needs to inherit from
   * nsXFormsActionModuleHelper in some capacity; they can inherit indirectly
   * through nsXFormsActionModuleBase or directly from
   * nsXFormsActionModuleHelper in the cases where the action actually needs to
   * have binding capabilities (like nsXFormsAlertElement, etc)
   */

public:
  nsXFormsActionModuleHelper() : mCanIterate(PR_TRUE) {}
  virtual nsIDOMElement* GetElement() = 0;
  PRBool CanIterate() { return mCanIterate; }
  void SetCurrentEvent(nsIDOMEvent* aEvent) { mCurrentEvent = aEvent; }
  /**
   * With the `while` attribute, actions can potentially be iterated.  The
   * `HandleSingleAction` method processes one iteration of an action (that
   * is, the "body" of the action); it should be dispatched by the
   * `HandleAction` method, which manages the conditional execution and
   * iteration of the action.
   */
  virtual nsresult
    HandleSingleAction(nsIDOMEvent *aEvent,
                       nsIXFormsActionElement *aParentAction) = 0;
protected:
  /**
   * This signals whether or not this action can iterate.  Technically, all
   * XForms 1.1 actions are allowed to iterate, but for some of them it
   * may not make sense.  Currently, this is set to PR_TRUE for all actions,
   * but we can optionally disable iteration for specific actions based upon
   * additional information in the future.
   */
  PRBool mCanIterate;

  /**
   * The event currently being processed.
   */
  nsCOMPtr<nsIDOMEvent> mCurrentEvent;
};

class nsXFormsActionModuleBase : public nsIDOMEventListener,
                                 public nsXFormsStubElement,
                                 public nsIXFormsActionModuleElement,
                                 public nsXFormsActionModuleHelper
{
public:
  nsXFormsActionModuleBase();
  virtual ~nsXFormsActionModuleBase();
  NS_DECL_ISUPPORTS_INHERITED
  NS_DECL_NSIXFORMSACTIONMODULEELEMENT
  NS_DECL_NSIXTFGENERICELEMENT
  NS_DECL_NSIDOMEVENTLISTENER
  NS_IMETHOD OnDestroyed();
  NS_IMETHOD WillChangeDocument(nsIDOMDocument *aNewDocument);
  NS_IMETHOD DocumentChanged(nsIDOMDocument *aNewDocument);
  NS_IMETHOD WillChangeParent(nsIDOMElement *aNewParent);
  NS_IMETHOD ParentChanged(nsIDOMElement *aNewParent);

  virtual nsIDOMElement *GetElement() { return mElement; }

  static nsresult DoHandleAction(nsXFormsActionModuleHelper *aXFormsAction,
                                 nsIDOMEvent                *aEvent,
                                 nsIXFormsActionElement     *aParentAction);
  /**
   * Determine whether this action element should be executed, based upon
   * optional `if` and `while` attributes.  For each of these attributes
   * that are present on an action element, the action is only performed if
   * the boolean value of the XPath expression contained in the attribute is
   * true.  In addition, if the `while` attribute is used, the action is
   * "executed repeatedly" until one of these attributes evaluates to false.
   * This method indicates to the caller whether the action element uses a
   * `while` attribute through the `usesWhile` parameter.
   */
  static PRBool CanPerformAction(nsIDOMElement  *aElement,
                                 PRBool         *aUsesWhile,
                                 nsIDOMNode     *aContextNode = nsnull,
                                 PRInt32         aContextSize = 0,
                                 PRInt32         aContextPosition = 0);
protected:
  nsIDOMElement *mElement;
};

#endif

