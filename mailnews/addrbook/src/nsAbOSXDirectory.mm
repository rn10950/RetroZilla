/* -*- Mode: C++; tab-width: 4; indent-tabs-mode: nil; c-basic-offset: 4 -*- */
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
 * Peter Van der Beken.
 * Portions created by the Initial Developer are Copyright (C) 2004
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Peter Van der Beken <peterv@propagandism.org>
 *
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

#include "nsAbOSXDirectory.h"
#include "nsAbOSXCard.h"
#include "nsAbOSXUtils.h"
#include "nsAbQueryStringToExpression.h"
#include "nsArrayEnumerator.h"
#include "nsAutoPtr.h"
#include "nsCOMArray.h"
#include "nsEnumeratorUtils.h"
#include "nsIAbDirectoryQueryProxy.h"
#include "nsIAddrBookSession.h"
#include "nsIRDFService.h"
#include "nsServiceManagerUtils.h"

#include <AddressBook/AddressBook.h>

static nsresult
ConvertToGroupResource(nsIRDFService *aRDFService, NSString *aUid,
                       nsIAbDirectory **aResult)
{
    NS_ASSERTION(aUid, "No UID for group!.");

    *aResult = nsnull;

    nsCAutoString uri(NS_ABOSXDIRECTORY_URI_PREFIX);
    AppendToCString(aUid, uri);

    nsCOMPtr<nsIRDFResource> resource;
    nsresult rv = aRDFService->GetResource(uri, getter_AddRefs(resource));
    NS_ENSURE_SUCCESS(rv, rv);

    return CallQueryInterface(resource, aResult);
}

static nsresult
ConvertToCard(nsIRDFService *aRDFService, ABRecord *aRecord,
              nsIAbCard **aResult)
{
    *aResult = nsnull;

    NSString *uid = [aRecord uniqueId];
    NS_ASSERTION(uid, "No UID for card!.");
    if (!uid) {
        return NS_ERROR_FAILURE;
    }

    nsCAutoString uri(NS_ABOSXCARD_URI_PREFIX);
    AppendToCString(uid, uri);

    nsCOMPtr<nsIRDFResource> resource;
    nsresult rv = aRDFService->GetResource(uri, getter_AddRefs(resource));
    NS_ENSURE_SUCCESS(rv, rv);

    return CallQueryInterface(resource, aResult);
}

static nsresult
Update(nsIRDFService *aRDFService, NSString *aUid)
{
    ABAddressBook *addressBook = [ABAddressBook sharedAddressBook];
    ABRecord *card = [addressBook recordForUniqueId:aUid];
    if ([card isKindOfClass:[ABGroup class]]) {
        nsCOMPtr<nsIAbDirectory> directory;
        ConvertToGroupResource(aRDFService, aUid, getter_AddRefs(directory));
        nsCOMPtr<nsIAbOSXDirectory> osxDirectory =
            do_QueryInterface(directory);

        osxDirectory->Update();
    }
    else {
        nsCOMPtr<nsIAbCard> abCard;
        ConvertToCard(aRDFService, card, getter_AddRefs(abCard));
        nsCOMPtr<nsIAbOSXCard> osxCard = do_QueryInterface(abCard);

        osxCard->Update(PR_TRUE);
    }
    return NS_OK;
}

@interface ABChangedMonitor : NSObject
-(void)ABChanged:(NSNotification *)aNotification;
@end

