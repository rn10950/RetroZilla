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
 *  Aaron Reed <aaronr@us.ibm.com>
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

#include "nsIServiceManager.h"
#include "nsXFormsUtilityService.h"
#include "nsXFormsUtils.h"
#include "nsIXTFElement.h"
#include "nsIDOMNode.h"
#include "nsIDOMElement.h"
#include "nsString.h"
#include "nsIDOMDocument.h"
#include "nsIXFormsModelElement.h"
#include "nsIDOMNodeList.h"
#include "nsIInstanceElementPrivate.h"
#include "nsIXFormsRepeatElement.h"
#include "nsISchemaValidator.h"
#include "nsISchemaDuration.h"
#include "nsXFormsSchemaValidator.h"
#include "prdtoa.h"
#include "prprf.h"
#include "nsIXFormsControl.h"
#include "nsIModelElementPrivate.h"
#include "nsIXFormsActionModuleElement.h"
#include "nsIXFormsContextInfo.h"
#include "prmem.h"
#include "plbase64.h"
#include "nsICryptoHash.h"

NS_IMPL_ISUPPORTS1(nsXFormsUtilityService, nsIXFormsUtilityService)

/* I don't know why Doron didn't put this in the .idl so that it could be added
 * to the generated .h file.  Put it here for now
 */
#define NS_SCHEMAVALIDATOR_CONTRACTID  "@mozilla.org/schemavalidator;1"


NS_IMETHODIMP
nsXFormsUtilityService::GetBuiltinTypeName(nsIDOMNode *aElement,
                                           nsAString& aName)
{
  nsCOMPtr<nsIDOMElement> element(do_QueryInterface(aElement));
  NS_ENSURE_TRUE(element, NS_ERROR_FAILURE);

  nsCOMPtr<nsIModelElementPrivate> model = nsXFormsUtils::GetModel(element);
  NS_ENSURE_TRUE(model, NS_ERROR_FAILURE);

  nsCOMPtr<nsIXFormsControl> control(do_QueryInterface(element));
  return model->GetBuiltinTypeNameForControl(control, aName);
}

NS_IMETHODIMP
nsXFormsUtilityService::GetModelFromNode(nsIDOMNode *aNode, 
                                         nsIDOMNode **aModel)
{
  nsCOMPtr<nsIDOMElement> element = do_QueryInterface(aNode);
  NS_ASSERTION(aModel, "no return buffer, we'll crash soon");
  *aModel = nsnull;

  nsAutoString namespaceURI;
  aNode->GetNamespaceURI(namespaceURI);

  // If the node is in the XForms namespace and XTF based, then it should
  //   be able to be handled by GetModel.  Otherwise it is probably an instance
  //   node in a instance document.
  if (!namespaceURI.EqualsLiteral(NS_NAMESPACE_XFORMS)) {
    return NS_ERROR_FAILURE;
  }

  nsCOMPtr<nsIModelElementPrivate> modelPriv = nsXFormsUtils::GetModel(element);
  nsCOMPtr<nsIDOMNode> modelElement = do_QueryInterface(modelPriv);
  if( modelElement ) {
    NS_IF_ADDREF(*aModel = modelElement);
  }

  // No model found
  NS_ENSURE_TRUE(*aModel, NS_ERROR_FAILURE);

  return NS_OK;
}


/**
 * Function to see if the given node is associated with the given model.
 * Right now this function is only called by XPath in the case of the
 * instance() function.
 * The provided node can be an instance node from an instance
 * document and thus be associated to the model in that way (model elements
 * contain instance elements).  Otherwise the node will be an XForms element
 * that was used as the context node of the XPath expression (i.e the
 * XForms control has an attribute that contains an XPath expression).
 * Form controls are associated with model elements either explicitly through
 * single-node binding or implicitly (if model cannot by calculated, it
 * will use the first model element encountered in the document).  The model
 * can also be inherited from a containing element like xforms:group or
 * xforms:repeat.
 */
