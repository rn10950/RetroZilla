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

#include "nsAbOSXCard.h"
#include "nsAbOSXDirectory.h"
#include "nsAbOSXUtils.h"
#include "nsAutoPtr.h"
#include "nsIAddrBookSession.h"
#include "nsServiceManagerUtils.h"

#include <AddressBook/AddressBook.h>

NS_IMPL_ISUPPORTS_INHERITED2(nsAbOSXCard,
                             nsRDFResource,
                             nsIAbCard,
                             nsIAbOSXCard)

#ifdef DEBUG
static ABPropertyType
GetPropertType(ABRecord *aCard, NSString *aProperty)
{
    ABPropertyType propertyType = kABErrorInProperty;
    if ([aCard isKindOfClass:[ABPerson class]]) {
        propertyType = [ABPerson typeOfProperty:aProperty];
    }
    else if ([aCard isKindOfClass:[ABGroup class]]) {
        propertyType = [ABGroup typeOfProperty:aProperty];
    }
    return propertyType;
}
#endif

static void
SetStringProperty(nsAbOSXCard *aCard, nsString &aValue, nsString &aMember,
                  const char *aMemberName, PRBool aNotify,
                  nsIAddrBookSession *aSession)
{
    if (!aNotify) {
        aMember = aValue;
    }
    else if (!aMember.Equals(aValue)) {
        nsString oldValue(aMember);
        aMember = aValue;

        nsISupports *supports = NS_ISUPPORTS_CAST(nsRDFResource*, aCard);
        aSession->NotifyItemPropertyChanged(supports, aMemberName,
                                            oldValue.get(), aMember.get());
    }
}

static void
SetStringProperty(nsAbOSXCard *aCard, NSString *aValue, nsString &aMember,
                  const char *aMemberName, PRBool aNotify,
                  nsIAddrBookSession *aSession)
{
    nsAutoString value;
    if (aValue) {
        AppendToString(aValue, value);
    }
    SetStringProperty(aCard, value, aMember, aMemberName, aNotify, aSession);
}

static void
MapStringProperty(nsAbOSXCard *aCard, ABRecord *aOSXCard, NSString *aProperty,
                  nsString &aMember, const char *aMemberName, PRBool aNotify,
                  nsIAddrBookSession *aSession)
{
    NS_ASSERTION(aProperty, "This is bad! You asked for an unresolved symbol.");
    NS_ASSERTION(GetPropertType(aOSXCard, aProperty) == kABStringProperty,
                 "Wrong type!");

    SetStringProperty(aCard, [aOSXCard valueForProperty:aProperty], aMember,
                      aMemberName, aNotify, aSession);
}

static ABMutableMultiValue*
GetMultiValue(ABRecord *aCard, NSString *aProperty)
{
    NS_ASSERTION(aProperty, "This is bad! You asked for an unresolved symbol.");
    NS_ASSERTION(GetPropertType(aCard, aProperty) & kABMultiValueMask,
                 "Wrong type!");

    return [aCard valueForProperty:aProperty];
}

static void
MapDate(nsAbOSXCard *aCard, NSDate *aDate, nsString &aYear,
        const char *aYearName, nsString &aMonth, const char *aMonthName,
        nsString &aDay, const char *aDayName, PRBool aNotify,
        nsIAddrBookSession *aSession)
{
    // XXX Should we pass a format and timezone?
    NSCalendarDate *date = [aDate dateWithCalendarFormat:nil timeZone:nil];

    nsAutoString value;
    value.AppendInt([date yearOfCommonEra]);
    SetStringProperty(aCard, value, aYear, aYearName, aNotify, aSession);
    value.AppendInt([date monthOfYear]);
    SetStringProperty(aCard, value, aMonth, aMonthName, aNotify, aSession);
    value.AppendInt([date dayOfWeek]);
    SetStringProperty(aCard, value, aDay, aDayName, aNotify, aSession);
}

