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

#ifndef nsXFormsContextInfo_h_
#define nsXFormsContextInfo_h_

#include "nsCOMArray.h"
#include "nsCOMPtr.h"
#include "nsString.h"
#include "nsIDOMElement.h"
#include "nsIDOMNode.h"
#include "nsIDOMXPathResult.h"
#include "nsIXFormsContextInfo.h"

/**
 * Implementation for XForms Event Context Info.
 *
 */

class nsXFormsContextInfo : public nsIXFormsContextInfo
{
public:
  NS_DECL_ISUPPORTS
  NS_DECL_NSIXFORMSCONTEXTINFO

  nsXFormsContextInfo(nsIDOMElement *aElement);
  virtual ~nsXFormsContextInfo();

  /** Set the name of the context info property; eg. 'resource-uri'
   *
   * @param aName - property name
   */
  nsresult SetName(nsAString &aName);


  /** Set a string value for a context info property.
   *  String values are encapsulated in a text node because
   *  the XPath Event function can only work with nodes.
   *
   * @param aName   - name of the string property.
   * @param aString - string value.
   */
  nsresult SetStringValue(const char *aName, const nsAString &aString);

  /** Set a number value for a context info property.
   *  Number values are encapsulated in a text node because
   *  the XPath Event function can only work with nodes.
   *
   * @param aName   - name of the number property.
   * @param aNumber - number value.
   */
  nsresult SetNumberValue(const char *aName, PRInt32 aNumber);

  /** Set a node value for a context info property.
   *
   * @param aName - name of the node property.
   * @param aNode - node value.
   */
  nsresult SetNodeValue(const char *aName, nsIDOMNode *aNode);

  /** Set a nodeset value for a context info property.
   *
   * @param aName    - name of the nodeset property.
   * @param aNodeset - nodeset value.
   */
  nsresult SetNodesetValue(const char *aName, nsIDOMXPathResult *aNodeset);

private:
  /**
   *  Create a text node to encapsulate string and number context property
   *  types. The XPath Event function returns a txINodeset and only nodes
   *  can be added to the nodeset.
   *
   * @param aName - name of the node property.
   * @param aValue - value of the text node.
  */
  nsresult SetNodeValueInternal(const char *aName, const nsAString &aValue);

  // The element to which the context info refers.
  nsIDOMElement *mElement;
  // The name of the context info property.
  nsString mName;
  // The type of the context info property.
  PRInt32 mType;
  // The value of the context property.
  union {
    nsIDOMNode        *mNode;
    nsIDOMXPathResult *mNodeset;
  };
};

#endif