@implementation ABChangedMonitor
-(void)ABChanged:(NSNotification *)aNotification
{
    NSDictionary *changes = [aNotification userInfo];

    nsresult rv;
    nsCOMPtr<nsIRDFService> rdfService =
        do_GetService("@mozilla.org/rdf/rdf-service;1", &rv);
    NS_ENSURE_SUCCESS(rv, );

    NSArray *inserted = [changes objectForKey:kABInsertedRecords];
    if (inserted) {
        nsCOMPtr<nsIRDFResource> resource;
        rv = rdfService->GetResource(NS_LITERAL_CSTRING("moz-abOSXdirectory:///"),
                                     getter_AddRefs(resource));
        NS_ENSURE_SUCCESS(rv, );

        nsCOMPtr<nsIAbOSXDirectory> osxDirectory =
            do_QueryInterface(resource, &rv);
        NS_ENSURE_SUCCESS(rv, );

        nsCOMPtr<nsIAddrBookSession> abSession =
            do_GetService(NS_ADDRBOOKSESSION_CONTRACTID, &rv);
        NS_ENSURE_SUCCESS(rv, );

        unsigned int i, count = [inserted count];
        for (i = 0; i < count; ++i) {
            ABAddressBook *addressBook =
                 [ABAddressBook sharedAddressBook];
            ABRecord *card =
                [addressBook recordForUniqueId:[inserted objectAtIndex:i]];
            if ([card isKindOfClass:[ABGroup class]]) {
                nsCOMPtr<nsIAbDirectory> directory;
                ConvertToGroupResource(rdfService, [inserted objectAtIndex:i],
                                       getter_AddRefs(directory));

                rv = osxDirectory->AssertDirectory(abSession, directory);
                NS_ENSURE_SUCCESS(rv, );
            }
            else {
                nsCOMPtr<nsIAbCard> abCard;
                ConvertToCard(rdfService, card, getter_AddRefs(abCard));

                rv = osxDirectory->AssertCard(abSession, abCard);
                NS_ENSURE_SUCCESS(rv, );
            }
        }
    }

    NSArray *updated = [changes objectForKey:kABUpdatedRecords];
    if (updated) {
        unsigned int i, count = [updated count];
        for (i = 0; i < count; ++i) {
            NSString *uid = [updated objectAtIndex:i];
            Update(rdfService, uid);
        }
    }

    NSArray *deleted = [changes objectForKey:kABDeletedRecords];
    if (deleted) {
        nsCOMPtr<nsIRDFResource> resource;
        rv = rdfService->GetResource(NS_LITERAL_CSTRING("moz-abOSXdirectory:///"),
                                     getter_AddRefs(resource));
        NS_ENSURE_SUCCESS(rv, );

        nsCOMPtr<nsIAbOSXDirectory> osxDirectory =
            do_QueryInterface(resource, &rv);
        NS_ENSURE_SUCCESS(rv, );

        nsCOMPtr<nsIAddrBookSession> abSession =
            do_GetService(NS_ADDRBOOKSESSION_CONTRACTID, &rv);
        NS_ENSURE_SUCCESS(rv, );

        unsigned int i, count = [deleted count];
        for (i = 0; i < count; ++i) {
            ABAddressBook *addressBook = [ABAddressBook sharedAddressBook];
            NSString *recordClass =
                [addressBook recordClassFromUniqueId:[deleted objectAtIndex:i]];
            if ([recordClass isEqualToString:@"ABGroup"]) {
                nsCOMPtr<nsIAbDirectory> directory;
                ConvertToGroupResource(rdfService, [deleted objectAtIndex:i],
                                       getter_AddRefs(directory));

                rv = osxDirectory->UnassertDirectory(abSession, directory);
                NS_ENSURE_SUCCESS(rv, );
            }
            else {
                nsCOMPtr<nsIAbCard> abCard;
                ConvertToCard(rdfService, [deleted objectAtIndex:i],
                              getter_AddRefs(abCard));

                rv = osxDirectory->UnassertCard(abSession, abCard);
                NS_ENSURE_SUCCESS(rv, );
            }
        }
    }

    if (!inserted && !updated && !deleted) {
        // XXX This is supposed to mean "everything was updated", but we get
        //     this whenever something has changed, so not sure what to do.
    }

    [[aNotification object] release];
}
@end