NS_IMETHODIMP
nsXFormsUtilityService::IsNodeAssocWithModel( nsIDOMNode *aNode, 
                                              nsIDOMNode *aModel,
                                              PRBool     *aModelAssocWithNode)
{

  // Determine if the given model contains this instance document.
  nsCOMPtr<nsIDOMNode> modelNode, instNode;
  nsresult rv =
    nsXFormsUtils::GetInstanceNodeForData(aNode, getter_AddRefs(instNode));
  if (NS_SUCCEEDED(rv) && instNode) {
    instNode->GetParentNode(getter_AddRefs(modelNode));
  }

  *aModelAssocWithNode = modelNode && (modelNode == aModel);
  return NS_OK;
}

NS_IMETHODIMP
nsXFormsUtilityService::GetInstanceDocumentRoot(const      nsAString& aID,
                                                nsIDOMNode *aModelNode,
                                                nsIDOMNode **aInstanceRoot)
{
  nsresult rv = NS_ERROR_FAILURE;
  NS_ASSERTION(aInstanceRoot, "no return buffer, we'll crash soon");
  *aInstanceRoot = nsnull;

  if (aID.IsEmpty()) {
    return rv;
  }

  nsCOMPtr<nsIXFormsModelElement> modelElement = do_QueryInterface(aModelNode);
  nsCOMPtr<nsIDOMDocument> doc;
  rv = modelElement->GetInstanceDocument(aID, getter_AddRefs(doc));
  NS_ENSURE_SUCCESS(rv, rv);
  
  nsCOMPtr<nsIDOMElement> element;
  rv = doc->GetDocumentElement(getter_AddRefs(element));
  NS_ENSURE_SUCCESS(rv, rv);

  if (element) {
    NS_IF_ADDREF(*aInstanceRoot = element);
  }

  return rv;
}

/* Gotta do this via the service since we don't want transformiix to require
 * any of the new extensions, like schema-validation
 */
NS_IMETHODIMP 
nsXFormsUtilityService::ValidateString(const nsAString & aValue, 
                                       const nsAString & aType, 
                                       const nsAString & aNamespace,
                                       PRBool *aResult)
{

  NS_ASSERTION(aResult, "no return buffer for result so we'll crash soon");
  *aResult = PR_FALSE;

  nsXFormsSchemaValidator *validator = new nsXFormsSchemaValidator();
  if (validator) {
    *aResult = validator->ValidateString(aValue, aType, aNamespace);
    delete validator;
  }
  return *aResult ? NS_OK : NS_ERROR_FAILURE;
}

NS_IMETHODIMP
nsXFormsUtilityService::GetRepeatIndexById(nsIDOMNode *aResolverNode,
                                           const nsAString &aId,
                                           PRInt32         *aIndex)
{
  NS_ENSURE_ARG_POINTER(aIndex);

  nsCOMPtr<nsIDOMElement> resolverElement(do_QueryInterface(aResolverNode));
  NS_ENSURE_STATE(resolverElement);

  nsCOMPtr<nsIDOMElement> element;
  nsXFormsUtils::GetElementByContextId(resolverElement, aId,
                                       getter_AddRefs(element));

  nsCOMPtr<nsIDOMNode> node(do_QueryInterface(element));

  nsCOMPtr<nsIXFormsRepeatElement> repeat = do_QueryInterface(node);
  if (!repeat) {
    // if aRepeat isn't a repeat element, then setting aIndex to -1 to tell
    // XPath to return NaN.  Per 7.8.5 in the spec (1.0, 2nd edition)
    *aIndex = -1;
    return NS_OK;
  }

  PRUint32 retIndex = 0;
  nsresult rv = repeat->GetIndex(&retIndex);
  NS_ENSURE_SUCCESS(rv, rv);
  *aIndex = retIndex;

  return NS_OK;
}

