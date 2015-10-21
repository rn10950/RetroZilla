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

#ifndef nsAbOSXDirectory_h___
#define nsAbOSXDirectory_h___

#include "nsAbBaseCID.h"
#include "nsAbDirectoryRDFResource.h"
#include "nsAbDirProperty.h"
#include "nsIAbDirectoryQuery.h"
#include "nsIAbDirectorySearch.h"
#include "nsAbDirSearchListener.h"
#include "nsTHashtable.h"

class nsIAddrBookSession;

#define NS_ABOSXDIRECTORY_URI_PREFIX NS_ABOSXDIRECTORY_PREFIX "://"

class nsIAbCardHashKey : public PLDHashEntryHdr
{
public:
    typedef nsIAbCard* KeyType;
    typedef const nsIAbCard* KeyTypePointer;

    nsIAbCardHashKey(const nsIAbCard* key)
        : mCard(NS_CONST_CAST(nsIAbCard*, key))
    {
    }
    nsIAbCardHashKey(const nsIAbCardHashKey& toCopy)
        : mCard(toCopy.mCard)
    {
    }
    ~nsIAbCardHashKey()
    {
    }

    KeyType GetCard() const
    {
        return mCard;
    }
    KeyTypePointer GetKeyPointer() const
    {
        return mCard;
    }

    PRBool KeyEquals(KeyTypePointer aKey) const
    {
        return aKey == mCard;
    }

    static KeyTypePointer KeyToPointer(KeyType aKey)
    {
        return aKey;
    }
    static PLDHashNumber HashKey(KeyTypePointer aKey)
    {
        return NS_PTR_TO_INT32(aKey) >> 2;
    }
    enum { ALLOW_MEMMOVE = PR_TRUE };

private:
    nsCOMPtr<nsIAbCard> mCard;
};

#define NS_IABOSXDIRECTORY_IID \
  { 0x87ee4bd9, 0x8552, 0x498f, \
    { 0x80, 0x85, 0x34, 0xf0, 0x2a, 0xbb, 0x56, 0x16 } }

class nsIAbOSXDirectory : public nsISupports
{
public:
    NS_DEFINE_STATIC_IID_ACCESSOR(NS_IABOSXDIRECTORY_IID)

    virtual nsresult AssertChildNodes() = 0;
    virtual nsresult Update() = 0;
    virtual nsresult AssertDirectory(nsIAddrBookSession *aSession,
                                     nsIAbDirectory *aDirectory) = 0;
    virtual nsresult AssertCard(nsIAddrBookSession *aSession,
                                nsIAbCard *aCard) = 0;
    virtual nsresult UnassertDirectory(nsIAddrBookSession *aSession,
                                       nsIAbDirectory *aDirectory) = 0;
    virtual nsresult UnassertCard(nsIAddrBookSession *aSession,
                                  nsIAbCard *aCard) = 0;
    virtual void GetURI(nsACString &aURI) = 0;
};

class nsAbOSXDirectory : public nsAbDirectoryRDFResource,
                         public nsAbDirProperty,
                         public nsAbDirSearchListenerContext,
                         public nsIAbOSXDirectory
{
public:
    ~nsAbOSXDirectory();

    NS_DECL_ISUPPORTS_INHERITED

    // nsAbDirectoryRDFResource method
    NS_IMETHOD Init(const char *aUri);

    // nsAbDirProperty methods
    NS_IMETHOD GetOperations(PRInt32 *aOperations);
    NS_IMETHOD GetChildCards(nsIEnumerator **aCards);
    NS_IMETHOD GetChildNodes(nsISimpleEnumerator **aNodes);
    NS_IMETHOD HasCard(nsIAbCard *aCard, PRBool *aHasCard);
    NS_IMETHOD HasDirectory(nsIAbDirectory *aDirectory, PRBool *aHasDirectory);

    // nsAbDirSearchListenerContext methods
    nsresult OnSearchFinished(PRInt32 aResult);
    nsresult OnSearchFoundCard(nsIAbCard *aCard);

    // nsIAbOSXDirectory
    nsresult AssertChildNodes();
    nsresult AssertDirectory(nsIAddrBookSession *aSession,
                             nsIAbDirectory *aDirectory);
    nsresult AssertCard(nsIAddrBookSession *aSession,
                        nsIAbCard *aCard);
    nsresult UnassertDirectory(nsIAddrBookSession *aSession,
                               nsIAbDirectory *aDirectory);
    nsresult UnassertCard(nsIAddrBookSession *aSession,
                          nsIAbCard *aCard);

    nsresult Update();
    void GetURI(nsACString &aURI)
    {
        aURI = mURI;
    }

private:
    static nsresult GetEnumerator(nsISupportsArray *aArray,
                                  nsIEnumerator **aEnumerator)
    {
        nsIBidirectionalEnumerator *enumerator;
        nsresult rv = NS_NewISupportsArrayEnumerator(aArray,
                                                     &enumerator);
        NS_ENSURE_SUCCESS(rv, rv);

        *aEnumerator = enumerator;

        return NS_OK;
    }
    nsresult FallbackSearch(nsIAbBooleanExpression *aExpression,
                            nsIEnumerator **aCards);

    nsTHashtable<nsIAbCardHashKey> mCardList;
};

#endif // nsAbOSXDirectory_h___