static PRBool
MapMultiValue(nsAbOSXCard *aCard, ABRecord *aOSXCard,
              const nsAbOSXPropertyMap &aMap, PRBool aNotify,
              nsIAddrBookSession *aSession)
{
    ABMultiValue *value = GetMultiValue(aOSXCard, aMap.mOSXProperty);
    if (value) {
        unsigned int j, count = [value count];
        for (j = 0; j < count; ++j) {
            if ([[value labelAtIndex:j] isEqualToString:aMap.mOSXLabel]) {
                NSString *stringValue;
                if (aMap.mOSXKey) {
                    stringValue = [[value valueAtIndex:j] objectForKey:aMap.mOSXKey];
                }
                else {
                    stringValue = [value valueAtIndex:j];
                }

                SetStringProperty(aCard, stringValue, aCard->*(aMap.mProperty),
                                  aMap.mPropertyName, aNotify, aSession);

                return PR_TRUE;
            }
        }
    }

    return PR_FALSE;
}

NS_IMETHODIMP
nsAbOSXCard::Init(const char *aUri)
{
    if (strncmp(aUri, NS_ABOSXCARD_URI_PREFIX,
                sizeof(NS_ABOSXCARD_URI_PREFIX) - 1) != 0) {
        return NS_ERROR_FAILURE;
    }

    nsresult rv = nsRDFResource::Init(aUri);
    NS_ENSURE_SUCCESS(rv, rv);

    return Update(PR_FALSE);
}