NS_IMETHODIMP
nsXFormsUtilityService::GetMonths(const nsAString & aValue, 
                                  PRInt32         * aMonths)
{
  NS_ASSERTION(aMonths, "no return buffer for months, we'll crash soon");

  *aMonths = 0;
  nsCOMPtr<nsISchemaDuration> duration;
  nsCOMPtr<nsISchemaValidator> schemaValidator = 
    do_CreateInstance(NS_SCHEMAVALIDATOR_CONTRACTID);
  NS_ENSURE_TRUE(schemaValidator, NS_ERROR_FAILURE);

  nsresult rv = schemaValidator->ValidateBuiltinTypeDuration(aValue, 
                                                    getter_AddRefs(duration));
  NS_ENSURE_SUCCESS(rv, rv);

  PRInt32 sumMonths;
  PRUint32 years;
  PRUint32 months;

  duration->GetYears(&years);
  duration->GetMonths(&months);

  sumMonths = months + years*12;
  PRBool negative;
  duration->GetNegative(&negative);
  if (negative) {
    // according to the spec, "the sign of the result will match the sign
    // of the duration"
    sumMonths *= -1;
  }
  
  *aMonths = sumMonths;

  return NS_OK;
}

NS_IMETHODIMP
nsXFormsUtilityService::GetSeconds(const nsAString & aValue, 
                                   double          * aSeconds)
{
  nsCOMPtr<nsISchemaDuration> duration;
  nsCOMPtr<nsISchemaValidator> schemaValidator = 
    do_CreateInstance(NS_SCHEMAVALIDATOR_CONTRACTID);
  NS_ENSURE_TRUE(schemaValidator, NS_ERROR_FAILURE);

  nsresult rv = schemaValidator->ValidateBuiltinTypeDuration(aValue, 
                                                    getter_AddRefs(duration));
  NS_ENSURE_SUCCESS(rv, rv);
  double sumSeconds;
  PRUint32 days;
  PRUint32 hours;
  PRUint32 minutes;
  PRUint32 seconds;
  double fractSecs;

  duration->GetDays(&days);
  duration->GetHours(&hours);
  duration->GetMinutes(&minutes);
  duration->GetSeconds(&seconds);
  duration->GetFractionSeconds(&fractSecs);

  sumSeconds = seconds + minutes*60 + hours*3600 + days*24*3600 + fractSecs;

  PRBool negative;
  duration->GetNegative(&negative);
  if (negative) {
    // according to the spec, "the sign of the result will match the sign
    // of the duration"
    sumSeconds *= -1;
  }

  *aSeconds = sumSeconds;
  return NS_OK;
}

NS_IMETHODIMP
nsXFormsUtilityService::GetSecondsFromDateTime(const nsAString & aValue, 
                                               double          * aSeconds)
{
  PRTime dateTime;
  nsCOMPtr<nsISchemaValidator> schemaValidator = 
    do_CreateInstance(NS_SCHEMAVALIDATOR_CONTRACTID);
  NS_ENSURE_TRUE(schemaValidator, NS_ERROR_FAILURE);

  nsresult rv = schemaValidator->ValidateBuiltinTypeDateTime(aValue, &dateTime); 
  NS_ENSURE_SUCCESS(rv, rv);
                                               
  PRTime secs64 = dateTime, remain64;
  PRInt64 usecPerSec;
  PRInt32 secs32, remain32;

  // convert from PRTime (microseconds from epoch) to seconds.
  LL_I2L(usecPerSec, PR_USEC_PER_SEC);
  LL_MOD(remain64, secs64, usecPerSec);   /* remainder after conversion */
  LL_DIV(secs64, secs64, usecPerSec);     /* Conversion in whole seconds */

  // convert whole seconds and remainder to PRInt32
  LL_L2I(secs32, secs64);
  LL_L2I(remain32, remain64);

  // ready the result to send back to transformiix land now in case there are
  // no fractional seconds or we end up having a problem parsing them out.  If
  // we do, we'll just ignore the fractional seconds.
  double totalSeconds = secs32;
  *aSeconds = totalSeconds;

  // We're not getting fractional seconds back in the PRTime we get from
  // the schemaValidator.  We'll have to figure out the fractions from
  // the original value.  Since ValidateBuiltinTypeDateTime returned
  // successful for us to get this far, we know that the value is in
  // the proper format.
  int findFractionalSeconds = aValue.FindChar('.');
  if (findFractionalSeconds < 0) {
    // no fractions of seconds, so we are good to go as we are
    return NS_OK;
  }

  const nsAString& fraction = Substring(aValue, findFractionalSeconds+1, 
                                        aValue.Length());

  PRBool done = PR_FALSE;
  PRUnichar currentChar;
  nsCAutoString fractionResult;
  nsAString::const_iterator start, end, buffStart;
  fraction.BeginReading(start);
  fraction.BeginReading(buffStart);
  fraction.EndReading(end);

  while ((start != end) && !done) {
    currentChar = *start++;

    // Time is usually terminated with Z or followed by a time zone
    // (i.e. -05:00).  Time can also be terminated by the end of the string, so
    // test for that as well.  All of this specified at:
    // http://www.w3.org/TR/xmlschema-2/#dateTime
    if ((currentChar == 'Z') || (currentChar == '+') || (currentChar == '-') ||
        (start == end)) {
      fractionResult.AssignLiteral("0.");
      AppendUTF16toUTF8(Substring(buffStart.get(), start.get()-1), 
                        fractionResult);
    } else if ((currentChar > '9') || (currentChar < '0')) {
      // has to be a numerical character or else abort.  This should have been
      // caught by the schemavalidator, but it is worth double checking.
      done = PR_TRUE;
    }
  }

  if (fractionResult.IsEmpty()) {
    // couldn't successfully parse the fractional seconds, so we'll just return
    // without them.
    return NS_OK;
  }

  // convert the result string that we have to a double and add it to the total
  totalSeconds += PR_strtod(fractionResult.get(), nsnull);
  *aSeconds = totalSeconds;

  return NS_OK;
}