static nsresult
MapConditionString(nsIAbBooleanConditionString *aCondition, PRBool aNegate,
                   PRBool &aCanHandle, ABSearchElement **aResult)
{
    aCanHandle = PR_FALSE;

    nsAbBooleanConditionType conditionType = 0;
    nsresult rv = aCondition->GetCondition(&conditionType);
    NS_ENSURE_SUCCESS(rv, rv);

    ABSearchComparison comparison;
    switch (conditionType) {
        case nsIAbBooleanConditionTypes::Contains:
        {
            if (!aNegate) {
                comparison = kABContainsSubString;
                aCanHandle = PR_TRUE;
            }
            break;
        }
        case nsIAbBooleanConditionTypes::DoesNotContain:
        {
            if (aNegate) {
                comparison = kABContainsSubString;
                aCanHandle = PR_TRUE;
            }
            break;
        }
        case nsIAbBooleanConditionTypes::Is:
        {
            comparison = aNegate ? kABNotEqual : kABEqual;
            aCanHandle = PR_TRUE;
            break;
        }
        case nsIAbBooleanConditionTypes::IsNot:
        {
            comparison = aNegate ? kABEqual : kABNotEqual;
            aCanHandle = PR_TRUE;
            break;
        }
        case nsIAbBooleanConditionTypes::BeginsWith:
        {
            if (!aNegate) {
                comparison = kABPrefixMatch;
                aCanHandle = PR_TRUE;
            }
            break;
        }
        case nsIAbBooleanConditionTypes::EndsWith:
        {
            //comparison = kABSuffixMatch;
            break;
        }
        case nsIAbBooleanConditionTypes::LessThan:
        {
            comparison = aNegate ? kABGreaterThanOrEqual : kABLessThan;
            aCanHandle = PR_TRUE;
            break;
        }
        case nsIAbBooleanConditionTypes::GreaterThan:
        {
            comparison = aNegate ? kABLessThanOrEqual : kABGreaterThan;
            aCanHandle = PR_TRUE;
            break;
        }
    }

    if (!aCanHandle) {
        return NS_OK;
    }

    nsXPIDLCString name;
    rv = aCondition->GetName(getter_Copies(name));
    NS_ENSURE_SUCCESS(rv, rv);

    nsXPIDLString value;
    rv = aCondition->GetValue(getter_Copies(value));
    NS_ENSURE_SUCCESS(rv, rv);

    PRUint32 length = value.Length();

    PRUint32 i;
    for (i = 0; i < nsAbOSXUtils::kPropertyMapSize; ++i) {
        if (name.EqualsASCII(nsAbOSXUtils::kPropertyMap[i].mPropertyName)) {
            *aResult =
                [ABPerson searchElementForProperty:nsAbOSXUtils::kPropertyMap[i].mOSXProperty
                                             label:nsAbOSXUtils::kPropertyMap[i].mOSXLabel
                                               key:nsAbOSXUtils::kPropertyMap[i].mOSXKey
                                             value:[NSString stringWithCharacters:value.get() length:length]
                                        comparison:comparison];

            return NS_OK;
        }
    }

    if (name.EqualsLiteral("DisplayName") && comparison == kABContainsSubString) {
        ABSearchElement *first =
                [ABPerson searchElementForProperty:kABFirstNameProperty
                                             label:nil
                                               key:nil
                                             value:[NSString stringWithCharacters:value.get() length:length]
                                        comparison:comparison];
        ABSearchElement *second =
                [ABPerson searchElementForProperty:kABLastNameProperty
                                             label:nil
                                               key:nil
                                             value:[NSString stringWithCharacters:value.get() length:length]
                                        comparison:comparison];
        ABSearchElement *third =
                [ABGroup searchElementForProperty:kABGroupNameProperty
                                             label:nil
                                               key:nil
                                             value:[NSString stringWithCharacters:value.get() length:length]
                                        comparison:comparison];

        *aResult = [ABSearchElement searchElementForConjunction:kABSearchOr children:[NSArray arrayWithObjects:first, second, third, nil]];

        return NS_OK;
    }

    aCanHandle = PR_FALSE;

    return NS_OK;
}

