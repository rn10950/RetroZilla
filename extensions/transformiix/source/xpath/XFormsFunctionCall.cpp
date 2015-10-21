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

/*
 * XFormsFunctionCall
 * A representation of the XPath NodeSet funtions
 */

#include "FunctionLib.h"
#include "nsAutoPtr.h"
#include "txNodeSet.h"
#include "txAtoms.h"
#include "txIXPathContext.h"
#include "txTokenizer.h"
#include "XFormsFunctions.h"
#include <math.h>
#include "nsIDOMDocument.h"
#include "nsIDOMDocumentEvent.h"
#include "nsIDOMEvent.h"
#include "nsIDOMEventTarget.h"
#include "nsIDOMElement.h"
#include "nsIXFormsUtilityService.h"
#include "nsServiceManagerUtils.h"  // needed for do_GetService?
#include "prprf.h"
#include "prrng.h"
#include <errno.h>
#include <stdlib.h>

/*
 * Creates a XFormsFunctionCall of the given type
 */
XFormsFunctionCall::XFormsFunctionCall(XFormsFunctions aType, nsIDOMNode *aNode)
    : mType(aType)
    , mNode(aNode)
{
}

/*
 * Evaluates this Expr based on the given context node and processor state
 * @param context the context node for evaluation of this Expr
 * @param ps the ContextState containing the stack information needed
 * for evaluation
 * @return the result of the evaluation
 */