NS_IMETHODIMP
nsXFormsUtilityService::GetDaysFromDateTime(const nsAString & aValue,
                                            PRInt32         * aDays)
{
  NS_ASSERTION(aDays, "no return buffer for days, we'll crash soon");
  *aDays = 0;

  PRTime date;
  nsCOMPtr<nsISchemaValidator> schemaValidator =
    do_CreateInstance(NS_SCHEMAVALIDATOR_CONTRACTID);
  NS_ENSURE_TRUE(schemaValidator, NS_ERROR_FAILURE);

  // aValue could be a xsd:date or a xsd:dateTime.  If it is a xsd:dateTime,
  // there will be a 'T' separating the date portion of the string from the time
  // portion http://www.w3.org/TR/xmlschema-2/#dateTime
  PRInt32 timeSeparator = aValue.FindChar('T');

  nsresult rv;
  if (timeSeparator >= 0) {
    rv = schemaValidator->ValidateBuiltinTypeDateTime(aValue, &date);
  } else {
    rv = schemaValidator->ValidateBuiltinTypeDate(aValue, &date);
  }
  NS_ENSURE_SUCCESS(rv, rv);

  PRTime secs64 = date;
  PRInt64 usecPerSec;
  PRInt32 secs32;

  // convert from PRTime (microseconds from epoch) to seconds.  Shouldn't
  // have to worry about remainders since input is a date.  Smallest value
  // is in whole days.
  LL_I2L(usecPerSec, PR_USEC_PER_SEC);
  LL_DIV(secs64, secs64, usecPerSec);

  // convert whole seconds to PRInt32
  LL_L2I(secs32, secs64);

  // If aValue was a dateTime, "Hour, minute, and second components are ignored
  // after normalization" according to 7.10.2 in the spec.  So according to spec
  // we should strip off the fraction of a day after normalizing and before
  // figuring out its distance from the epoch.  But secs32 already has been
  // normalized and contains the distance from the epoch.  So now we might have
  // to alter aDays to account for the fact that we didn't remove any fraction
  // before.  For example, if aValue is 1970-01-02T12:00:00, then this is
  // 1.5 days after the epoch.  But if we removed the fraction before the
  // calculation we'd have 1970-01-02, which is 1 day from the epoch.  So
  // GetDaysFromDateTime would return 1.  So we see that if aValue is on or
  // after the epoch, we can ignore the remainder.  However, if aValue is
  // 1969-12-31T12:00:00, this would be -0.5 days from the epoch.  Applying
  // the spec rule of dropping the fractional day, we would be calculating
  // using 1969-12-31 which would give us -1 days from the epoch (negative
  // because it is before the epoch).  So we can't simply ignore the remainder.
  // If we have a negative value with a remainder, we need to round down to
  // the next whole day value.  So that is what we will do below.

  // Convert seconds to days.  86400 seconds in a day.
  *aDays = secs32/86400;

  // Apply the rule from above to simulate having removed the fractional day
  // prior to calculating the distance from the epoch.  If secs32 is negative
  // then if there was a fraction of a day, round down a day.
  if (secs32 < 0) {
    PRInt32 remainder = secs32%86400;
    if (remainder) {
      --*aDays;
    }
  }


  return NS_OK;
}