static nsresult
BuildSearchElements(nsIAbBooleanExpression *aExpression,
                    PRBool &aCanHandle,
                    ABSearchElement **aResult)
{
    aCanHandle = PR_TRUE;

    nsCOMPtr<nsISupportsArray> expressions;
    nsresult rv = aExpression->GetExpressions(getter_AddRefs(expressions));
    NS_ENSURE_SUCCESS(rv, rv);

    nsAbBooleanOperationType operation;
    rv = aExpression->GetOperation(&operation);
    NS_ENSURE_SUCCESS(rv, rv);

    PRUint32 count;
    rv = expressions->Count(&count);
    NS_ENSURE_SUCCESS(rv, rv);

    NS_ASSERTION(count > 1 && operation != nsIAbBooleanOperationTypes::NOT,
                 "This doesn't make sense!");

    NSMutableArray *array = nsnull;
    if (count > 1) {
        array = [[NSMutableArray alloc] init];
    }

    PRUint32 i;
    nsCOMPtr<nsIAbBooleanConditionString> condition;
    nsCOMPtr<nsIAbBooleanExpression> subExpression;
    for (i = 0; i < count; ++i) {
        ABSearchElement *element = nsnull;

        condition = do_QueryElementAt(expressions, i);
        if (condition) {
            rv = MapConditionString(condition, operation == nsIAbBooleanOperationTypes::NOT, aCanHandle, &element);
            NS_ENSURE_SUCCESS(rv, rv);
        }
        else {
            subExpression = do_QueryElementAt(expressions, i);
            if (subExpression) {
                rv = BuildSearchElements(subExpression, aCanHandle, &element);
                NS_ENSURE_SUCCESS(rv, rv);
            }
        }

        if (!aCanHandle) {
            return NS_OK;
        }

        if (element) {
            if (array) {
                [array addObject:element];
            }
            else {
                *aResult = element;
            }
        }
    }

    if (array) {
        ABSearchConjunction conjunction = operation == nsIAbBooleanOperationTypes::AND ? kABSearchAnd : kABSearchOr;
        *aResult = [ABSearchElement searchElementForConjunction:conjunction children:array];
    }

    return NS_OK;
}

static PRBool
Search(nsIAbBooleanExpression *aExpression, NSArray **aResult)
{
    PRBool canHandle = PR_FALSE;
    ABSearchElement *searchElement;
    nsresult rv = BuildSearchElements(aExpression, canHandle, &searchElement);
    NS_ENSURE_SUCCESS(rv, PR_FALSE);

    if (canHandle) {
        *aResult = [[ABAddressBook sharedAddressBook] recordsMatchingSearchElement:searchElement];
    }

    return canHandle;
}

static PRUint32 sObserverCount = 0;
static ABChangedMonitor *sObserver = nsnull;

nsAbOSXDirectory::~nsAbOSXDirectory()
{
    if (--sObserverCount == 0) {
        [[NSNotificationCenter defaultCenter] removeObserver:sObserver];
        [sObserver release];
    }
}

NS_IMPL_ISUPPORTS_INHERITED2(nsAbOSXDirectory,
                             nsAbDirectoryRDFResource,
                             nsIAbDirectory,
                             nsIAbOSXDirectory)

NS_IMETHODIMP
nsAbOSXDirectory::Init(const char *aUri)
{
    ABAddressBook *addressBook = [ABAddressBook sharedAddressBook];
    if (sObserverCount == 0) {
        sObserver = [[ABChangedMonitor alloc] init];
        [[NSNotificationCenter defaultCenter] addObserver:(ABChangedMonitor*)sObserver
           selector:@selector(ABChanged:)
           name:kABDatabaseChangedExternallyNotification
           object:nil];
    }
    ++sObserverCount;

    nsresult rv = nsAbDirectoryRDFResource::Init(aUri);
    NS_ENSURE_SUCCESS(rv, rv);

    if (mURINoQuery.Length() > 22) {
        nsCAutoString uid(Substring(mURINoQuery, 21));
        ABRecord *card = [addressBook recordForUniqueId:[NSString stringWithUTF8String:uid.get()]];
        NS_ASSERTION([card isKindOfClass:[ABGroup class]], "Huh.");

        m_IsMailList = PR_TRUE;
        AppendToString([card valueForProperty:kABGroupNameProperty], m_DirName);
    }

    return NS_OK;
}

