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
 * The Original Code is Mozilla XPCOM.
 *
 * The Initial Developer of the Original Code is
 * Benjamin Smedberg <benjamin@smedbergs.us>
 *
 * Portions created by the Initial Developer are Copyright (C) 2005
 * the Mozilla Foundation <http://www.mozilla.org/>. All Rights Reserved.
 *
 * Contributor(s):
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

#include "nsINIParserImpl.h"

#include "nsIComponentRegistrar.h"
#include "nsILocalFile.h"

#include "nsIGenericFactory.h"
#include "nsINIParser.h"
#include "nsStringEnumerator.h"
#include "nsVoidArray.h"

class nsINIParserImpl :
  public nsIINIParser
{
public:
  NS_DECL_ISUPPORTS
  NS_DECL_NSIINIPARSER

  nsresult Init(nsILocalFile* aINIFile) {
    return mParser.Init(aINIFile);
  }

private:
  nsINIParser mParser;
};

NS_IMPL_ISUPPORTS2(nsINIParserFactory,
                   nsIINIParserFactory,
                   nsIFactory)

NS_IMETHODIMP
nsINIParserFactory::CreateINIParser(nsILocalFile* aINIFile,
                                    nsIINIParser* *aResult)
{
  *aResult = nsnull;

  nsCOMPtr<nsINIParserImpl> p(new nsINIParserImpl());
  if (!p)
    return NS_ERROR_OUT_OF_MEMORY;

  nsresult rv = p->Init(aINIFile);

  if (NS_SUCCEEDED(rv))
    NS_ADDREF(*aResult = p);

  return rv;
}

NS_IMETHODIMP
nsINIParserFactory::CreateInstance(nsISupports* aOuter,
                                   REFNSIID aIID,
                                   void **aResult)
{
  NS_ENSURE_NO_AGGREGATION(aOuter);

  // We are our own singleton.
  return QueryInterface(aIID, aResult);
}

NS_IMETHODIMP
nsINIParserFactory::LockFactory(PRBool aLock)
{
  return NS_OK;
}

NS_IMPL_ISUPPORTS1(nsINIParserImpl,
                   nsIINIParser)

static PRBool
SectionCB(const char* aSection, void *aClosure)
{
  nsCStringArray *strings = NS_STATIC_CAST(nsCStringArray*, aClosure);

  strings->AppendCString(nsDependentCString(aSection));
  return PR_TRUE;
}

NS_IMETHODIMP
nsINIParserImpl::GetSections(nsIUTF8StringEnumerator* *aResult)
{
  nsCStringArray *strings = new nsCStringArray;
  if (!strings)
    return NS_ERROR_OUT_OF_MEMORY;

  nsresult rv = mParser.GetSections(SectionCB, strings);
  if (NS_SUCCEEDED(rv))
    rv = NS_NewUTF8StringEnumerator(aResult, strings);

  if (NS_FAILED(rv))
    delete strings;

  return rv;
}

static PRBool
KeyCB(const char* aKey, const char *aValue, void *aClosure)
{
  nsCStringArray *strings = NS_STATIC_CAST(nsCStringArray*, aClosure);

  strings->AppendCString(nsDependentCString(aKey));
  return PR_TRUE;
}

NS_IMETHODIMP
nsINIParserImpl::GetKeys(const nsACString& aSection,
                         nsIUTF8StringEnumerator* *aResult)
{
  nsCStringArray *strings = new nsCStringArray;
  if (!strings)
    return NS_ERROR_OUT_OF_MEMORY;

  nsresult rv = mParser.GetStrings(PromiseFlatCString(aSection).get(),
                                   KeyCB, strings);
  if (NS_SUCCEEDED(rv))
    rv = NS_NewUTF8StringEnumerator(aResult, strings);

  if (NS_FAILED(rv))
    delete strings;

  return rv;

}

NS_IMETHODIMP
nsINIParserImpl::GetString(const nsACString& aSection,
                           const nsACString& aKey,
                           nsACString& aResult)
{
  return mParser.GetString(PromiseFlatCString(aSection).get(),
                           PromiseFlatCString(aKey).get(),
                           aResult);
}

class nsINIParserModule : public nsIModule
{
  NS_DECL_NSIMODULE
  NS_DECL_ISUPPORTS_INHERITED
};

NS_IMPL_QUERY_INTERFACE1(nsINIParserModule,
                         nsIModule)

NS_IMETHODIMP_(nsrefcnt)
nsINIParserModule::AddRef()
{
  return 1;
}

NS_IMETHODIMP_(nsrefcnt)
nsINIParserModule::Release()
{
  return 1;
}

static NS_DEFINE_CID(kINIParserFactoryCID, NS_INIPARSERFACTORY_CID); 

NS_IMETHODIMP
nsINIParserModule::GetClassObject(nsIComponentManager* aCompMgr,
                                  const nsCID &aClass,
                                  const nsIID &aIID,
                                  void **aResult)
{
  if (!aClass.Equals(kINIParserFactoryCID))
    return NS_ERROR_FACTORY_NOT_REGISTERED;

  
  nsCOMPtr<nsIINIParserFactory> f(new nsINIParserFactory());
  return f->QueryInterface(aIID, aResult);
}

NS_IMETHODIMP
nsINIParserModule::RegisterSelf(nsIComponentManager* aCompMgr,
                                nsIFile* aLocation,
                                const char *aLoaderStr,
                                const char *aType)
{
  nsCOMPtr<nsIComponentRegistrar> reg(do_QueryInterface(aCompMgr));
  if (!reg)
    return NS_ERROR_NO_INTERFACE;

  return reg->RegisterFactoryLocation(kINIParserFactoryCID,
                                      "nsINIParserFactory",
                                      NS_INIPARSERFACTORY_CONTRACTID,
                                      aLocation,
                                      aLoaderStr,
                                      aType);
}

NS_IMETHODIMP
nsINIParserModule::UnregisterSelf(nsIComponentManager* aCompMgr,
                                  nsIFile* aLocation,
                                  const char *aLoaderStr)
{
  nsCOMPtr<nsIComponentRegistrar> reg(do_QueryInterface(aCompMgr));
  if (!reg)
    return NS_ERROR_NO_INTERFACE;

  return reg->UnregisterFactoryLocation(kINIParserFactoryCID,
                                        aLocation);
}

NS_IMETHODIMP
nsINIParserModule::CanUnload(nsIComponentManager* aCompMgr,
                             PRBool *aResult)
{
  *aResult = PR_FALSE;
  return NS_OK;
}

static const nsINIParserModule Module;

NSGETMODULE_ENTRY_POINT(xulrunner_util)
  (nsIComponentManager *aCompMgr,
   nsIFile* aLocation,
   nsIModule* *aResult)
{
  *aResult = NS_CONST_CAST(nsINIParserModule*, &Module);
  return NS_OK;
}