/* static */ nsresult
nsXFormsUtilityService::GetTime(nsAString & aResult, PRBool aUTC)
{
    PRExplodedTime time;
    char ctime[60];

    PR_ExplodeTime(PR_Now(),
                   aUTC ? PR_GMTParameters : PR_LocalTimeParameters, &time);

    PR_FormatTime(ctime, sizeof(ctime), "%Y-%m-%dT%H:%M:%S\0", &time);

    aResult.Assign(NS_ConvertASCIItoUTF16(ctime));

    if (aUTC) {
      aResult.AppendLiteral("Z");
      return NS_OK;
    }

    int gmtoffsethour = time.tm_params.tp_gmt_offset < 0 ?
                        -1*time.tm_params.tp_gmt_offset / 3600 :
                        time.tm_params.tp_gmt_offset / 3600;
    int remainder = time.tm_params.tp_gmt_offset%3600;
    int gmtoffsetminute = remainder ? remainder/60 : 00;
  
    char zone_location[40];
    const int zoneBufSize = sizeof(zone_location);
    PR_snprintf(zone_location, zoneBufSize, "%c%02d:%02d\0",
                time.tm_params.tp_gmt_offset < 0 ? '-' : '+',
                gmtoffsethour, gmtoffsetminute);

    aResult.Append(NS_ConvertASCIItoUTF16(zone_location));

    return NS_OK;
}


NS_IMETHODIMP
nsXFormsUtilityService::GetEventContextInfo(const nsAString & aContextName,
                                       nsIDOMNode           * aNode,
                                       nsCOMArray<nsIDOMNode> *aResult)
{
  nsresult rv;

  nsCOMPtr<nsIXFormsContextInfo> contextInfo;
  nsCOMPtr<nsIXFormsActionModuleElement> actionElt(do_QueryInterface(aNode));
  if (!actionElt)
    return NS_OK;

  nsCOMPtr<nsIDOMEvent> domEvent;
  actionElt->GetCurrentEvent(getter_AddRefs(domEvent));
  nsCOMPtr<nsIXFormsDOMEvent> xfEvent(do_QueryInterface(domEvent));
  if (!xfEvent) {
    // Event being called for an nsIDOMEvent that is not an
    // nsIXFormsDOMEvent.
    return NS_OK;
  }
  xfEvent->GetContextInfo(aContextName, getter_AddRefs(contextInfo));
  if (!contextInfo) {
    // The requested context info property does not exist.
    return NS_OK;
  }

  // Determine the type of context info property.
  PRInt32 resultType;
  contextInfo->GetType(&resultType);

  if (resultType == nsIXFormsContextInfo::NODESET_TYPE) {
    // The context property is a nodeset. Snapshot each individual node
    // in the nodeset and add them one at a time to the context info array.
    nsCOMPtr<nsIDOMXPathResult> nodeset;
    contextInfo->GetNodesetValue(getter_AddRefs(nodeset));
    if (nodeset) {
      PRUint32 nodesetSize;
      rv = nodeset->GetSnapshotLength(&nodesetSize);
      NS_ENSURE_SUCCESS(rv, rv);
      for (PRUint32 i=0; i < nodesetSize; ++i) {
        nsCOMPtr<nsIDOMNode> node;
        nodeset->SnapshotItem(i, getter_AddRefs(node));
        aResult->AppendObject(node);
      }
    }
  } else {
    // The type is a dom node, string, or number. Strings and numbers
    // are encapsulated in a text node.
    nsCOMPtr<nsIDOMNode> node;
    contextInfo->GetNodeValue(getter_AddRefs(node));
    if (node) {
      aResult->AppendObject(node);
    }
#ifdef DEBUG
    PRInt32 type;
    contextInfo->GetType(&type);
    if (type == nsXFormsContextInfo::STRING_TYPE) {
      nsAutoString str;
      contextInfo->GetStringValue(str);
    } else if (type == nsXFormsContextInfo::NUMBER_TYPE) {
      PRInt32 number;
      contextInfo->GetNumberValue(&number);
    }
#endif
  }

  return NS_OK;
}