nsresult
XFormsFunctionCall::evaluate(txIEvalContext* aContext, txAExprResult** aResult)
{
  *aResult = nsnull;
  nsresult rv = NS_OK;
  txListIterator iter(&params);

  switch (mType) {
    case AVG:
    {
      if (!requireParams(1, 1, aContext))
        return NS_ERROR_XPATH_BAD_ARGUMENT_COUNT;

      nsRefPtr<txNodeSet> nodes;
      nsresult rv = evaluateToNodeSet((Expr*)iter.next(), aContext,
                                      getter_AddRefs(nodes));
      NS_ENSURE_SUCCESS(rv, rv);
   
      double res = 0;
      PRInt32 i;
      for (i = 0; i < nodes->size(); ++i) {
        nsAutoString resultStr;
        txXPathNodeUtils::appendNodeValue(nodes->get(i), resultStr);
        res += Double::toDouble(resultStr);
      }
   
      if (i > 0) {
        res = (res/i);
      }
      else {
        res = Double::NaN;
      }
      return aContext->recycler()->getNumberResult(res, aResult);
    }
    case BOOLEANFROMSTRING:
    {
      if (!requireParams(1, 1, aContext))
        return NS_ERROR_XPATH_BAD_ARGUMENT_COUNT;

      PRInt32 retvalue = -1;
      nsAutoString booleanValue;
      evaluateToString((Expr*)iter.next(), aContext, booleanValue);

      aContext->recycler()->getBoolResult(
                                  booleanValue.EqualsLiteral("1") ||
                                  booleanValue.LowerCaseEqualsLiteral("true"), 
                                  aResult);

      return NS_OK;
    }
    case COUNTNONEMPTY:
    {
      if (!requireParams(1, 1, aContext))
        return NS_ERROR_XPATH_BAD_ARGUMENT_COUNT;

      nsRefPtr<txNodeSet> nodes;
      nsresult rv = evaluateToNodeSet((Expr*)iter.next(), aContext,
                                      getter_AddRefs(nodes));
      NS_ENSURE_SUCCESS(rv, rv);
   
      double res = 0, test = 0;
      PRInt32 i, count=0;
      for (i = 0; i < nodes->size(); ++i) {
        nsAutoString resultStr;
        txXPathNodeUtils::appendNodeValue(nodes->get(i), resultStr);
        if (!resultStr.IsEmpty()) {
          count++;
        }
      }
   
      return aContext->recycler()->getNumberResult(count, aResult);
    }
    case DAYSFROMDATE:
    {
      if (!requireParams(1, 1, aContext))
        return NS_ERROR_XPATH_BAD_ARGUMENT_COUNT;
   
      nsAutoString date;
      evaluateToString((Expr*)iter.next(), aContext, date);
   
      nsCOMPtr<nsIXFormsUtilityService>xformsService = 
            do_GetService("@mozilla.org/xforms-utility-service;1", &rv);
      NS_ENSURE_SUCCESS(rv, rv);

      PRInt32 result = 0;
      double res = Double::NaN;
      nsresult rv = xformsService->GetDaysFromDateTime(date, &result);
      if (NS_SUCCEEDED(rv)) {
        res = result;
      } 
      else if (rv != NS_ERROR_ILLEGAL_VALUE) {
        // if we failed for a reason other than the parameter value, pass that 
        // up the chain
        return rv;
      }

      return aContext->recycler()->getNumberResult(res, aResult);
    }
    case IF:
    {
      if (!requireParams(3, 3, aContext))
        return NS_ERROR_XPATH_BAD_ARGUMENT_COUNT;
   
      PRBool test;
      nsAutoString valueToReturn;
      test = evaluateToBoolean((Expr*)iter.next(), aContext);

      // grab 'true' value to return
      Expr *getvalue = (Expr*)iter.next();
   
      if (!test) {
        // grab 'false' value to return
        getvalue = (Expr*)iter.next();
      }
      evaluateToString(getvalue, aContext, valueToReturn);
   
      return aContext->recycler()->getStringResult(valueToReturn, aResult);
    }
    case INDEX:
    {
      // Given an element's id as the parameter, need to query the element and 
      //   make sure that it is a xforms:repeat node.  Given that, must query 
      //   its index.
      if (!requireParams(1, 1, aContext))
          return NS_ERROR_XPATH_BAD_ARGUMENT_COUNT;

      nsAutoString indexId;
      evaluateToString((Expr*)iter.next(), aContext, indexId);

      // now get the index value from the xforms:repeat.  Need to use the
      //   service to do this work so that we don't have dependencies in
      //   transformiix on XForms.
      nsCOMPtr<nsIXFormsUtilityService>xformsService =
            do_GetService("@mozilla.org/xforms-utility-service;1", &rv);
      NS_ENSURE_SUCCESS(rv, rv);

      PRInt32 index = 0;
      double res = Double::NaN;
      rv = xformsService->GetRepeatIndexById(mNode, indexId, &index);
      NS_ENSURE_SUCCESS(rv, rv);

      if (index >= 0) {
        // repeat's index is 1-based.  If it is 0, then that is still ok since
        // repeat's index can be 0 if uninitialized or if the nodeset that it
        // is bound to is empty (either initially or due to delete remove all
        // of the instance nodes).  If index == -1, then repeatEle isn't an
        // XForms repeat element, so we need to return NaN per spec.
        res = index;
      }

      return aContext->recycler()->getNumberResult(res, aResult);

    }
    case INSTANCE:
    {
      nsresult rv;
      if (!requireParams(1, 1, aContext))
        return NS_ERROR_XPATH_BAD_ARGUMENT_COUNT;
   
      nsRefPtr<txNodeSet> resultSet;
      rv = aContext->recycler()->getNodeSet(getter_AddRefs(resultSet));
      NS_ENSURE_SUCCESS(rv, rv);
   
      nsAutoString instanceId;
      evaluateToString((Expr*)iter.next(), aContext, instanceId);
   
      // here document is the XForms document
      nsCOMPtr<nsIDOMDocument> document;
      rv = mNode->GetOwnerDocument(getter_AddRefs(document));
      NS_ENSURE_SUCCESS(rv, rv);
      NS_ENSURE_TRUE(document, NS_ERROR_NULL_POINTER);
 
      nsCOMPtr<nsIDOMElement> instEle;
      rv = document->GetElementById(instanceId, getter_AddRefs(instEle));
 
      PRBool foundInstance = PR_FALSE;
      nsAutoString localname, namespaceURI;
      if (instEle) {
        instEle->GetLocalName(localname);
        instEle->GetNamespaceURI(namespaceURI);
        if (localname.EqualsLiteral("instance") && 
            namespaceURI.EqualsLiteral(NS_NAMESPACE_XFORMS)) {
          foundInstance = PR_TRUE;
        }
      }
 
      if (!foundInstance) {
        // We didn't find an instance element with the given id.  Return the
        //   empty result set.
        *aResult = resultSet;
        NS_ADDREF(*aResult);
    
        return NS_OK;
      }
 
      // Make sure that this element is contained in the same
      //   model as the context node of the expression as per
      //   the XForms 1.0 spec.
 
      // first step is to get the contextNode passed in to
      //   the evaluation
 
      nsCOMPtr<nsIDOMNode> xfContextNode;
      rv = txXPathNativeNode::getNode(aContext->getContextNode(), 
                                      getter_AddRefs(xfContextNode)); 
      NS_ENSURE_SUCCESS(rv, rv);
 
      // now see if the node we found (instEle) and the 
      //   context node for the evaluation (xfContextNode) link
      //   back to the same model. 
      nsCOMPtr<nsIXFormsUtilityService>xformsService = 
            do_GetService("@mozilla.org/xforms-utility-service;1", &rv);
      NS_ENSURE_SUCCESS(rv, rv);
 
      nsCOMPtr<nsIDOMNode> instNode, modelInstance;
      instNode = do_QueryInterface(instEle);
      rv = xformsService->GetModelFromNode(instNode, 
                                           getter_AddRefs(modelInstance)); 
                                 
      NS_ENSURE_SUCCESS(rv, rv);
 
      PRBool modelContainsNode = PR_FALSE;
      rv = xformsService->IsNodeAssocWithModel(xfContextNode, 
                                               modelInstance, 
                                               &modelContainsNode);
      NS_ENSURE_SUCCESS(rv, rv);
 
      if (modelContainsNode) {
        // ok, we've found an instance node with the proper id
        //   that fulfills the requirement of being from the
        //   same model as the context node.  Now we need to
        //   return a 'node-set containing just the root
        //   element node of the referenced instance data'.
        //   Wonderful.
 
        nsCOMPtr<nsIDOMNode> instanceRoot;
        rv = xformsService->GetInstanceDocumentRoot(
                              instanceId,
                              modelInstance,
                              getter_AddRefs(instanceRoot));
        NS_ENSURE_SUCCESS(rv, rv);
        if (instanceRoot) {
          nsAutoPtr<txXPathNode> txNode(txXPathNativeNode::createXPathNode(instanceRoot));
          if (txNode) {
            resultSet->add(*txNode);
          }
        }
      }
 
 
        // XXX where we need to do the work
       // if (walker.moveToElementById(instanceId)) {
       //     resultSet->add(walker.getCurrentPosition());
       // }
   
      *aResult = resultSet;
      NS_ADDREF(*aResult);
   
      return NS_OK;
    }
    case MAX:
    {
      if (!requireParams(1, 1, aContext))
        return NS_ERROR_XPATH_BAD_ARGUMENT_COUNT;

      nsRefPtr<txNodeSet> nodes;
      nsresult rv = evaluateToNodeSet((Expr*)iter.next(), aContext,
                                      getter_AddRefs(nodes));
      NS_ENSURE_SUCCESS(rv, rv);
   
      double res = Double::NaN;
      PRInt32 i;
      for (i = 0; i < nodes->size(); ++i) {
        double test;
        nsAutoString resultStr;
        txXPathNodeUtils::appendNodeValue(nodes->get(i), resultStr);
        test = Double::toDouble(resultStr);
        if (Double::isNaN(test)) {
          res = Double::NaN;
          break;
        }
        if (test > res || i == 0) {
          res = test;
        }
      }
   
      return aContext->recycler()->getNumberResult(res, aResult);
    }
    case MIN:
    {
      if (!requireParams(1, 1, aContext))
        return NS_ERROR_XPATH_BAD_ARGUMENT_COUNT;

      nsRefPtr<txNodeSet> nodes;
      nsresult rv = evaluateToNodeSet((Expr*)iter.next(), aContext,
                                      getter_AddRefs(nodes));
      NS_ENSURE_SUCCESS(rv, rv);
   
      double res = Double::NaN;
      PRInt32 i;
      for (i = 0; i < nodes->size(); ++i) {
        double test;
        nsAutoString resultStr;
        txXPathNodeUtils::appendNodeValue(nodes->get(i), resultStr);
        test = Double::toDouble(resultStr);
        if (Double::isNaN(test)) {
          res = Double::NaN;
          break;
        }
        if ((test < res) || (i==0)) {
          res = test;
        }
      }
   
      return aContext->recycler()->getNumberResult(res, aResult);
    }
    case MONTHS:
    {
      if (!requireParams(1, 1, aContext))
        return NS_ERROR_XPATH_BAD_ARGUMENT_COUNT;
   
      nsAutoString duration;
      evaluateToString((Expr*)iter.next(), aContext, duration);
   
      nsCOMPtr<nsIXFormsUtilityService>xformsService = 
            do_GetService("@mozilla.org/xforms-utility-service;1", &rv);
      NS_ENSURE_SUCCESS(rv, rv);

      PRInt32 result = 0;
      double res = Double::NaN;
      nsresult rv = xformsService->GetMonths(duration, &result);
      if (NS_SUCCEEDED(rv)) {
        res = result;
      } 
      else if (rv != NS_ERROR_ILLEGAL_VALUE) {
        // if we failed for a reason other than the parameter value, pass that 
        // up the chain
        return rv;
      }

      return aContext->recycler()->getNumberResult(res, aResult);
    }
    case NOW:
    {
      if (!requireParams(0, 0, aContext))
        return NS_ERROR_XPATH_BAD_ARGUMENT_COUNT;

      nsCOMPtr<nsIXFormsUtilityService>xformsService =
            do_GetService("@mozilla.org/xforms-utility-service;1", &rv);
      NS_ENSURE_SUCCESS(rv, rv);

      nsAutoString res;
      xformsService->GetTime(res, PR_TRUE);
   
      return aContext->recycler()->getStringResult(res, aResult);
    }
    case LOCALDATETIME:
    {
      if (!requireParams(0, 0, aContext))
        return NS_ERROR_XPATH_BAD_ARGUMENT_COUNT;

      nsCOMPtr<nsIXFormsUtilityService>xformsService =
            do_GetService("@mozilla.org/xforms-utility-service;1", &rv);
      NS_ENSURE_SUCCESS(rv, rv);

      nsAutoString res;
      xformsService->GetTime(res, PR_FALSE);
   
      return aContext->recycler()->getStringResult(res, aResult);
    }
    case LOCALDATE:
    {
      if (!requireParams(0, 0, aContext))
        return NS_ERROR_XPATH_BAD_ARGUMENT_COUNT;

      nsCOMPtr<nsIXFormsUtilityService>xformsService =
            do_GetService("@mozilla.org/xforms-utility-service;1", &rv);
      NS_ENSURE_SUCCESS(rv, rv);

      nsAutoString time, res;
      xformsService->GetTime(time, PR_FALSE);

      // since we know that the returned string will be in the format of
      // yyyy-mm-ddThh:mm:ss.ssszzzz, we just need to grab the first 10
      // characters to represent the date and then strip off the time zone
      // information from the end and append it to the string to get our answer
      res = Substring(time, 0, 10);
      PRInt32 timeSeparator = time.FindChar(PRUnichar('T'));
      if (timeSeparator == kNotFound) {
        // though this should probably never happen, if this is the case we
        // certainly don't have to worry about timezones.  Just return.
        return NS_ERROR_UNEXPECTED;
      }
  
      // Time zone information can be of the format '-hh:ss', '+hh:ss', or 'Z'
      // might be no time zone information at all.
      nsAutoString hms(Substring(time, timeSeparator+1, time.Length()));
      PRInt32 timeZoneSeparator = hms.FindChar(PRUnichar('-'));
      if (timeZoneSeparator == kNotFound) {
        timeZoneSeparator = hms.FindChar(PRUnichar('+'));
        if (timeZoneSeparator == kNotFound) {
          timeZoneSeparator = hms.FindChar(PRUnichar('Z'));
          if (timeZoneSeparator == kNotFound) {
            // no time zone information available
            return NS_ERROR_UNEXPECTED;
          }
        }
      }
  
      res.Append(Substring(hms, timeZoneSeparator, hms.Length()));
      return aContext->recycler()->getStringResult(res, aResult);
    }
    case PROPERTY:
    {
      if (!requireParams(1, 1, aContext))
        return NS_ERROR_XPATH_BAD_ARGUMENT_COUNT;
   
      nsAutoString property;
      evaluateToString((Expr*)iter.next(), aContext, property);
 
      // This function can handle "version" and "conformance-level"
      //   which is all that the XForms 1.0 spec is worried about
      if (property.Equals(NS_LITERAL_STRING("version")))
        property.Assign(NS_LITERAL_STRING("1.0"));
      else if (property.Equals(NS_LITERAL_STRING("conformance-level")))
        property.Assign(NS_LITERAL_STRING("basic"));
   
      return aContext->recycler()->getStringResult(property, aResult);
    }
    case SECONDS:
    {
      if (!requireParams(1, 1, aContext))
          return NS_ERROR_XPATH_BAD_ARGUMENT_COUNT;
   
      nsAutoString duration;
      evaluateToString((Expr*)iter.next(), aContext, duration);
   
      nsCOMPtr<nsIXFormsUtilityService>xformsService = 
            do_GetService("@mozilla.org/xforms-utility-service;1", &rv);
      NS_ENSURE_SUCCESS(rv, rv);

      double res;
      nsresult rv = xformsService->GetSeconds(duration, &res);
      if (NS_FAILED(rv)) {
        if (rv != NS_ERROR_ILLEGAL_VALUE) {
          // if we failed for a reason other than the parameter value, pass that 
          // up the chain
          return rv;
        }
        res = Double::NaN;
      }

      return aContext->recycler()->getNumberResult(res, aResult);
    }
    case SECONDSFROMDATETIME:
    {
      if (!requireParams(1, 1, aContext))
        return NS_ERROR_XPATH_BAD_ARGUMENT_COUNT;
   
      nsAutoString dateTime;
      evaluateToString((Expr*)iter.next(), aContext, dateTime);
   
      nsCOMPtr<nsIXFormsUtilityService>xformsService = 
            do_GetService("@mozilla.org/xforms-utility-service;1", &rv);
      NS_ENSURE_SUCCESS(rv, rv);

      double res;
      nsresult rv = xformsService->GetSecondsFromDateTime(dateTime, &res);
      if (NS_FAILED(rv)) {
        if (rv != NS_ERROR_ILLEGAL_VALUE) {
          // if we failed for a reason other than the parameter value, pass that 
          // up the chain
          return rv;
        }
        res = Double::NaN;
      }

      return aContext->recycler()->getNumberResult(res, aResult);
    }
    case CURRENT:
    {
      if (!requireParams(0, 0, aContext))
        return NS_ERROR_XPATH_BAD_ARGUMENT_COUNT;
   
      nsRefPtr<txNodeSet> resultSet;
      rv = aContext->recycler()->getNodeSet(getter_AddRefs(resultSet));
      NS_ENSURE_SUCCESS(rv, rv);

      // mNode will be the original context node that was used when the
      // expression was built.
      if (mNode) {
        nsAutoPtr<txXPathNode> txNode(txXPathNativeNode::createXPathNode(mNode));
        if (txNode) {
          resultSet->add(*txNode);
        }
      }

      *aResult = resultSet;
      NS_ADDREF(*aResult);

      return NS_OK;
    }
    case EVENT:
    {
      // The Event function returns a nodeset of context info associated with
      // an event.
      nsresult rv;
      if (!requireParams(1, 1, aContext))
        return NS_ERROR_XPATH_BAD_ARGUMENT_COUNT;

      nsRefPtr<txNodeSet> resultSet;
      rv = aContext->recycler()->getNodeSet(getter_AddRefs(resultSet));
      NS_ENSURE_SUCCESS(rv, rv);

      // Get the name of the context info property.
      nsAutoString contextName;
      evaluateToString((Expr*)iter.next(), aContext, contextName);

      nsCOMPtr<nsIXFormsUtilityService>xformsService =
            do_GetService("@mozilla.org/xforms-utility-service;1", &rv);
      NS_ENSURE_SUCCESS(rv, rv);

      // mNode is the node that contained the Event XPath expression.
      nsCOMArray<nsIDOMNode> contextInfo;
      rv = xformsService->GetEventContextInfo(contextName, mNode, &contextInfo);
      NS_ENSURE_SUCCESS(rv, rv);

      // Add each of the context info nodes to the resultSet.
      PRInt32 i;
      for (i = 0; i < contextInfo.Count(); ++i) {
        nsAutoPtr<txXPathNode> txNode(txXPathNativeNode::createXPathNode(contextInfo[i]));
        if (txNode) {
          resultSet->add(*txNode);
        }
      }

      *aResult = resultSet;
      NS_ADDREF(*aResult);

      return NS_OK;
    }
    case POWER:
    {
      if (!requireParams(2, 2, aContext))
        return NS_ERROR_XPATH_BAD_ARGUMENT_COUNT;

      double result = 0;
      double base = evaluateToNumber((Expr*)iter.next(), aContext);
      double exponent = evaluateToNumber((Expr*)iter.next(), aContext);

      // If base is negative and exponent is not an integral value, or if base
      // is zero and exponent is negative, a domain error occurs, setting the
      // global variable errno to the value EDOM.
      // If the result is too large (ERANGE), we consider the result to be kNaN.
      result = pow(base, exponent);
      if (errno == EDOM || errno == ERANGE) {
        result = Double::NaN;
      }

      return aContext->recycler()->getNumberResult(result, aResult);
    }
    case RANDOM:
    {
      if (!requireParams(0, 1, aContext))
        return NS_ERROR_XPATH_BAD_ARGUMENT_COUNT;

      PRBool useSeed = PR_FALSE;
      Expr *expr = (Expr*)iter.next();
      if (expr) {
        useSeed = evaluateToBoolean(expr, aContext);
      }

      if (useSeed) {
        // initialize random seed.
        PRUint32 seed = 0;
        PRSize rSize = PR_GetRandomNoise(&seed, sizeof(seed));
        if (rSize) {
          srand (seed);
        }
      }
      double result = (rand() / ((double)RAND_MAX + 1.0));

      return aContext->recycler()->getNumberResult(result, aResult);
    }
    case COMPARE:
    {
      if (!requireParams(2, 2, aContext))
        return NS_ERROR_XPATH_BAD_ARGUMENT_COUNT;

      nsAutoString string1, string2;
      evaluateToString((Expr*)iter.next(), aContext, string1);
      evaluateToString((Expr*)iter.next(), aContext, string2);

      // Using strcmp because Compare is not a member of nsAutoString.
      double result = 0;
      result = strcmp(NS_ConvertUTF16toUTF8(string1).get(),
                      NS_ConvertUTF16toUTF8(string2).get());

      return aContext->recycler()->getNumberResult(result, aResult);
    }
    case CONTEXT:
    {
      if (!requireParams(0, 0, aContext))
        return NS_ERROR_XPATH_BAD_ARGUMENT_COUNT;

      nsRefPtr<txNodeSet> resultSet;
      rv = aContext->recycler()->getNodeSet(getter_AddRefs(resultSet));
      NS_ENSURE_SUCCESS(rv, rv);

      nsCOMPtr<nsIXFormsUtilityService> xformsService =
            do_GetService("@mozilla.org/xforms-utility-service;1", &rv);
      NS_ENSURE_SUCCESS(rv, rv);

      // mNode will be the node that contained the context() function.
      nsCOMPtr<nsIDOMNode> contextNode;
      rv = xformsService->Context(mNode, getter_AddRefs(contextNode));

      if (contextNode) {
        nsAutoPtr<txXPathNode> txNode(txXPathNativeNode::createXPathNode(contextNode));
        if (txNode) {
          resultSet->add(*txNode);
        }
      }

      *aResult = resultSet;
      NS_ADDREF(*aResult);

      return NS_OK;
    }
    case DAYSTODATE:
    {
      if (!requireParams(1, 1, aContext))
        return NS_ERROR_XPATH_BAD_ARGUMENT_COUNT;

      double days = evaluateToNumber((Expr*)iter.next(), aContext);

      nsAutoString date;
      if (!Double::isNaN(days)) {
        // Round total number of days to the nearest whole number.
        PRTime t_days;
        LL_I2L(t_days, floor(days+0.5));

        PRTime t_secs, t_secs_per_day, t_usec, usec_per_sec;
        // Calculate total number of seconds in aDays.
        LL_I2L(t_secs_per_day, 86400UL);
        LL_MUL(t_secs, t_days, t_secs_per_day);
        // Convert total seconds to usecs.
        LL_I2L(usec_per_sec, PR_USEC_PER_SEC);
        LL_MUL(t_usec, t_secs, usec_per_sec);

        // Convert the time to xsd:date format.
        PRExplodedTime et;
        PR_ExplodeTime(t_usec, PR_GMTParameters, &et);
        char ctime[60];
        PR_FormatTime(ctime, sizeof(ctime), "%Y-%m-%d", &et);
        date.AppendASCII(ctime);
      }

      return aContext->recycler()->getStringResult(date, aResult);

      return NS_OK;
    }
    case SECONDSTODATETIME:
    {
      if (!requireParams(1, 1, aContext))
        return NS_ERROR_XPATH_BAD_ARGUMENT_COUNT;

      double seconds = evaluateToNumber((Expr*)iter.next(), aContext);

      nsAutoString dateTime;
      if (!Double::isNaN(seconds)) {
        // Round total number of seconds to the nearest whole number.
        PRTime t_secs;
        LL_I2L(t_secs, floor(seconds+0.5));

        // Convert total seconds to usecs.
        PRTime t_usec, usec_per_sec;
        LL_I2L(usec_per_sec, PR_USEC_PER_SEC);
        LL_MUL(t_usec, t_secs, usec_per_sec);

        // Convert the time to xsd:dateTime format.
        PRExplodedTime et;
        PR_ExplodeTime(t_usec, PR_GMTParameters, &et);
        char ctime[60];
        PR_FormatTime(ctime, sizeof(ctime), "%Y-%m-%dT%H:%M:%SZ", &et);
        dateTime.AppendASCII(ctime);
      }

      return aContext->recycler()->getStringResult(dateTime, aResult);
    }
    case ISCARDNUMBER:
    {
      if (!requireParams(1, 1, aContext))
        return NS_ERROR_XPATH_BAD_ARGUMENT_COUNT;

      nsAutoString number;
      evaluateToString((Expr*)iter.next(), aContext, number);

      nsCOMPtr<nsIXFormsUtilityService>xformsService =
            do_GetService("@mozilla.org/xforms-utility-service;1", &rv);
      NS_ENSURE_SUCCESS(rv, rv);

      PRBool result;
      rv = xformsService->IsCardNumber(number, &result);
      NS_ENSURE_SUCCESS(rv, rv);

      aContext->recycler()->getBoolResult(result, aResult);

      return NS_OK;
    }
    case DIGEST:
    {
      nsresult rv;
      if (!requireParams(2, 3, aContext))
        return NS_ERROR_XPATH_BAD_ARGUMENT_COUNT;

      nsAutoString data, algorithm, encoding;
      evaluateToString((Expr*)iter.next(), aContext, data);
      evaluateToString((Expr*)iter.next(), aContext, algorithm);
      evaluateToString((Expr*)iter.next(), aContext, encoding);

      nsCOMPtr<nsIXFormsUtilityService>xformsService =
            do_GetService("@mozilla.org/xforms-utility-service;1", &rv);
      NS_ENSURE_SUCCESS(rv, rv);

      // mNode is the node that contained the Event XPath expression.
      nsAutoString result;
      rv = xformsService->Digest(data, algorithm, encoding, mNode, result);
      if (NS_FAILED(rv)) {
        return rv;
      }

      return aContext->recycler()->getStringResult(result, aResult);
    }
    case ADJUSTDATETIMETOTIMEZONE:
    {
      nsresult rv;
      if (!requireParams(1, 1, aContext))
        return NS_ERROR_XPATH_BAD_ARGUMENT_COUNT;

      nsAutoString dateTime;
      evaluateToString((Expr*)iter.next(), aContext, dateTime);

      nsCOMPtr<nsIXFormsUtilityService>xformsService =
            do_GetService("@mozilla.org/xforms-utility-service;1", &rv);
      NS_ENSURE_SUCCESS(rv, rv);

      nsAutoString result;
      rv = xformsService->AdjustDateTimeToTimezone(dateTime, result);
      if (NS_FAILED(rv)) {
        return rv;
      }

      return aContext->recycler()->getStringResult(result, aResult);
    }
  } /* switch() */

  aContext->receiveError(NS_LITERAL_STRING("Internal error"),
                         NS_ERROR_UNEXPECTED);
  return NS_ERROR_UNEXPECTED;
}

  #ifdef TX_TO_STRING
