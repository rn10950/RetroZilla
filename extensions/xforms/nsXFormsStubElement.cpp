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
 * Portions created by the Initial Developer are Copyright (C) 2004
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *  Brian Ryner <bryner@brianryner.com>
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

#include "nsXFormsStubElement.h"
#include "nsIDOMElement.h"
#include "nsIDOMEventTarget.h"
#include "nsIDOM3Node.h"
#include "nsMemory.h"
#include "nsXFormsUtils.h"
#include "nsXFormsAtoms.h"
#include "nsIXTFBindableElementWrapper.h"

static const nsIID sScriptingIIDs[] = {
  NS_IDOMELEMENT_IID,
  NS_IDOMEVENTTARGET_IID,
  NS_IDOM3NODE_IID
};

// nsXFormsStubElement implementation

NS_IMPL_ISUPPORTS2(nsXFormsStubElement, nsIXTFElement, nsIXTFGenericElement)

NS_IMETHODIMP
nsXFormsStubElement::OnDestroyed()
{
  return NS_OK;
}

NS_IMETHODIMP
nsXFormsStubElement::GetElementType(PRUint32 *aElementType)
{
  *aElementType = nsIXTFElement::ELEMENT_TYPE_GENERIC_ELEMENT;
  return NS_OK;
}

NS_IMETHODIMP
nsXFormsStubElement::GetIsAttributeHandler(PRBool *aIsAttributeHandler)
{
  *aIsAttributeHandler = PR_FALSE;
  return NS_OK;
}

NS_IMETHODIMP
nsXFormsStubElement::GetScriptingInterfaces(PRUint32 *aCount, nsIID ***aArray)
{
  return nsXFormsUtils::CloneScriptingInterfaces(sScriptingIIDs,
                                                 NS_ARRAY_LENGTH(sScriptingIIDs),
                                                 aCount, aArray);
}

NS_IMETHODIMP
nsXFormsStubElement::WillChangeDocument(nsIDOMDocument *aNewDocument)
{
  return NS_OK;
}

NS_IMETHODIMP
nsXFormsStubElement::DocumentChanged(nsIDOMDocument *aNewDocument)
{
  mHasDoc = aNewDocument != nsnull;
  return NS_OK;
}

NS_IMETHODIMP
nsXFormsStubElement::WillChangeParent(nsIDOMElement *aNewParent)
{
  return NS_OK;
}

NS_IMETHODIMP
nsXFormsStubElement::ParentChanged(nsIDOMElement *aNewParent)
{
  mHasParent = aNewParent != nsnull;
  return NS_OK;
}

NS_IMETHODIMP
nsXFormsStubElement::WillInsertChild(nsIDOMNode *aChild, PRUint32 aIndex)
{
  return NS_OK;
}

NS_IMETHODIMP
nsXFormsStubElement::ChildInserted(nsIDOMNode *aChild, PRUint32 aIndex)
{
  return NS_OK;
}

NS_IMETHODIMP
nsXFormsStubElement::WillAppendChild(nsIDOMNode *aChild)
{
  return NS_OK;
}

NS_IMETHODIMP
nsXFormsStubElement::ChildAppended(nsIDOMNode *aChild)
{
  return NS_OK;
}

NS_IMETHODIMP
nsXFormsStubElement::WillRemoveChild(PRUint32 aIndex)
{
  return NS_OK;
}

NS_IMETHODIMP
nsXFormsStubElement::ChildRemoved(PRUint32 aIndex)
{
  return NS_OK;
}

NS_IMETHODIMP
nsXFormsStubElement::WillSetAttribute(nsIAtom *aName,
                                      const nsAString &aNewValue)
{
  return NS_OK;
}

NS_IMETHODIMP
nsXFormsStubElement::AttributeSet(nsIAtom *aName, const nsAString &aNewValue)
{
  return NS_OK;
}

NS_IMETHODIMP
nsXFormsStubElement::WillRemoveAttribute(nsIAtom *aName)
{
  return NS_OK;
}

NS_IMETHODIMP
nsXFormsStubElement::AttributeRemoved(nsIAtom *aName)
{
  return NS_OK;
}

NS_IMETHODIMP
nsXFormsStubElement::BeginAddingChildren()
{
  return NS_OK;
}

NS_IMETHODIMP
nsXFormsStubElement::DoneAddingChildren()
{
  return NS_OK;
}