NS_IMETHODIMP
nsXFormsUtilityService::Context(nsIDOMNode  *aResolverNode,
                                nsIDOMNode **aResult)
{

  nsCOMPtr<nsIDOMNode> contextNode;
  PRUint32 contextNodesetSize = 0;
  PRInt32 contextPosition;
  nsCOMPtr<nsIModelElementPrivate> model;
  nsCOMPtr<nsIDOMElement> bindElement;
  nsCOMPtr<nsIXFormsControl> parentControl;
  PRBool outerBind;

  nsCOMPtr<nsIDOMElement> element(do_QueryInterface(aResolverNode));
  if (!element) {
    contextNode.swap(*aResult);
    return NS_OK;
  }

  nsresult rv =
    nsXFormsUtils::GetNodeContext(element,
                                  nsXFormsUtils::ELEMENT_WITH_MODEL_ATTR,
                                  getter_AddRefs(model),
                                  getter_AddRefs(bindElement),
                                  &outerBind,
                                  getter_AddRefs(parentControl),
                                  getter_AddRefs(contextNode),
                                  &contextPosition,
                                  (PRInt32*)&contextNodesetSize,
                                  PR_FALSE);

  NS_ENSURE_SUCCESS(rv, rv);

  contextNode.swap(*aResult);

  return NS_OK;
}

NS_IMETHODIMP
nsXFormsUtilityService::IsCardNumber(const nsAString& aNumber, PRBool *aResult)
{
  nsAutoString number(aNumber);

  nsXFormsSchemaValidator validator;
  if (!validator.ValidateString(number,
                                NS_LITERAL_STRING("card-number"),
                                NS_LITERAL_STRING(NS_NAMESPACE_XFORMS))) {
    *aResult = PR_FALSE;
    return NS_OK;
  }

  // Now check if the card number is a valid Luhn number.
  PRInt32 sum = 0;
  PRBool alt = false;
  for (PRInt32 i = number.Length() - 1; i >= 0; --i) {
    PRUnichar currentChar = number.CharAt(i);
    PRInt32 digit = abs(currentChar - '0');

    if (alt) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }
    sum += digit;
    alt = !alt;
  }

  *aResult = (sum % 10 == 0);

  return NS_OK;
}

