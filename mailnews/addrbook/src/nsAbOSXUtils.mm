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
 * Portions created by the Initial Developer are Copyright (C) 2006
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

#include "nsAbOSXUtils.h"
#include "nsString.h"
#include "nsAbOSXCard.h"

#include <AddressBook/AddressBook.h>

NSString*
WrapString(const nsString &aString)
{
    PRUnichar* chars = NS_CONST_CAST(PRUnichar*, aString.get());

    return [NSString stringWithCharacters:chars
                                   length:aString.Length()];
}

void
AppendToString(const NSString *aString, nsString &aResult)
{
    if (aString) {
        const char *chars = [aString UTF8String];
        if (chars) {
            AppendUTF8toUTF16(chars, aResult);
        }
    }
}

void
AssignToString(const NSString *aString, nsString &aResult)
{
    if (aString) {
        const char *chars = [aString UTF8String];
        if (chars) {
            CopyUTF8toUTF16(chars, aResult);
        }
    }
}

void
AppendToCString(const NSString *aString, nsCString &aResult)
{
    if (aString) {
        const char *chars = [aString UTF8String];
        if (chars) {
            aResult.Append(chars);
        }
    }
}

// Some properties can't be easily mapped back and forth.
#define DONT_MAP(moz_name, osx_property, osx_label, osx_key)

#define DEFINE_PROPERTY(moz_name, osx_property, osx_label, osx_key) \
    { osx_property, osx_label, osx_key, &nsAbOSXCard::m_##moz_name, #moz_name },

const nsAbOSXPropertyMap nsAbOSXUtils::kPropertyMap[] = {
    DEFINE_PROPERTY(FirstName, kABFirstNameProperty, nil, nil)
    DEFINE_PROPERTY(LastName, kABLastNameProperty, nil, nil)
    DONT_MAP("DisplayName", nil, nil, nil)
    DEFINE_PROPERTY(PhoneticFirstName, kABFirstNamePhoneticProperty, nil, nil)
    DEFINE_PROPERTY(PhoneticLastName, kABLastNamePhoneticProperty, nil, nil)
    DEFINE_PROPERTY(NickName, kABNicknameProperty, nil, nil)
    DONT_MAP(PrimaryEmail, kABEmailProperty, nil, nil)
    DONT_MAP(SecondEmail, kABEmailProperty, nil, nil)
    DEFINE_PROPERTY(WorkPhone, kABPhoneProperty, kABPhoneWorkLabel, nil)
    DEFINE_PROPERTY(HomePhone, kABPhoneProperty, kABPhoneHomeLabel, nil)
    DEFINE_PROPERTY(FaxNumber, kABPhoneProperty, kABPhoneWorkFAXLabel, nil)
    DEFINE_PROPERTY(PagerNumber, kABPhoneProperty, kABPhonePagerLabel, nil)
    DEFINE_PROPERTY(CellularNumber, kABPhoneProperty, kABPhoneMobileLabel, nil)
    DEFINE_PROPERTY(HomeAddress, kABAddressProperty, kABAddressHomeLabel,
                    kABAddressStreetKey)
    DEFINE_PROPERTY(HomeCity, kABAddressProperty, kABAddressHomeLabel,
                    kABAddressCityKey)
    DEFINE_PROPERTY(HomeState, kABAddressProperty, kABAddressHomeLabel,
                    kABAddressStateKey)
    DEFINE_PROPERTY(HomeZipCode, kABAddressProperty, kABAddressHomeLabel,
                    kABAddressZIPKey)
    DEFINE_PROPERTY(HomeCountry, kABAddressProperty, kABAddressHomeLabel,
                    kABAddressCountryKey)
    DEFINE_PROPERTY(WorkAddress, kABAddressProperty, kABAddressWorkLabel,
                    kABAddressStreetKey)
    DEFINE_PROPERTY(WorkCity, kABAddressProperty, kABAddressWorkLabel,
                    kABAddressCityKey)
    DEFINE_PROPERTY(WorkState, kABAddressProperty, kABAddressWorkLabel,
                    kABAddressStateKey)
    DEFINE_PROPERTY(WorkZipCode, kABAddressProperty, kABAddressWorkLabel,
                    kABAddressZIPKey)
    DEFINE_PROPERTY(WorkCountry, kABAddressProperty, kABAddressWorkLabel,
                    kABAddressCountryKey)
    DEFINE_PROPERTY(JobTitle, kABJobTitleProperty, nil, nil)
    DEFINE_PROPERTY(Department, kABDepartmentProperty, nil, nil)
    DEFINE_PROPERTY(Company, kABOrganizationProperty, nil, nil)
    DONT_MAP(_AimScreenName, kABAIMInstantProperty, nil, nil)
    DEFINE_PROPERTY(WebPage1, kABHomePageProperty, nil, nil)
    DONT_MAP(WebPage2, kABHomePageProperty, nil, nil)
    DONT_MAP(BirthYear, "birthyear", nil, nil)
    DONT_MAP(BirthMonth, "birthmonth", nil, nil)
    DONT_MAP(BirthDay, "birthday", nil, nil)
    DONT_MAP(Custom1, "custom1", nil, nil)
    DONT_MAP(Custom2, "custom2", nil, nil)
    DONT_MAP(Custom3, "custom3", nil, nil)
    DONT_MAP(Custom4, "custom4", nil, nil)
    DEFINE_PROPERTY(Note, kABNoteProperty, nil, nil)
    DONT_MAP("PreferMailFormat", nil, nil, nil)
    DONT_MAP("LastModifiedDate", modifytimestamp, nil, nil)
};

const PRUint32 nsAbOSXUtils::kPropertyMapSize =
    NS_ARRAY_LENGTH(nsAbOSXUtils::kPropertyMap);