NS_IMETHODIMP
nsXFormsStubElement::HandleDefault(nsIDOMEvent *aEvent, PRBool *aHandled)
{
  *aHandled = PR_FALSE;
  return NS_OK;
}

NS_IMETHODIMP
nsXFormsStubElement::OnCreated(nsIXTFGenericElementWrapper *aWrapper)
{
  return NS_OK;
}

NS_IMETHODIMP
nsXFormsStubElement::CloneState(nsIDOMElement *aElement)
{
  return NS_OK;
}

nsRepeatState
nsXFormsStubElement::GetRepeatState()
{
  return mRepeatState;
}

void
nsXFormsStubElement::SetRepeatState(nsRepeatState aState)
{
  mRepeatState = aState;
  return;
}

nsRepeatState
nsXFormsStubElement::UpdateRepeatState(nsIDOMNode *aParent)
{
  // Walk up the parent chain looking to see if the this control is contained
  // in an item.  If it is and that item is contained in a itemset, then we
  // know that this control was generated as a clone from the itemset's
  // template.  Similarly, we'll check to see if this control lives in a
  // contextcontainer (meaning it was cloned from a repeat's template).
  // Otherwise, if neither of these are the case but it lives under a repeat
  // or an itemset, then this control must be part of a template.  A template
  // is the content of a repeat or itemset that gets cloned once for every
  // node in the bound nodeset.
  //
  // If none of this applies, we'll return eType_NotApplicable to show that this
  // control isn't bound to a repeating nodeset.
  nsRepeatState repeatState = eType_NotApplicable;

  if (!mHasDoc || !mHasParent) {
    // If we don't have a document or a parent, none of these tests will work
    // correctly so no sense doing them now.  If either of these are false the
    // repeat state for the object should already be eType_Unknown so just
    // return that now.
    return eType_Unknown;
  }

  nsCOMPtr<nsIDOMNode> parent = aParent;
  PRBool childIsItem = PR_FALSE;
  while (parent) {
    if (nsXFormsUtils::IsXFormsElement(parent,
                                       NS_LITERAL_STRING("contextcontainer"))) {
      repeatState = eType_GeneratedContent;
      break;
    }
    if (nsXFormsUtils::IsXFormsElement(parent, NS_LITERAL_STRING("repeat"))) {
      repeatState = eType_Template;
      break;
    }
    if (nsXFormsUtils::IsXFormsElement(parent, NS_LITERAL_STRING("itemset"))) {
      if (childIsItem) {
        repeatState = eType_GeneratedContent;
        break;
      }
      repeatState = eType_Template;
      break;
    }

    if (nsXFormsUtils::IsXFormsElement(parent, NS_LITERAL_STRING("item"))) {
      childIsItem = PR_TRUE;
    } else {

      nsCOMPtr<nsIDOMElement> parentEle(do_QueryInterface(parent));
      if (!parentEle) {
        // I don't know how this can possibly happen, but if it does I guess
        // we should just ignore it and coninue on our way.
        break;
      }

      // if this control is contained underneath an element that contains
      // an xforms binding attribute that introduces an anonymous xf:repeat
      // then the control is part of a template
      PRBool repeatAttr = PR_FALSE;
      parentEle->HasAttributeNS(NS_LITERAL_STRING(NS_NAMESPACE_XFORMS),
                                NS_LITERAL_STRING("repeat-bind"),
                                &repeatAttr);
      if (repeatAttr) {
        repeatState = eType_Template;
        break;
      }

      parentEle->HasAttributeNS(NS_LITERAL_STRING(NS_NAMESPACE_XFORMS),
                                NS_LITERAL_STRING("repeat-nodeset"),
                                &repeatAttr);
      if (repeatAttr) {
        repeatState = eType_Template;
        break;
      }
    }
    nsCOMPtr<nsIDOMNode> tmp;
    parent->GetParentNode(getter_AddRefs(tmp));
    parent = tmp;
  }

  SetRepeatState(repeatState);
  return repeatState;
}
nsresult
NS_NewXFormsStubElement(nsIXTFElement **aResult)
{
  *aResult = new nsXFormsStubElement();
  if (!*aResult)
    return NS_ERROR_OUT_OF_MEMORY;

  NS_ADDREF(*aResult);
  return NS_OK;
}