nsresult
nsAbOSXCard::Update(PRBool aNotify)
{
    ABAddressBook *addressBook = [ABAddressBook sharedAddressBook];

    const char *uid = &((mURI.get())[16]);
    ABRecord *card = [addressBook recordForUniqueId:[NSString stringWithUTF8String:uid]];
    NS_ENSURE_TRUE(card, NS_ERROR_FAILURE);

    nsCOMPtr<nsIAddrBookSession> abSession;
    nsresult rv;
    if (aNotify) {
        abSession = do_GetService(NS_ADDRBOOKSESSION_CONTRACTID, &rv);
        NS_ENSURE_SUCCESS(rv, rv);
    }

    if ([card isKindOfClass:[ABGroup class]]) {
        m_IsMailList = PR_TRUE;
        m_MailListURI.AssignLiteral(NS_ABOSXDIRECTORY_URI_PREFIX);
        m_MailListURI.Append(uid);
        MapStringProperty(this, card, kABGroupNameProperty, m_DisplayName,
                          "DisplayName", aNotify, abSession);

        return NS_OK;
    }

    PRBool foundHome = PR_FALSE, foundWork = PR_FALSE;

    PRUint32 i;
    for (i = 0; i < nsAbOSXUtils::kPropertyMapSize; ++i) {
        const nsAbOSXPropertyMap &propertyMap = nsAbOSXUtils::kPropertyMap[i];
        if (!propertyMap.mOSXProperty) {
            continue;
        }

        if (propertyMap.mOSXLabel) {
            PRBool found = MapMultiValue(this, card, propertyMap, aNotify,
                                         abSession);

            if (found && propertyMap.mOSXProperty == kABAddressProperty) {
                if (propertyMap.mOSXLabel == kABAddressHomeLabel) {
                    foundHome = PR_TRUE;
                }
                else {
                    foundWork = PR_TRUE;
                }
            }
        }
        else {
            MapStringProperty(this, card, propertyMap.mOSXProperty,
                              this->*(propertyMap.mProperty),
                              propertyMap.mPropertyName, aNotify, abSession);
        }
    }

    int flags = 0;
    if (kABPersonFlags) {
        flags = [[card valueForProperty:kABPersonFlags] intValue];
    }

#define SET_STRING(_value, _name, _notify, _session) \
    SetStringProperty(this, _value, m_##_name, #_name, _notify, _session)

    // If kABShowAsCompany is set we use the company name as display name.
    if (flags & kABShowAsCompany) {
        SET_STRING(m_Company, DisplayName, aNotify, abSession);
    }
    else {
        // Use the order used in the OS X address book to set DisplayName.
        int order = flags & kABNameOrderingMask;
        if (order == kABDefaultNameOrdering) {
           order = [addressBook defaultNameOrdering];
        }

        nsAutoString displayName;
        if (order == kABFirstNameFirst) {
            displayName.Append(m_FirstName);
            displayName.Append(' ');
            displayName.Append(m_LastName);
        }
        else {
            displayName.Append(m_LastName);
            displayName.Append(' ');
            displayName.Append(m_FirstName);
        }
        SET_STRING(displayName, DisplayName, aNotify, abSession);
    }

    ABMultiValue *value = GetMultiValue(card, kABEmailProperty);
    if (value) {
        unsigned int count = [value count];
        if (count > 0) {
            unsigned int j = [value indexForIdentifier:[value primaryIdentifier]];

            if (j < count) {
                SET_STRING([value valueAtIndex:j], PrimaryEmail, aNotify,
                           abSession);
            }

            // If j is 0 (first in the list) we want the second in the list
            // (index 1), if j is anything else we want the first in the list
            // (index 0).
            j = (j == 0);
            if (j < count) {
                SET_STRING([value valueAtIndex:j], SecondEmail, aNotify,
                           abSession);
            }
        }
    }

    // We map the first home address we can find and the first work address
    // we can find. If we find none, we map the primary address to the home
    // address.
    if (!foundHome && !foundWork) {
        value = GetMultiValue(card, kABAddressProperty);
        if (value) {
            unsigned int j, count = [value count];
            j = [value indexForIdentifier:[value primaryIdentifier]];

            if (j < count) {
                NSDictionary *address = [value valueAtIndex:j];
                if (address) {
                    SET_STRING([address objectForKey:kABAddressStreetKey],
                               HomeAddress, aNotify, abSession);
                    SET_STRING([address objectForKey:kABAddressCityKey],
                               HomeCity, aNotify, abSession);
                    SET_STRING([address objectForKey:kABAddressStateKey],
                               HomeState, aNotify, abSession);
                    SET_STRING([address objectForKey:kABAddressZIPKey],
                               HomeZipCode, aNotify, abSession);
                    SET_STRING([address objectForKey:kABAddressCountryKey],
                               HomeCountry, aNotify, abSession);
                }
            }
        }
    }

    value = GetMultiValue(card, kABAIMInstantProperty);
    if (value) {
        unsigned int count = [value count];
        if (count > 0) {
            unsigned int j = [value indexForIdentifier:[value primaryIdentifier]];

            if (j < count) {
                SET_STRING([value valueAtIndex:j], AimScreenName, aNotify,
                           abSession);
            }
        }
    }

#define MAP_DATE(_date, _name, _notify, _session) \
    MapDate(this, _date, m_##_name##Year, #_name"Year", m_##_name##Month, \
            #_name"Month", m_##_name##Day, #_name"Day", _notify, _session)

    NSDate *date = [card valueForProperty:kABBirthdayProperty];
    if (date) {
        MAP_DATE(date, Birth, aNotify, abSession);
    }

    if (kABOtherDatesProperty) {
        value = GetMultiValue(card, kABOtherDatesProperty);
        if (value) {
            unsigned int j, count = [value count];
            for (j = 0; j < count; ++j) {
                if ([[value labelAtIndex:j] isEqualToString:kABAnniversaryLabel]) {
                    date = [value valueAtIndex:j];
                    if (date) {
                        MAP_DATE(date, Anniversary, aNotify, abSession);

                        break;
                    }
                }
            }
        }
    }
#undef MAP_DATE
#undef SET_STRING

    date = [card valueForProperty:kABModificationDateProperty];
    if (date) {
        m_LastModDate = PRUint32([date timeIntervalSince1970]);
        // XXX No way to notify about this?
    }

    return NS_OK;
}
