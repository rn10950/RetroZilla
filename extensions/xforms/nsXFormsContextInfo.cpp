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

#include "nsXFormsContextInfo.h"
#include "nsIDOMDocument.h"
#include "nsIDOMDOMImplementation.h"
#include "nsIDOMText.h"
#include "nsXFormsUtils.h"

/**
 * Implementation for XForms event context info.
 *
 */

NS_IMPL_ISUPPORTS1(nsXFormsContextInfo, nsIXFormsContextInfo)

nsXFormsContextInfo::nsXFormsContextInfo(nsIDOMElement *aElement)
 : mElement(aElement), mType(0)
{
  mNode = nsnull;
}

nsXFormsContextInfo::~nsXFormsContextInfo()
{
  if (mType == nsIXFormsContextInfo::NODESET_TYPE) {
    NS_IF_RELEASE(mNodeset);
  } else {
    // String, Number, and Node are all nodes.
    NS_IF_RELEASE(mNode);
  }
}

nsresult
nsXFormsContextInfo::SetName(nsAString &aName)
{
  mName = aName;
  return NS_OK;
}

NS_IMETHODIMP
nsXFormsContextInfo::GetName(nsAString &aResult)
{
  aResult = mName;
  return NS_OK;
}

NS_IMETHODIMP
nsXFormsContextInfo::GetType(PRInt32 *aType)
{
  *aType = mType;
  return NS_OK;
}

nsresult
nsXFormsContextInfo::SetStringValue(const char *aName, const nsAString &aString)
{
  // Store the string value of the context property as a node.
  SetNodeValueInternal(aName, aString);
  mType = nsIXFormsContextInfo::STRING_TYPE;
  return NS_OK;
}

NS_IMETHODIMP
nsXFormsContextInfo::GetStringValue(nsAString &aResult)
{
  aResult.Truncate();

  if (mType == nsIXFormsContextInfo::STRING_TYPE) {
    nsXFormsUtils::GetNodeValue(mNode, aResult);
  } else {
    NS_WARNING("GetStringValue: context type is not a string!");
  }
  return NS_OK;
}

nsresult
nsXFormsContextInfo::SetNumberValue(const char *aName, PRInt32 aNumber)
{
  // Convert the number to a string and store the (string)number
  // value of the context property as a node.
  nsAutoString numberStr;
  numberStr.AppendInt(aNumber);

  SetNodeValueInternal(aName, numberStr);
  mType = nsIXFormsContextInfo::NUMBER_TYPE;
  return NS_OK;
}

NS_IMETHODIMP
nsXFormsContextInfo::GetNumberValue(PRInt32 *aResult)
{
  *aResult = 0;

  if (mType == nsIXFormsContextInfo::NUMBER_TYPE) {
    nsAutoString numberStr;
    nsXFormsUtils::GetNodeValue(mNode, numberStr);

    PRInt32 errCode;
    *aResult = numberStr.ToInteger(&errCode);
    NS_ENSURE_TRUE(errCode == 0, NS_ERROR_FAILURE);
  } else {
    NS_WARNING("GetNumberValue: context type is not a number!");
  }

  return NS_OK;
}

nsresult
nsXFormsContextInfo::SetNodeValue(const char *aName, nsIDOMNode *aNode)
{
  // Set the name of the context property.
  nsAutoString name;
  name.AppendASCII(aName);
  SetName(name);

  // Set the node value of the context property.
  NS_IF_ADDREF(mNode = aNode);
  mType = nsIXFormsContextInfo::NODE_TYPE;
  return NS_OK;
}

NS_IMETHODIMP
nsXFormsContextInfo::GetNodeValue(nsIDOMNode **aResult)
{
  *aResult = nsnull;

  // String and number context types are stored as nodes, so
  // GetNodeValue can be used to get a string or number type
  // as a node.
  if (mType == nsIXFormsContextInfo::NODE_TYPE   ||
      mType == nsIXFormsContextInfo::STRING_TYPE ||
      mType == nsIXFormsContextInfo::NUMBER_TYPE) {
    NS_IF_ADDREF(*aResult = mNode);
  } else {
    NS_WARNING("GetNodeValue: context type is not a node, string, or number!");
  }
  return NS_OK;
}

nsresult
nsXFormsContextInfo::SetNodesetValue(const char *aName,
                                     nsIDOMXPathResult *aNodeset)
{
  // Set the name of the context property.
  nsAutoString name;
  name.AppendASCII(aName);
  SetName(name);

  // Set the nodeset value of the context property.
  NS_IF_ADDREF(mNodeset = aNodeset);
  mType = nsIXFormsContextInfo::NODESET_TYPE;
  return NS_OK;
}

NS_IMETHODIMP
nsXFormsContextInfo::GetNodesetValue(nsIDOMXPathResult **aResult)
{
  *aResult = nsnull;

  if (mType == nsIXFormsContextInfo::NODESET_TYPE) {
    NS_IF_ADDREF(*aResult = mNodeset);
  } else {
    NS_WARNING("GetNodesetValue: context type is not a nodeset!");
  }
  return NS_OK;
}

nsresult
nsXFormsContextInfo::SetNodeValueInternal(const char *aName,
                                          const nsAString &aValue)
{
  if (!mElement)
    return NS_ERROR_FAILURE;

  nsresult rv;

  nsCOMPtr<nsIDOMDocument> doc;
  rv = mElement->GetOwnerDocument(getter_AddRefs(doc));
  NS_ENSURE_SUCCESS(rv, rv);

  nsCOMPtr<nsIDOMDOMImplementation> domImpl;
  rv = doc->GetImplementation(getter_AddRefs(domImpl));
  NS_ENSURE_SUCCESS(rv, rv);

  nsCOMPtr<nsIDOMText> textNode;
  rv = doc->CreateTextNode(aValue, getter_AddRefs(textNode));
  NS_ENSURE_SUCCESS(rv, rv);

  SetNodeValue(aName, textNode);

  return NS_OK;
}
