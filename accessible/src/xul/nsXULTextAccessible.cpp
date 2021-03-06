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
 * The Original Code is mozilla.org code.
 *
 * The Initial Developer of the Original Code is
 * Netscape Communications Corporation.
 * Portions created by the Initial Developer are Copyright (C) 1998
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Aaron Leventhal (aaronl@netscape.com)
 *   Kyle Yuan (kyle.yuan@sun.com)
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

// NOTE: alphabetically ordered
#include "nsAccessibilityAtoms.h"
#include "nsBaseWidgetAccessible.h"
#include "nsIDOMXULDescriptionElement.h"
#include "nsINameSpaceManager.h"
#include "nsString.h"
#include "nsXULTextAccessible.h"

/**
  * For XUL descriptions and labels
  */
nsXULTextAccessible::nsXULTextAccessible(nsIDOMNode* aDomNode, nsIWeakReference* aShell):
nsTextAccessibleWrap(aDomNode, aShell)
{ 
}

/* wstring getName (); */
NS_IMETHODIMP nsXULTextAccessible::GetName(nsAString& aName)
{ 
  nsCOMPtr<nsIContent> content(do_QueryInterface(mDOMNode));
  if (!content) {
    return NS_ERROR_FAILURE;  // Node shut down
  }
  nsresult rv = content->GetAttr(kNameSpaceID_None, nsAccessibilityAtoms::value, aName);
  if (rv == NS_CONTENT_ATTR_NOT_THERE) {
    // if the value doesn't exist, flatten the inner content as the name (for descriptions)
    return AppendFlatStringFromSubtree(content, &aName);
  }
  // otherwise, use the value attribute as the name (for labels)
  return NS_OK;
}

NS_IMETHODIMP nsXULTextAccessible::GetState(PRUint32 *_retval)
{
  // Labels and description can only have read only state
  // They are not focusable or selectable
  *_retval = STATE_READONLY;
  return NS_OK;
}

/**
  * For XUL tooltip
  */
nsXULTooltipAccessible::nsXULTooltipAccessible(nsIDOMNode* aDomNode, nsIWeakReference* aShell):
nsLeafAccessible(aDomNode, aShell)
{ 
}

NS_IMETHODIMP nsXULTooltipAccessible::GetName(nsAString& _retval)
{
  //XXX, kyle.yuan@sun.com, we don't know how to get at this information at the moment,
  //  because it is not loaded until it shows.
  return NS_OK;
}

NS_IMETHODIMP nsXULTooltipAccessible::GetState(PRUint32 *_retval)
{
  nsLeafAccessible::GetState(_retval);
  *_retval &= ~STATE_FOCUSABLE;
  *_retval |= STATE_READONLY;
  return NS_OK;
}

NS_IMETHODIMP nsXULTooltipAccessible::GetRole(PRUint32 *_retval)
{
  *_retval = ROLE_TOOLTIP;
  return NS_OK;
}

/**
 * For XUL text links
 */
nsXULLinkAccessible::nsXULLinkAccessible(nsIDOMNode *aDomNode, nsIWeakReference *aShell):
nsXULTextAccessible(aDomNode, aShell)
{
}

NS_IMETHODIMP nsXULLinkAccessible::GetValue(nsAString& aValue)
{
  if (mIsLink) {
    return mActionContent->GetAttr(kNameSpaceID_None, nsAccessibilityAtoms::href, aValue);
  }
  return NS_ERROR_NOT_IMPLEMENTED;
}

NS_IMETHODIMP nsXULLinkAccessible::GetRole(PRUint32 *aRole)
{
  if (mIsLink) {
    *aRole = ROLE_LINK;
  } else {
    // default to calling the link a button; might have javascript
    *aRole = ROLE_PUSHBUTTON;
  }
  // should there be a third case where it becomes just text?
  return NS_OK;
}

void nsXULLinkAccessible::CacheActionContent()
{
  // not a link if no content
  nsCOMPtr<nsIContent> mTempContent = do_QueryInterface(mDOMNode);
  if (!mTempContent) {
    return;
  }

  // not a link if there is no href attribute or not on a <link> tag
  if (mTempContent->HasAttr(kNameSpaceID_None, nsAccessibilityAtoms::href) ||
      mTempContent->Tag() == nsAccessibilityAtoms::link) {
    mIsLink = PR_TRUE;
    mActionContent = mTempContent;
  }
  else if (mTempContent->HasAttr(kNameSpaceID_None, nsAccessibilityAtoms::onclick)) {
    mIsOnclick = PR_TRUE;
    mActionContent = mTempContent;
  }
}