NS_IMETHODIMP
nsAbOSXDirectory::GetOperations(PRInt32 *aOperations)
{
    *aOperations = nsIAbDirectory::opRead |
                   nsIAbDirectory::opSearch;

    return NS_OK;
}

struct nsEnumeratorData
{
    NSMutableArray *mCards;
    nsIAbDirectory *mDirectory;
    nsIAddrBookSession *mSession;
};

PLDHashOperator
Enumerator(nsIAbCardHashKey *aKey, void *aUserArg)
{
    nsEnumeratorData *data = NS_STATIC_CAST(nsEnumeratorData*, aUserArg);

    nsIAbCard *abCard = aKey->GetCard();

    nsCOMPtr<nsIRDFResource> resource = do_QueryInterface(abCard);

    const char* uri;
    resource->GetValueConst(&uri);
    NSString *uid = [NSString stringWithUTF8String:(uri + 21)];

    unsigned int i, count = [data->mCards count];
    for (i = 0; i < count; ++i) {
        if ([[[data->mCards objectAtIndex:i] uniqueId] isEqualToString:uid]) {
            [data->mCards removeObjectAtIndex:i];
            break;
        }
    }

    if (i == count) {
        data->mSession->NotifyDirectoryItemDeleted(data->mDirectory, abCard);

        return PL_DHASH_REMOVE;
    }

    return PL_DHASH_NEXT;
}

nsresult
nsAbOSXDirectory::Update()
{
    nsresult rv;
    nsCOMPtr<nsIAddrBookSession> abSession = do_GetService(NS_ADDRBOOKSESSION_CONTRACTID, &rv);
    NS_ENSURE_SUCCESS(rv, rv);

    if (mIsQueryURI) {
        return NS_OK;
    }

    ABAddressBook *addressBook = [ABAddressBook sharedAddressBook];

    NSArray *groups, *cards;
    if (m_IsMailList) {
        ABGroup *group = (ABGroup*)[addressBook recordForUniqueId:[NSString stringWithUTF8String:nsCAutoString(Substring(mURINoQuery, 21)).get()]];
        groups = nil;
        cards = [[group members] arrayByAddingObjectsFromArray:[group subgroups]];
    }
    else {
        groups = [addressBook groups];
        cards = [[addressBook people] arrayByAddingObjectsFromArray:groups];
    }

    NSMutableArray *mutableArray = [NSMutableArray arrayWithArray:cards];
    if (mCardList.IsInitialized()) {
        nsEnumeratorData data = { mutableArray, this, abSession };

        mCardList.EnumerateEntries(Enumerator, &data);
    }

    NSEnumerator *enumerator = [mutableArray objectEnumerator];
    ABRecord *card;
    nsCOMPtr<nsIAbCard> abCard;
    while ((card = [enumerator nextObject])) {
        rv = ConvertToCard(gRDFService, card, getter_AddRefs(abCard));
        NS_ENSURE_SUCCESS(rv, rv);

        AssertCard(abSession, abCard);
    }

    card = (ABRecord*)[addressBook recordForUniqueId:[NSString stringWithUTF8String:nsCAutoString(Substring(mURINoQuery, 21)).get()]];
    NSString * stringValue = [card valueForProperty:kABGroupNameProperty];
    if (![stringValue isEqualToString:WrapString(m_DirName)]) {
        nsAutoString oldValue(m_DirName);
        AssignToString(stringValue, m_DirName);
        nsISupports *supports =
            NS_ISUPPORTS_CAST(nsAbDirectoryRDFResource*, this);
        abSession->NotifyItemPropertyChanged(supports, "DirName",
                                             oldValue.get(), m_DirName.get());
    }

    if (groups) {
        mutableArray = [NSMutableArray arrayWithArray:groups];
        nsCOMPtr<nsIAbDirectory> directory;
        if (m_AddressList) {
            PRUint32 i, count;
            m_AddressList->Count(&count);
            for (i = 0; i < count; ++i) {
                directory = do_QueryElementAt(m_AddressList, i);
                nsCOMPtr<nsIAbOSXDirectory> osxDirectory =
                    do_QueryInterface(directory);

                nsCAutoString uri;
                osxDirectory->GetURI(uri);
                uri.Cut(0, 21);
                NSString *uid = [NSString stringWithUTF8String:uri.get()];

                unsigned int j, arrayCount = [mutableArray count];
                for (j = 0; j < arrayCount; ++j) {
                    if ([[[mutableArray objectAtIndex:j] uniqueId] isEqualToString:uid]) {
                        [mutableArray removeObjectAtIndex:j];
                        break;
                    }
                }

                if (j == arrayCount) {
                    UnassertDirectory(abSession, directory);
                }
            }
        }

        enumerator = [mutableArray objectEnumerator];
        while ((card = [enumerator nextObject])) {
            rv = ConvertToGroupResource(gRDFService, [card uniqueId],
                                        getter_AddRefs(directory));
            NS_ENSURE_SUCCESS(rv, rv);

            AssertDirectory(abSession, directory);
        }
    }

    return NS_OK;
}