// nsXFormsBindableStub implementation

NS_IMPL_ISUPPORTS2(nsXFormsBindableStub, nsIXTFElement, nsIXTFBindableElement)

NS_IMETHODIMP
nsXFormsBindableStub::OnDestroyed()
{
  return NS_OK;
}

NS_IMETHODIMP
nsXFormsBindableStub::GetElementType(PRUint32 *aElementType)
{
  *aElementType = nsIXTFElement::ELEMENT_TYPE_BINDABLE;
  return NS_OK;
}

NS_IMETHODIMP
nsXFormsBindableStub::GetIsAttributeHandler(PRBool *aIsAttributeHandler)
{
  *aIsAttributeHandler = PR_FALSE;
  return NS_OK;
}

NS_IMETHODIMP
nsXFormsBindableStub::GetScriptingInterfaces(PRUint32 *aCount, nsIID ***aArray)
{
  return NS_OK;
}

NS_IMETHODIMP
nsXFormsBindableStub::WillChangeDocument(nsIDOMDocument *aNewDocument)
{
  return NS_OK;
}

NS_IMETHODIMP
nsXFormsBindableStub::DocumentChanged(nsIDOMDocument *aNewDocument)
{
  return NS_OK;
}

NS_IMETHODIMP
nsXFormsBindableStub::WillChangeParent(nsIDOMElement *aNewParent)
{
  return NS_OK;
}

NS_IMETHODIMP
nsXFormsBindableStub::ParentChanged(nsIDOMElement *aNewParent)
{
  return NS_OK;
}

NS_IMETHODIMP
nsXFormsBindableStub::WillInsertChild(nsIDOMNode *aChild, PRUint32 aIndex)
{
  return NS_OK;
}

NS_IMETHODIMP
nsXFormsBindableStub::ChildInserted(nsIDOMNode *aChild, PRUint32 aIndex)
{
  return NS_OK;
}

NS_IMETHODIMP
nsXFormsBindableStub::WillAppendChild(nsIDOMNode *aChild)
{
  return NS_OK;
}

NS_IMETHODIMP
nsXFormsBindableStub::ChildAppended(nsIDOMNode *aChild)
{
  return NS_OK;
}

NS_IMETHODIMP
nsXFormsBindableStub::WillRemoveChild(PRUint32 aIndex)
{
  return NS_OK;
}

NS_IMETHODIMP
nsXFormsBindableStub::ChildRemoved(PRUint32 aIndex)
{
  return NS_OK;
}

NS_IMETHODIMP
nsXFormsBindableStub::WillSetAttribute(nsIAtom *aName,
                                      const nsAString &aNewValue)
{
  return NS_OK;
}

NS_IMETHODIMP
nsXFormsBindableStub::AttributeSet(nsIAtom *aName, const nsAString &aNewValue)
{
  return NS_OK;
}

NS_IMETHODIMP
nsXFormsBindableStub::WillRemoveAttribute(nsIAtom *aName)
{
  return NS_OK;
}

NS_IMETHODIMP
nsXFormsBindableStub::AttributeRemoved(nsIAtom *aName)
{
  return NS_OK;
}

NS_IMETHODIMP
nsXFormsBindableStub::BeginAddingChildren()
{
  return NS_OK;
}

NS_IMETHODIMP
nsXFormsBindableStub::DoneAddingChildren()
{
  return NS_OK;
}

NS_IMETHODIMP
nsXFormsBindableStub::HandleDefault(nsIDOMEvent *aEvent, PRBool *aHandled)
{
  *aHandled = PR_FALSE;
  return NS_OK;
}

NS_IMETHODIMP
nsXFormsBindableStub::OnCreated(nsIXTFBindableElementWrapper *aWrapper)
{
  NS_ENSURE_ARG(aWrapper);
  return aWrapper->SetClassAttributeName(nsXFormsAtoms::clazz);
}

NS_IMETHODIMP
nsXFormsBindableStub::CloneState(nsIDOMElement *aElement)
{
  return NS_OK;
}

nsresult
NS_NewXFormsBindableStub(nsIXTFElement **aResult)
{
  *aResult = new nsXFormsBindableStub();
  if (!*aResult)
    return NS_ERROR_OUT_OF_MEMORY;

  NS_ADDREF(*aResult);
  return NS_OK;
}