nsresult
XFormsFunctionCall::getNameAtom(nsIAtom** aAtom)
{
  switch (mType) {
    case AVG:
    {
      *aAtom = txXPathAtoms::avg;
      break;
    }
    case BOOLEANFROMSTRING:
    {
      *aAtom = txXPathAtoms::booleanFromString;
      break;
    }
    case COUNTNONEMPTY:
    {
      *aAtom = txXPathAtoms::countNonEmpty;
      break;
    }
    case DAYSFROMDATE:
    {
      *aAtom = txXPathAtoms::daysFromDate;
      break;
    }
    case IF:
    {
      *aAtom = txXPathAtoms::ifFunc;
      break;
    }
    case INDEX:
    {
      *aAtom = txXPathAtoms::index;
      break;
    }
    case INSTANCE:
    {
      *aAtom = txXPathAtoms::instance;
      break;
    }
    case MAX:
    {
      *aAtom = txXPathAtoms::max;
      break;
    }
    case MIN:
    {
      *aAtom = txXPathAtoms::min;
      break;
    }
    case MONTHS:
    {
      *aAtom = txXPathAtoms::months;
      break;
    }
    case NOW:
    {
      *aAtom = txXPathAtoms::now;
      break;
    }
    case LOCALDATETIME:
    {
      *aAtom = txXPathAtoms::localDateTime;
      break;
    }
    case LOCALDATE:
    {
      *aAtom = txXPathAtoms::localDate;
      break;
    }
    case PROPERTY:
    {
      *aAtom = txXPathAtoms::property;
      break;
    }
    case SECONDS:
    {
      *aAtom = txXPathAtoms::seconds;
      break;
    }
    case SECONDSFROMDATETIME:
    {
      *aAtom = txXPathAtoms::secondsFromDateTime;
      break;
    }
    case CURRENT:
    {
      *aAtom = txXPathAtoms::current;
      break;
    }
    case EVENT:
    {
      *aAtom = txXPathAtoms::event;
      break;
    }
    case POWER:
    {
      *aAtom = txXPathAtoms::power;
      break;
    }
    case RANDOM:
    {
      *aAtom = txXPathAtoms::random;
      break;
    }
    case COMPARE:
    {
      *aAtom = txXPathAtoms::compare;
      break;
    }
    case CONTEXT:
    {
      *aAtom = txXPathAtoms::context;
      break;
    }
    case DAYSTODATE:
    {
      *aAtom = txXPathAtoms::daysToDate;
      break;
    }
    case SECONDSTODATETIME:
    {
      *aAtom = txXPathAtoms::secondsToDateTime;
      break;
    }
    case ISCARDNUMBER:
    {
      *aAtom = txXPathAtoms::isCardNumber;
      break;
    }
    case DIGEST:
    {
      *aAtom = txXPathAtoms::digest;
      break;
    }
    case ADJUSTDATETIMETOTIMEZONE:
    {
      *aAtom = txXPathAtoms::adjustDateTimeToTimezone;
      break;
    }
    default:
    {
      *aAtom = 0;
      return NS_ERROR_FAILURE;
    }
  }
  NS_ADDREF(*aAtom);
  return NS_OK;
}
#endif