nsresult
nsAbOSXDirectory::AssertChildNodes()
{
    // Queries and mailing lists can't have childnodes.
    if (mIsQueryURI || m_IsMailList) {
        return NS_OK;
    }

    nsresult rv;
    nsCOMPtr<nsIAddrBookSession> abSession =
        do_GetService(NS_ADDRBOOKSESSION_CONTRACTID, &rv);
    NS_ENSURE_SUCCESS(rv, rv);

    NSArray *groups = [[ABAddressBook sharedAddressBook] groups];

    unsigned int i, count = [groups count];

    if (count > 0 && !m_AddressList) {
        rv = NS_NewISupportsArray(getter_AddRefs(m_AddressList));
        NS_ENSURE_SUCCESS(rv, rv);
    }

    nsCOMPtr<nsIAbDirectory> directory;
    for (i = 0; i < count; ++i) {
        rv = ConvertToGroupResource(gRDFService, [[groups objectAtIndex:i] uniqueId],
                                    getter_AddRefs(directory));
        NS_ENSURE_SUCCESS(rv, rv);

        rv = AssertDirectory(abSession, directory);
        NS_ENSURE_SUCCESS(rv, rv);
    }

    return NS_OK;
}

nsresult
nsAbOSXDirectory::AssertDirectory(nsIAddrBookSession *aSession,
                                  nsIAbDirectory *aDirectory)
{
    NS_ASSERTION(!m_AddressList || m_AddressList->IndexOf(aDirectory) < 0,
                 "Replacing?");

    nsresult rv;
    if (!m_AddressList) {
        rv = NS_NewISupportsArray(getter_AddRefs(m_AddressList));
        NS_ENSURE_SUCCESS(rv, rv);
    }

    rv = m_AddressList->AppendElement(aDirectory);
    NS_ENSURE_SUCCESS(rv, rv);

    return aSession->NotifyDirectoryItemAdded(this, aDirectory);
}

nsresult
nsAbOSXDirectory::AssertCard(nsIAddrBookSession *aSession,
                             nsIAbCard *aCard)
{
    NS_ASSERTION(!mCardList.IsInitialized() || !mCardList.GetEntry(aCard),
                 "Replacing?");

    if (!mCardList.IsInitialized() && !mCardList.Init()) {
        return NS_ERROR_OUT_OF_MEMORY;
    }

    mCardList.PutEntry(aCard);
    return aSession->NotifyDirectoryItemAdded(this, aCard);
}