NS_IMETHODIMP
nsXFormsUtilityService::Digest(const nsAString &aData,
                               const nsAString &aAlgorithm,
                               const nsAString &aEncoding, 
                               nsIDOMNode *aResolverNode,
                               nsAString &aResult)
{
  aResult.Truncate();

  PRBool throwException = PR_FALSE;
  
  // Determine the hash algorithm to use.
  PRUint32 hashAlg = 0;

  if (aAlgorithm.EqualsLiteral("MD5")) {
    hashAlg = nsICryptoHash::MD5;
  } else if (aAlgorithm.EqualsLiteral("SHA-1")) {
    hashAlg = nsICryptoHash::SHA1;
  } else if (aAlgorithm.EqualsLiteral("SHA-256")) {
    hashAlg = nsICryptoHash::SHA256;
  } else if (aAlgorithm.EqualsLiteral("SHA-384")) {
    hashAlg = nsICryptoHash::SHA384;
  } else if (aAlgorithm.EqualsLiteral("SHA-512")) {
    hashAlg = nsICryptoHash::SHA512;
  } else {
    // Throw exception.
    throwException = PR_TRUE;
  }

  if (!throwException) {
    // Perform the hash.
    nsresult rv;
  
    nsCOMPtr<nsICryptoHash> hash =
      do_CreateInstance("@mozilla.org/security/hash;1", &rv);
    NS_ENSURE_SUCCESS(rv, rv);
  
    rv = hash->Init(hashAlg);
    NS_ENSURE_SUCCESS(rv, rv);
  
    nsCAutoString data = NS_LossyConvertUTF16toASCII(aData);
    rv = hash->Update(reinterpret_cast<const PRUint8*>(data.get()),
                      data.Length());
    NS_ENSURE_SUCCESS(rv, rv);
 
    // PR_FALSE means return the raw binary data.
    nsCAutoString result;
    rv = hash->Finish(PR_FALSE, result);
    NS_ENSURE_SUCCESS(rv, rv);

    // Encode the result.
    if (aEncoding.IsEmpty() || aEncoding.EqualsLiteral("base64")) {
      char *buffer = PL_Base64Encode((char *)result.get(),
                                     result.Length(), nsnull);
      if (buffer) {
        aResult = ToNewUnicode(NS_ConvertASCIItoUTF16(buffer));
        PR_Free(buffer);
      }
    } else if (aEncoding.EqualsLiteral("hex")) {
      PRUint32 length = result.Length() * 2 + 1;
      PRUnichar *hexBuffer =
        NS_STATIC_CAST(PRUnichar*, nsMemory::Alloc(length * sizeof(PRUnichar)));
      NS_ENSURE_TRUE(hexBuffer, NS_ERROR_OUT_OF_MEMORY);
      nsXFormsUtils::BinaryToHex(result.get(), result.Length(), &hexBuffer);
      hexBuffer [result.Length() * 2] = 0;

      nsAutoString hexResult(hexBuffer);
      nsCAutoString hexLower = NS_LossyConvertUTF16toASCII(hexResult);
      ToLowerCase(hexLower);
      aResult = NS_ConvertASCIItoUTF16(hexLower);

      nsMemory::Free(hexBuffer);
    } else {
      // Throw exception.
      throwException = PR_TRUE;
    }
  }

  if (throwException) {
    // If the digest function appears in a computed expression (An XPath
    // expression used by model item properties such as relevant and
    // calculate to include dynamic functionality in XForms), an
    // xforms-compute-exception occurs. If the digest function appears
    // in any other attribute that contains an XPath function, an
    // xforms-binding-exception occurs.
    nsXFormsEvent event = eEvent_BindingException;
    nsAutoString localName, namespaceURI;
    aResolverNode->GetLocalName(localName);
    if (localName.EqualsLiteral("bind")) {
      aResolverNode->GetNamespaceURI(namespaceURI);
      if (namespaceURI.EqualsLiteral(NS_NAMESPACE_XFORMS)) {
        event = eEvent_ComputeException;
      }
    }

    // Dispatch the event.
    nsCOMPtr<nsIDOMElement> resolverElement = do_QueryInterface(aResolverNode);
    nsCOMPtr<nsIModelElementPrivate> modelPriv =
      nsXFormsUtils::GetModel(resolverElement);
    nsCOMPtr<nsIDOMNode> model = do_QueryInterface(modelPriv);
    nsXFormsUtils::DispatchEvent(model, event, nsnull, resolverElement,
                                 nsnull);
    return NS_ERROR_FAILURE;
  }

  return NS_OK;
}

