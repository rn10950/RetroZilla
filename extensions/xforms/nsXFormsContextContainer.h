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
 * IBM Corporation.
 * Portions created by the Initial Developer are Copyright (C) 2007
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *  Aaron Reed (aaronr@us.ibm.com)
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

#ifndef nsXFormsContextControl_h_
#define nsXFormsContextControl_h_

#include "nsCOMPtr.h"
#include "nsAutoPtr.h"

#include "nsIXTFElementWrapper.h"
#include "nsIXFormsRepeatItemElement.h"
#include "nsIDOMEvent.h"
#include "nsIDOM3Node.h"
#include "nsXFormsControlStub.h"

class nsXFormsContextContainer;

class nsXFormsFocusListener : public nsIDOMEventListener {
public:
  nsXFormsFocusListener(nsXFormsContextContainer* aContainer)
  : mContainer(aContainer) {}

  NS_DECL_ISUPPORTS
  NS_DECL_NSIDOMEVENTLISTENER
  void Detach()
  {
    mContainer = nsnull;
  }
protected:
  nsXFormsContextContainer* mContainer;
};

/**
 * Implementation of \<contextcontainer\>.
 *
 * \<contextcontainer\> is a pseudo-element that is wrapped around each row in
 * an "unrolled" \<repeat\>. @see nsXFormsRepeatElement
 *
 * @todo Support ::repeat-item and ::repeat-index pseudo-elements. (XXX)
 *       @see http://www.w3.org/TR/xforms/sliceF.html#id2645142
 *       @see http://bugzilla.mozilla.org/show_bug.cgi?id=271724
 */
class nsXFormsContextContainer : public nsXFormsBindableControlStub,
                                 public nsIXFormsRepeatItemElement
{
protected:
  /** The handler for the focus event */
  nsRefPtr<nsXFormsFocusListener> mFocusListener;

  /** The context position for the element */
  PRInt32 mContextPosition;

  /** The context size for the element */
  PRInt32 mContextSize;

  /** Does this element have the repeat-index? */
  PRPackedBool mHasIndex;

  /** Has context changed since last bind? */
  PRPackedBool mContextIsDirty;

public:
  nsXFormsContextContainer()
    : mContextPosition(1), mContextSize(1), mHasIndex(PR_FALSE),
      mContextIsDirty(PR_FALSE) {}

  NS_DECL_ISUPPORTS_INHERITED

  // nsIXTFElement overrides
  NS_IMETHOD CloneState(nsIDOMElement *aElement);
  NS_IMETHOD DocumentChanged(nsIDOMDocument *aNewDocument);

  // nsIXFormsControl
  NS_IMETHOD Bind(PRBool *aContextChanged);
  NS_IMETHOD SetContext(nsIDOMNode *aContextNode,
                        PRInt32     aContextPosition,
                        PRInt32     aContextSize);
  NS_IMETHOD GetContext(nsAString   &aModelID,
                        nsIDOMNode **aContextNode,
                        PRInt32     *aContextPosition,
                        PRInt32     *aContextSize);
  NS_IMETHOD IsEventTarget(PRBool *aOK);

  // nsIXFormsRepeatItemElement
  NS_DECL_NSIXFORMSREPEATITEMELEMENT

  nsresult HandleFocus(nsIDOMEvent *aEvent);

  // Overriding to make sure only appropriate values can be set.
  void SetRepeatState(nsRepeatState aState);

#ifdef DEBUG_smaug
  virtual const char* Name() {
    if (mElement) {
      nsAutoString localName;
      mElement->GetLocalName(localName);
      return NS_ConvertUTF16toUTF8(localName).get();
    }
    return "contextcontainer(inline?)";
  }
#endif
};

/* Factory methods */
NS_HIDDEN_(nsresult)
NS_NewXFormsContextContainer(nsIXTFElement **aResult);
#endif