nsresult
nsAbOSXDirectory::UnassertDirectory(nsIAddrBookSession *aSession,
                                    nsIAbDirectory *aDirectory)
{
    NS_ASSERTION(m_AddressList->IndexOf(aDirectory) >= 0, "Not found?");

    nsresult rv = m_AddressList->RemoveElement(aDirectory);
    NS_ENSURE_SUCCESS(rv, rv);

    return aSession->NotifyDirectoryItemDeleted(this, aDirectory);
}

nsresult
nsAbOSXDirectory::UnassertCard(nsIAddrBookSession *aSession,
                               nsIAbCard *aCard)
{
    NS_ASSERTION(mCardList.GetEntry(aCard), "Not found?");

    mCardList.RemoveEntry(aCard);
    return aSession->NotifyDirectoryItemDeleted(this, aCard);
}

NS_IMETHODIMP
nsAbOSXDirectory::GetChildNodes(nsISimpleEnumerator **aNodes)
{
    NS_ENSURE_ARG_POINTER(aNodes);

    // Queries don't have childnodes.
    if (mIsQueryURI || !m_AddressList) {
        return NS_NewEmptyEnumerator(aNodes);
    }

    return NS_NewArrayEnumerator(aNodes, m_AddressList);
}

NS_IMETHODIMP
nsAbOSXDirectory::GetChildCards(nsIEnumerator **aCards)
{
    NS_ENSURE_ARG_POINTER(aCards);

    ABAddressBook *addressBook = [ABAddressBook sharedAddressBook];

    nsresult rv;
    NSArray *cards;
    if (mIsQueryURI) {
        nsCOMPtr<nsIAbBooleanExpression> expression;
        rv = nsAbQueryStringToExpression::Convert(mQueryString.get(),
                                                  getter_AddRefs(expression));
        NS_ENSURE_SUCCESS(rv, rv);

        PRBool canHandle = !m_IsMailList && Search(expression, &cards);
        if (!canHandle) {
            return FallbackSearch(expression, aCards);
        }
    }
    else {
        if (m_IsMailList) {
            ABGroup *group = (ABGroup*)[addressBook recordForUniqueId:[NSString stringWithUTF8String:nsCAutoString(Substring(mURINoQuery, 21)).get()]];
            cards = [[group members] arrayByAddingObjectsFromArray:[group subgroups]];
        }
        else {
            cards = [[addressBook people] arrayByAddingObjectsFromArray:[addressBook groups]];
        }
    }

    // Fill the results array and update the card list
    // Also update the address list and notify any changes.
    unsigned int nbCards = [cards count];
    if (nbCards > 0) {
        if (mCardList.IsInitialized()) {
            mCardList.Clear();
        }
        else if (!mCardList.Init()) {
            return NS_ERROR_OUT_OF_MEMORY;
        }
    }

    nsCOMPtr<nsISupportsArray> cardList;
    rv = NS_NewISupportsArray(getter_AddRefs(cardList));
    NS_ENSURE_SUCCESS(rv, rv);

    unsigned int i;
    nsCOMPtr<nsIAbCard> card;
    for (i = 0; i < nbCards; ++i) {
        rv = ConvertToCard(gRDFService, [cards objectAtIndex:i],
                           getter_AddRefs(card));
        NS_ENSURE_SUCCESS(rv, rv);

        rv = cardList->AppendElement(card);
        NS_ENSURE_SUCCESS(rv, rv);

        mCardList.PutEntry(card);
    }

    return GetEnumerator(cardList, aCards);
}

NS_IMETHODIMP
nsAbOSXDirectory::HasCard(nsIAbCard *aCard, PRBool *aHasCard)
{
    NS_ENSURE_ARG_POINTER(aCard);
    NS_ENSURE_ARG_POINTER(aHasCard);

    *aHasCard = mCardList.IsInitialized() && mCardList.GetEntry(aCard);

    return NS_OK;
}