NS_IMETHODIMP
nsXFormsUtilityService::AdjustDateTimeToTimezone(const nsAString &aDateTime,
                                                 nsAString &aResult)
{
  // We have three cases to deal with:
  //
  // 1. aDateTime does not include a timezone indicator: 2007-10-07T02:22:00
  //    The schema validator will return a PRTime that was calculated using
  //    PR_LocalTimeParameters and that PRTime value formatted as an
  //    xsd:dateTime is the same 2007-10-07T02:22:00 that was passed in.
  //    We just need to append the local time zone.
  //
  // 2. aDateTime is a UTC (aka GMT) time: 2007-10-07T21:26:43Z
  //    The schema validator will treat aDateTime as GMT and return that as a
  //    PRTime. We convert the GMT time to a time in the local time zone and
  //    append the local time zone.
  //
  // 3. aDateTime includes a time zone component: 2007-10-07T02:22:00-07:00
  //    The schema validator checks if the time zone component is valid, but
  //    does not use it when calculating the PRTime value so this case is
  //    similar to case 1 except that we have to add the given time zone
  //    offset (to get the GMT time of the input aDateTime), convert the GMT
  //    time to the local time zone, and append the local time zone.
  aResult.Truncate();

  nsCOMPtr<nsISchemaValidator> schemaValidator =
    do_CreateInstance("@mozilla.org/schemavalidator;1");
  NS_ENSURE_TRUE(schemaValidator, NS_ERROR_FAILURE);

  PRTime t_dateTime;
  nsresult rv = schemaValidator->ValidateBuiltinTypeDateTime(aDateTime,
                                                             &t_dateTime);

  if (NS_FAILED(rv)) {
    return NS_OK;
  }

  // The dateTime is valid, so get the timeZone information. If there is time
  // zone information we are dealing with case 3 and have a bit more work to
  // do to convert aDateTime to the local time zone.
  nsAutoString timeString, timeZoneString;
  PRInt32 timeSeparator = aDateTime.FindChar(PRUnichar('T'));
  timeString.Append(Substring(aDateTime,
                              timeSeparator + 1,
                              aDateTime.Length() - timeSeparator));
  nsXFormsUtils::GetTimeZone(timeString, timeZoneString);

  PRExplodedTime time;
  char ctime[60];

  if (!timeZoneString.IsEmpty()) {
    // The time zone string will be of the form ('+' | '-') hh ':' mm
    // For example: +05:00, -07:00
    nsAutoString hoursString, minutesString;
    hoursString.Append(Substring(timeZoneString, 1, 2));
    minutesString.Append(Substring(timeZoneString, 4, 2));

    PRInt32 errCode;
    PRInt32 hours = hoursString.ToInteger(&errCode);
    NS_ENSURE_TRUE(errCode == 0, NS_ERROR_FAILURE);
    PRInt32 minutes = minutesString.ToInteger(&errCode);
    NS_ENSURE_TRUE(errCode == 0, NS_ERROR_FAILURE);
    PRInt32 tzSecs = (hours * 3600) + (minutes * 60);

    if (timeZoneString.CharAt(0) == '+') {
      // The time zone is relative to GMT so if it is positive, we need to
      // subtract the total number of seconds represented by the time zone;
      // likewise, we add if the time zone is negative.
      tzSecs *= -1;
    }

    PR_ExplodeTime(t_dateTime, PR_LocalTimeParameters, &time);
    // Zero out the gmt and dst information because we don't want
    // PR_NormalizeTime to use the local time zone to get back to
    // GMT before it normalizes (because it would calculate the GMT
    // time relative to the time zone that was part of the input dateTime).
    time.tm_params.tp_gmt_offset = 0;
    time.tm_params.tp_dst_offset = 0;
    // Adjust the total seconds.
    time.tm_sec += tzSecs;
    // Normalize the fields and apply the local time parameters to convert
    // the time to the local time zone.
    PR_NormalizeTime(&time, PR_LocalTimeParameters);
    PR_FormatTime(ctime, sizeof(ctime), "%Y-%m-%dT%H:%M:%S\0", &time);

  } else {
    // This is either a GMT time or no time zone information is available.
    PR_ExplodeTime(t_dateTime, PR_LocalTimeParameters, &time);
    PR_FormatTime(ctime, sizeof(ctime), "%Y-%m-%dT%H:%M:%S\0", &time);
  }

  // Calculate local time zone to append to the result.
  int gmtoffsethour = time.tm_params.tp_gmt_offset / 3600;
  int remainder = time.tm_params.tp_gmt_offset % 3600;
  int gmtoffsetminute = remainder ? remainder / 60 : 0;
  // adjust gmtoffsethour for daylight savings time.
  int dstoffset = time.tm_params.tp_dst_offset / 3600;
  gmtoffsethour += dstoffset;
  if (gmtoffsethour < 0) {
    // Make the gmtoffsethour positive; we'll add the plus or minus
    // to the time zone string.
    gmtoffsethour *= -1;
  }
  
  char zone_location[40];
  const int zoneBufSize = sizeof(zone_location);
  PR_snprintf(zone_location, zoneBufSize, "%c%02d:%02d\0",
              time.tm_params.tp_gmt_offset < 0 ? '-' : '+',
              gmtoffsethour, gmtoffsetminute);

  aResult.AppendLiteral(ctime);
  aResult.Append(NS_ConvertASCIItoUTF16(zone_location));

  return NS_OK;
}
