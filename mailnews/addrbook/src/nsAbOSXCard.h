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

#ifndef nsAbOSXCard_h___
#define nsAbOSXCard_h___

#include "nsAbCardProperty.h"
#include "nsRDFResource.h"

struct nsStringPropertyMap;

#define NS_ABOSXCARD_URI_PREFIX NS_ABOSXCARD_PREFIX "://"

#define NS_IABOSXCARD_IID \
  { 0xa7e5b697, 0x772d, 0x4fb5, \
    { 0x81, 0x16, 0x23, 0xb7, 0x5a, 0xac, 0x94, 0x56 } }

class nsIAbOSXCard : public nsISupports
{
public:
    NS_DEFINE_STATIC_IID_ACCESSOR(NS_IABOSXCARD_IID)

    virtual nsresult Update(PRBool aNotify) = 0;
};

class nsAbOSXCard : public nsRDFResource, 
                    public nsAbCardProperty,
                    public nsIAbOSXCard
{
public:
    NS_DECL_ISUPPORTS_INHERITED
    
    // nsIRDFResource method
    NS_IMETHOD Init(const char *aUri);

    nsresult Update(PRBool aNotify);

    friend class nsAbOSXUtils;
};

#endif // nsAbOSXCard_h___