NS_IMETHODIMP
nsAbOSXDirectory::HasDirectory(nsIAbDirectory *aDirectory,
                               PRBool *aHasDirectory)
{
    NS_ENSURE_ARG_POINTER(aDirectory);
    NS_ENSURE_ARG_POINTER(aHasDirectory);

    *aHasDirectory = m_AddressList && m_AddressList->IndexOf(aDirectory) >= 0;

    return NS_OK;
}

nsresult
nsAbOSXDirectory::OnSearchFinished(PRInt32 aResult)
{
    return NS_OK;
}

nsresult
nsAbOSXDirectory::OnSearchFoundCard(nsIAbCard *aCard)
{
    nsresult rv;
    if (!m_AddressList) {
        rv = NS_NewISupportsArray(getter_AddRefs(m_AddressList));
        NS_ENSURE_SUCCESS(rv, rv);
    }

    if (!mCardList.IsInitialized() && !mCardList.Init()) {
        return NS_ERROR_OUT_OF_MEMORY;
    }

    rv = m_AddressList->AppendElement(aCard);
    NS_ENSURE_SUCCESS(rv, rv);

    mCardList.PutEntry(aCard);

    return NS_OK;
}

nsresult
nsAbOSXDirectory::FallbackSearch(nsIAbBooleanExpression *aExpression,
                                 nsIEnumerator **aCards)
{
    nsresult rv;

    if (mCardList.IsInitialized()) {
        mCardList.Clear();
    }
    else if (!mCardList.Init()) {
        return NS_ERROR_OUT_OF_MEMORY;
    }

    if (m_AddressList) {
        m_AddressList->Clear();
    }
    else {
        rv = NS_NewISupportsArray(getter_AddRefs(m_AddressList));
        NS_ENSURE_SUCCESS(rv, rv);
    }

    nsCOMPtr<nsIAbDirectoryQueryArguments> arguments =
        do_CreateInstance(NS_ABDIRECTORYQUERYARGUMENTS_CONTRACTID, &rv);
    NS_ENSURE_SUCCESS(rv, rv);

    rv = arguments->SetExpression(aExpression);
    NS_ENSURE_SUCCESS(rv, rv);

    // Set the return properties to
    // return nsIAbCard interfaces
    const char* property = "card:nsIAbCard";
    rv = arguments->SetReturnProperties(1, &property);
    NS_ENSURE_SUCCESS(rv, rv);

    // Don't search the subdirectories. If the current directory is a mailing
    // list, it won't have any subdirectories. If the current directory is an
    // addressbook, searching both it and the subdirectories (the mailing
    // lists), will yield duplicate results because every entry in a mailing
    // list will be an entry in the parent addressbook.
    rv = arguments->SetQuerySubDirectories(PR_FALSE);
    NS_ENSURE_SUCCESS(rv, rv);

    // Set the the query listener
    nsCOMPtr<nsIAbDirectoryQueryResultListener> queryListener =
        new nsAbDirSearchListener(this);
    if (!queryListener) {
        return NS_ERROR_OUT_OF_MEMORY;
    }

    // Get the directory without the query
    nsCOMPtr<nsIRDFResource> resource;
    rv = gRDFService->GetResource(mURINoQuery, getter_AddRefs(resource));
    NS_ENSURE_SUCCESS(rv, rv);

    nsCOMPtr<nsIAbDirectory> directory = do_QueryInterface(resource, &rv);
    NS_ENSURE_SUCCESS(rv, rv);

    // Initiate the proxy query with the no query directory
    nsCOMPtr<nsIAbDirectoryQueryProxy> queryProxy = 
        do_CreateInstance(NS_ABDIRECTORYQUERYPROXY_CONTRACTID, &rv);
    NS_ENSURE_SUCCESS(rv, rv);

    rv = queryProxy->Initiate(directory);
    NS_ENSURE_SUCCESS(rv, rv);

    PRInt32 context = 0;
    rv = queryProxy->DoQuery(arguments, queryListener, -1, 0, &context);
    NS_ENSURE_SUCCESS(rv, rv);

    return GetEnumerator(m_AddressList, aCards);
}
