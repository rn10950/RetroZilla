/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*-
 *
 * ***** BEGIN LICENSE BLOCK *****
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
 * Netscape Communications Corporation.
 * Portions created by the Initial Developer are Copyright (C) 1998
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Hubbie Shaw
 *   Doug Turner <dougt@netscape.com>
 *   Mitch Stoltz <mstoltz@netscape.com>
 *   Brian Ryner <bryner@brianryner.com>
 *   Kai Engert <kaie@netscape.com>
 *   Vipul Gupta <vipul.gupta@sun.com>
 *   Douglas Stebila <douglas@stebila.ca>
 *   Kai Engert <kengert@redhat.com>
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

#include "nsNSSComponent.h"
#include "nsNSSCallbacks.h"
#include "nsNSSIOLayer.h"
#include "nsSSLThread.h"
#include "nsCertVerificationThread.h"
#include "nsNSSEvent.h"

#include "nsNetUtil.h"
#include "nsAppDirectoryServiceDefs.h"
#include "nsDirectoryService.h"
#include "nsIStreamListener.h"
#include "nsIStringBundle.h"
#include "nsIDirectoryService.h"
#include "nsIDOMNode.h"
#include "nsCURILoader.h"
#include "nsDirectoryServiceDefs.h"
#include "nsIProxyObjectManager.h"
#include "nsIX509Cert.h"
#include "nsIX509CertDB.h"
#include "nsIProfileChangeStatus.h"
#include "nsNSSCertificate.h"
#include "nsNSSHelper.h"
#include "nsSmartCardMonitor.h"
#include "prlog.h"
#include "nsIPrefService.h"
#include "nsIPrefBranch.h"
#include "nsIPrefBranch2.h"
#include "nsIDateTimeFormat.h"
#include "nsDateTimeFormatCID.h"
#include "nsAutoLock.h"
#include "nsIEventQueue.h"
#include "nsIDOMEvent.h"
#include "nsIDOMDocument.h"
#include "nsIDOMDocumentEvent.h"
#include "nsIDOMWindow.h"
#include "nsIDOMWindowCollection.h"
#include "nsIDOMWindowInternal.h"
#include "nsIDOMSmartCardEvent.h"
#include "nsIDOMCrypto.h"
#include "nsIRunnable.h"
#include "plevent.h"
#include "nsCRT.h"
#include "nsCRLInfo.h"

#include "nsIWindowWatcher.h"
#include "nsIPrompt.h"
#include "nsProxiedService.h"
#include "nsIPrincipal.h"
#include "nsReadableUtils.h"
#include "nsIDateTimeFormat.h"
#include "prtypes.h"
#include "nsInt64.h"
#include "nsTime.h"
#include "nsIEntropyCollector.h"
#include "nsIBufEntropyCollector.h"
#include "nsIServiceManager.h"
#include "nsILocalFile.h"
#include "nsITokenPasswordDialogs.h"
#include "nsICRLManager.h"
#include "nsNSSShutDown.h"
#include "nsSmartCardEvent.h"
#include "nsICryptoHash.h"

#include "nss.h"
#include "pk11func.h"
#include "ssl.h"
#include "sslproto.h"
#include "secmod.h"
#include "sechash.h"
#include "secmime.h"
#include "ocsp.h"
#include "cms.h"
#include "nssckbi.h"
#include "base64.h"

extern "C" {
#include "pkcs12.h"
#include "p12plcy.h"
}

#ifdef PR_LOGGING
PRLogModuleInfo* gPIPNSSLog = nsnull;
#endif

#define NS_CRYPTO_HASH_BUFFER_SIZE 4096

static NS_DEFINE_CID(kNSSComponentCID, NS_NSSCOMPONENT_CID);
int nsNSSComponent::mInstanceCount = 0;

// XXX tmp callback for slot password
extern char * PR_CALLBACK 
pk11PasswordPrompt(PK11SlotInfo *slot, PRBool retry, void *arg);

#define PIPNSS_STRBUNDLE_URL "chrome://pipnss/locale/pipnss.properties"


static PLHashNumber PR_CALLBACK certHashtable_keyHash(const void *key)
{
  if (!key)
    return 0;
  
  SECItem *certKey = (SECItem*)key;
  
  // lazy hash function, sum up all char values of SECItem
  
  PLHashNumber hash = 0;
  unsigned int i = 0;
  unsigned char *c = certKey->data;
  
  for (i = 0; i < certKey->len; ++i, ++c) {
    hash += *c;
  }
  
  return hash;
}

static PRIntn PR_CALLBACK certHashtable_keyCompare(const void *k1, const void *k2)
{
  // return type is a bool, answering the question "are the keys equal?"

  if (!k1 || !k2)
    return PR_FALSE;
  
  SECItem *certKey1 = (SECItem*)k1;
  SECItem *certKey2 = (SECItem*)k2;
  
  if (certKey1->len != certKey2->len) {
    return PR_FALSE;
  }
  
  unsigned int i = 0;
  unsigned char *c1 = certKey1->data;
  unsigned char *c2 = certKey2->data;
  
  for (i = 0; i < certKey1->len; ++i, ++c1, ++c2) {
    if (*c1 != *c2) {
      return PR_FALSE;
    }
  }
  
  return PR_TRUE;
}

static PRIntn PR_CALLBACK certHashtable_valueCompare(const void *v1, const void *v2)
{
  // two values are identical if their keys are identical
  
  if (!v1 || !v2)
    return PR_FALSE;
  
  CERTCertificate *cert1 = (CERTCertificate*)v1;
  CERTCertificate *cert2 = (CERTCertificate*)v2;
  
  return certHashtable_keyCompare(&cert1->certKey, &cert2->certKey);
}

static PRIntn PR_CALLBACK certHashtable_clearEntry(PLHashEntry *he, PRIntn /*index*/, void * /*userdata*/)
{
  if (he && he->value) {
    CERT_DestroyCertificate((CERTCertificate*)he->value);
  }
  
  return HT_ENUMERATE_NEXT;
}

struct CRLDownloadEvent : PLEvent {
  nsCAutoString *urlString;
  nsIStreamListener *psmDownloader;
};

// Note that nsNSSComponent is a singleton object across all threads, 
// and automatic downloads are always scheduled sequentially - that is, 
// once one crl download is complete, the next one is scheduled
static void PR_CALLBACK HandleCRLImportPLEvent(CRLDownloadEvent *aEvent)
{
  nsresult rv;
  nsIURI *pURL;
  
  if((aEvent->psmDownloader==nsnull) || (aEvent->urlString==nsnull) )
    return;

  rv = NS_NewURI(&pURL, aEvent->urlString->get());
  if(NS_SUCCEEDED(rv)){
    NS_OpenURI(aEvent->psmDownloader, nsnull, pURL);
  }
}

static void PR_CALLBACK DestroyCRLImportPLEvent(CRLDownloadEvent* aEvent)
{
  delete aEvent->urlString;
  delete aEvent;
}

//This class is used to run the callback code
//passed to the event handlers for smart card notification
class nsTokenEventRunnable : public nsIRunnable {
public:
  nsTokenEventRunnable(const nsAString &aType, const nsAString &aTokenName);
  virtual ~nsTokenEventRunnable();

  NS_IMETHOD Run ();
  NS_DECL_ISUPPORTS
private:
  nsString mType;
  nsString mTokenName;
};

// ISuuports implementation for nsTokenEventRunnable
NS_IMPL_THREADSAFE_ISUPPORTS1(nsTokenEventRunnable, nsIRunnable)

nsTokenEventRunnable::nsTokenEventRunnable(const nsAString &aType, 
   const nsAString &aTokenName): mType(aType), mTokenName(aTokenName) { }

nsTokenEventRunnable::~nsTokenEventRunnable() { }

//Implementation that runs the callback passed to 
//crypto.generateCRMFRequest as an event.
NS_IMETHODIMP
nsTokenEventRunnable::Run()
{ 
  nsresult rv;
  nsCOMPtr<nsINSSComponent> nssComponent(do_GetService(kNSSComponentCID, &rv));
  if (NS_FAILED(rv))
    return rv;

  return nssComponent->DispatchEvent(mType, mTokenName);
}

// We must ensure that the nsNSSComponent has been loaded before
// creating any other components.
PRBool EnsureNSSInitialized(EnsureNSSOperator op)
{
  static PRBool loading = PR_FALSE;
  static PRBool haveLoaded = PR_FALSE;

  switch (op)
  {
    // In following 4 cases we are protected by monitor of XPCOM component
    // manager - we are inside of do_GetService call for nss component, so it is
    // safe to move with the flags here.
  case nssLoading:
    if (loading)
      return PR_FALSE; // We are reentered during nss component creation
    loading = PR_TRUE;
    return PR_TRUE;

  case nssInitSucceeded:
    NS_ASSERTION(loading, "Bad call to EnsureNSSInitialized(nssInitSucceeded)");
    loading = PR_FALSE;
    haveLoaded = PR_TRUE;
    return PR_TRUE;

  case nssInitFailed:
    NS_ASSERTION(loading, "Bad call to EnsureNSSInitialized(nssInitFailed)");
    loading = PR_FALSE;
    // no break

  case nssShutdown:
    haveLoaded = PR_FALSE;
    return PR_FALSE;

    // In this case we are called from a component to ensure nss initilization.
    // If the component has not yet been loaded and is not currently loading
    // call do_GetService for nss component to ensure it.
  case nssEnsure:
    // We are reentered during nss component creation or nss component 
    // is already up
    if (haveLoaded || loading)
      return PR_TRUE;

    {
    nsCOMPtr<nsISupports> nssComponent 
      = do_GetService(PSM_COMPONENT_CONTRACTID);

    // Nss component failed to initialize, inform the caller of that fact.
    // Flags are appropriately set by component constructor itself.
    if (!nssComponent)
      return PR_FALSE;

    return PR_TRUE;
    }

  default:
    NS_ASSERTION(PR_FALSE, "Bad operator to EnsureNSSInitialized");
    return PR_FALSE;
  }
}

nsNSSComponent::nsNSSComponent()
  :mNSSInitialized(PR_FALSE), mThreadList(nsnull),
   mSSLThread(NULL), mCertVerificationThread(NULL)
{
  mutex = PR_NewLock();
  
#ifdef PR_LOGGING
  if (!gPIPNSSLog)
    gPIPNSSLog = PR_NewLogModule("pipnss");
#endif
  PR_LOG(gPIPNSSLog, PR_LOG_DEBUG, ("nsNSSComponent::ctor\n"));
  mUpdateTimerInitialized = PR_FALSE;
  crlDownloadTimerOn = PR_FALSE;
  crlsScheduledForDownload = nsnull;
  mTimer = nsnull;
  mCrlTimerLock = nsnull;
  mObserversRegistered = PR_FALSE;

  NS_ASSERTION( (0 == mInstanceCount), "nsNSSComponent is a singleton, but instantiated multiple times!");
  ++mInstanceCount;
  hashTableCerts = nsnull;
  mShutdownObjectList = nsNSSShutDownList::construct();
  mIsNetworkDown = PR_FALSE;
}

nsNSSComponent::~nsNSSComponent()
{
  if (mSSLThread)
  {
    mSSLThread->requestExit();
    delete mSSLThread;
    mSSLThread = nsnull;
  }
  
  if (mCertVerificationThread)
  {
    mCertVerificationThread->requestExit();
    delete mCertVerificationThread;
    mCertVerificationThread = nsnull;
  }

  PR_LOG(gPIPNSSLog, PR_LOG_DEBUG, ("nsNSSComponent::dtor\n"));

  if(mUpdateTimerInitialized == PR_TRUE){
    PR_Lock(mCrlTimerLock);
    if(crlDownloadTimerOn == PR_TRUE){
      mTimer->Cancel();
    }
    crlDownloadTimerOn = PR_FALSE;
    PR_Unlock(mCrlTimerLock);
    PR_DestroyLock(mCrlTimerLock);
    if(crlsScheduledForDownload != nsnull){
      crlsScheduledForDownload->Reset();
      delete crlsScheduledForDownload;
    }

    mUpdateTimerInitialized = PR_FALSE;
  }

  // All cleanup code requiring services needs to happen in xpcom_shutdown

  ShutdownNSS();
  nsSSLIOLayerHelpers::Cleanup();
  --mInstanceCount;
  delete mShutdownObjectList;

  if (mutex) {
    PR_DestroyLock(mutex);
    mutex = nsnull;
  }

  // We are being freed, drop the haveLoaded flag to re-enable
  // potential nss initialization later.
  EnsureNSSInitialized(nssShutdown);

  PR_LOG(gPIPNSSLog, PR_LOG_DEBUG, ("nsNSSComponent::dtor finished\n"));
}

NS_IMETHODIMP
nsNSSComponent::PostEvent(const nsAString &eventType, 
                                                  const nsAString &tokenName)
{
  nsresult rv;
  nsTokenEventRunnable *runnable = 
                               new nsTokenEventRunnable(eventType, tokenName);
  if (!runnable) {
    return NS_ERROR_OUT_OF_MEMORY;
  }

  rv = nsNSSEventPostToUIEventQueue(runnable);
  if (NS_FAILED(rv))
    delete runnable;

  return rv;
}


NS_IMETHODIMP
nsNSSComponent::DispatchEvent(const nsAString &eventType,
                                                 const nsAString &tokenName)
{
  // 'Dispatch' the event to all the windows. 'DispatchEventToWindow()' will
  // first check to see if a given window has requested crypto events.
  nsresult rv;
  nsCOMPtr<nsIWindowWatcher> windowWatcher =
                            do_GetService(NS_WINDOWWATCHER_CONTRACTID, &rv);

  if (NS_FAILED(rv)) {
    return rv;
  }

  nsCOMPtr<nsISimpleEnumerator> enumerator;
  rv = windowWatcher->GetWindowEnumerator(getter_AddRefs(enumerator));
  if (NS_FAILED(rv)) {
    return rv;
  }

  PRBool hasMoreWindows;

  while (NS_SUCCEEDED(enumerator->HasMoreElements(&hasMoreWindows))
         && hasMoreWindows) {
    nsCOMPtr<nsISupports> supports;
    enumerator->GetNext(getter_AddRefs(supports));
    nsCOMPtr<nsIDOMWindow> domWin(do_QueryInterface(supports));
    if (domWin) {
      nsresult rv2 = DispatchEventToWindow(domWin, eventType, tokenName);
      if (NS_FAILED(rv2)) {
        // return the last failure, don't let a single failure prevent
        // continued delivery of events.
        rv = rv2;
      }
    }
  }
  return rv;
}

nsresult
nsNSSComponent::DispatchEventToWindow(nsIDOMWindow *domWin,
                      const nsAString &eventType, const nsAString &tokenName)
{
  // first walk the children and dispatch their events 
  {
    nsresult rv;
    nsCOMPtr<nsIDOMWindowCollection> frames;
    rv = domWin->GetFrames(getter_AddRefs(frames));
    if (NS_FAILED(rv)) {
      return rv;
    }

    PRUint32 length;
    frames->GetLength(&length);
    PRUint32 i;
    for (i = 0; i < length; i++) {
      nsCOMPtr<nsIDOMWindow> childWin;
      frames->Item(i, getter_AddRefs(childWin));
      DispatchEventToWindow(childWin, eventType, tokenName);
    }
  }

  // check if we've enabled smart card events on this window
  // NOTE: it's not an error to say that we aren't going to dispatch
  // the event.
  {
    nsCOMPtr<nsIDOMWindowInternal> intWindow = do_QueryInterface(domWin);
    if (!intWindow) {
      return NS_OK; // nope, it's not an internal window
    }

    nsCOMPtr<nsIDOMCrypto> crypto;
    intWindow->GetCrypto(getter_AddRefs(crypto));
    if (!crypto) {
      return NS_OK; // nope, it doesn't have a crypto property
    }

    PRBool boolrv;
    crypto->GetEnableSmartCardEvents(&boolrv);
    if (!boolrv) {
      return NS_OK; // nope, it's not enabled.
    }
  }

  // dispatch the event ...

  nsresult rv;
  // find the document
  nsCOMPtr<nsIDOMDocument> doc;
  rv = domWin->GetDocument(getter_AddRefs(doc));
  if (doc == nsnull) {
    return NS_FAILED(rv) ? rv : NS_ERROR_FAILURE;
  }

  // create the event
  nsCOMPtr<nsIDOMDocumentEvent> docEvent = do_QueryInterface(doc, &rv);
  if (NS_FAILED(rv)) {
    return rv;
  }

  nsCOMPtr<nsIDOMEvent> event;
  rv = docEvent->CreateEvent(NS_LITERAL_STRING("Events"), 
                             getter_AddRefs(event));
  if (NS_FAILED(rv)) {
    return rv;
  }

  event->InitEvent(eventType, false, true);

  // create the Smart Card Event;
  nsCOMPtr<nsIDOMSmartCardEvent> smartCardEvent = 
                                          new nsSmartCardEvent(tokenName);
  // init the smart card event, fail here if we can't complete the 
  // initialization.
  if (!smartCardEvent) {
    return NS_ERROR_OUT_OF_MEMORY;
  }

  rv = smartCardEvent->Init(event);
  if (NS_FAILED(rv)) {
    return rv;
  }

  // Send it 
  nsCOMPtr<nsIDOMEventTarget> target = do_QueryInterface(doc, &rv);
  if (NS_FAILED(rv)) {
    return rv;
  }

  PRBool boolrv;
  rv = target->DispatchEvent(smartCardEvent, &boolrv);
  return rv;
}


static void setOCSPOptions(nsIPrefBranch * pref);

NS_IMETHODIMP
nsNSSComponent::PIPBundleFormatStringFromName(const char *name,
                                              const PRUnichar **params,
                                              PRUint32 numParams,
                                              nsAString &outString)
{
  nsresult rv = NS_ERROR_FAILURE;

  if (mPIPNSSBundle && name) {
    nsXPIDLString result;
    rv = mPIPNSSBundle->FormatStringFromName(NS_ConvertASCIItoUTF16(name).get(),
                                             params, numParams,
                                             getter_Copies(result));
    if (NS_SUCCEEDED(rv)) {
      outString = result;
    }
  }
  return rv;
}

NS_IMETHODIMP
nsNSSComponent::GetPIPNSSBundleString(const char *name,
                                      nsAString &outString)
{
  nsresult rv = NS_ERROR_FAILURE;

  outString.SetLength(0);
  if (mPIPNSSBundle && name) {
    nsXPIDLString result;
    rv = mPIPNSSBundle->GetStringFromName(NS_ConvertASCIItoUTF16(name).get(),
                                          getter_Copies(result));
    if (NS_SUCCEEDED(rv)) {
      outString = result;
      rv = NS_OK;
    }
  }

  return rv;
}


NS_IMETHODIMP
nsNSSComponent::SkipOcsp()
{
  nsNSSShutDownPreventionLock locker;
  CERTCertDBHandle *certdb = CERT_GetDefaultCertDB();

  SECStatus rv = CERT_DisableOCSPChecking(certdb);
  return (rv == SECSuccess) ? NS_OK : NS_ERROR_FAILURE;
}

NS_IMETHODIMP
nsNSSComponent::SkipOcspOff()
{
  setOCSPOptions(mPrefBranch);
  return NS_OK;
}

void
nsNSSComponent::LaunchSmartCardThreads()
{
  nsNSSShutDownPreventionLock locker;
  {
    SECMODModuleList *list = SECMOD_GetDefaultModuleList();
    SECMODListLock *lock = SECMOD_GetDefaultModuleListLock();
    SECMOD_GetReadLock(lock);

    while (list) {
      SECMODModule *module = list->module;
      LaunchSmartCardThread(module);
      list = list->next;
    }
    SECMOD_ReleaseReadLock(lock);
  }
}

NS_IMETHODIMP
nsNSSComponent::LaunchSmartCardThread(SECMODModule *module)
{
  SmartCardMonitoringThread *newThread;
  if (SECMOD_HasRemovableSlots(module)) {
    if (mThreadList == nsnull) {
      mThreadList = new SmartCardThreadList();
      if (!mThreadList) {
        return NS_ERROR_OUT_OF_MEMORY;
      }
    }
    newThread = new SmartCardMonitoringThread(module);
    if (!newThread) {
	return NS_ERROR_OUT_OF_MEMORY;
    }
    // newThread is adopted by the add.
    return mThreadList->Add(newThread);
  }
  return NS_OK;
}

NS_IMETHODIMP
nsNSSComponent::ShutdownSmartCardThread(SECMODModule *module)
{
  if (!mThreadList) {
    return NS_OK;
  }
  mThreadList->Remove(module);
  return NS_OK;
}

void
nsNSSComponent::ShutdownSmartCardThreads()
{
  delete mThreadList;
  mThreadList = nsnull;
}

void
nsNSSComponent::InstallLoadableRoots()
{
  nsNSSShutDownPreventionLock locker;
  SECMODModule *RootsModule = nsnull;

  {
    // Find module containing root certs

    SECMODModuleList *list = SECMOD_GetDefaultModuleList();
    SECMODListLock *lock = SECMOD_GetDefaultModuleListLock();
    SECMOD_GetReadLock(lock);

    while (!RootsModule && list) {
      SECMODModule *module = list->module;

      for (int i=0; i < module->slotCount; i++) {
        PK11SlotInfo *slot = module->slots[i];
        if (PK11_IsPresent(slot)) {
          if (PK11_HasRootCerts(slot)) {
            RootsModule = SECMOD_ReferenceModule(module);
            break;
          }
        }
      }

      list = list->next;
    }
    SECMOD_ReleaseReadLock(lock);
  }

  if (RootsModule) {
    // Check version, and unload module if it is too old

    CK_INFO info;
    if (SECSuccess != PK11_GetModInfo(RootsModule, &info)) {
      // Do not use this module
      SECMOD_DestroyModule(RootsModule);
      RootsModule = nsnull;
    }
    else {
      // NSS_BUILTINS_LIBRARY_VERSION_MAJOR and NSS_BUILTINS_LIBRARY_VERSION_MINOR
      // define the version we expect to have.
      // Later version are fine.
      // Older versions are not ok, and we will replace with our own version.

      if (
            (info.libraryVersion.major < NSS_BUILTINS_LIBRARY_VERSION_MAJOR)
          || 
            (info.libraryVersion.major == NSS_BUILTINS_LIBRARY_VERSION_MAJOR
             && info.libraryVersion.minor < NSS_BUILTINS_LIBRARY_VERSION_MINOR)
         ) {
        PRInt32 modType;
        SECMOD_DeleteModule(RootsModule->commonName, &modType);
        SECMOD_DestroyModule(RootsModule);

        RootsModule = nsnull;
      }
    }
  }

  if (RootsModule) {
    SECMOD_DestroyModule(RootsModule);
  } else { /* !RootsModule */
    // Load roots module from our installation path
  
    nsresult rv;
    nsAutoString modName;
    rv = GetPIPNSSBundleString("RootCertModuleName", modName);
    if (NS_FAILED(rv)) return;

    nsCOMPtr<nsIProperties> directoryService(do_GetService(NS_DIRECTORY_SERVICE_CONTRACTID));
    if (!directoryService)
      return;

    const char *possible_ckbi_locations[] = {
      NS_GRE_DIR,
      NS_XPCOM_CURRENT_PROCESS_DIR,
      0 // This special value means: 
        //   search for ckbi in the directories on the shared
        //   library/DLL search path
    };

    for (size_t il = 0; il < sizeof(possible_ckbi_locations)/sizeof(const char*); ++il) {
      nsCOMPtr<nsILocalFile> mozFile;
      char *fullModuleName = nsnull;

      if (!possible_ckbi_locations[il])
      {
        fullModuleName = PR_GetLibraryName(nsnull, "nssckbi");
      }
      else
      {
        directoryService->Get( possible_ckbi_locations[il],
                               NS_GET_IID(nsILocalFile), 
                               getter_AddRefs(mozFile));
    
        if (!mozFile) {
          continue;
        }

        nsCAutoString processDir;
        mozFile->GetNativePath(processDir);
        fullModuleName = PR_GetLibraryName(processDir.get(), "nssckbi");
      }

      /* If a module exists with the same name, delete it. */
      NS_ConvertUCS2toUTF8 modNameUTF8(modName);
      int modType;
      SECMOD_DeleteModule(NS_CONST_CAST(char*, modNameUTF8.get()), &modType);
      SECStatus rv_add = 
        SECMOD_AddNewModule(NS_CONST_CAST(char*, modNameUTF8.get()), fullModuleName, 0, 0);
      PR_FreeLibraryName(fullModuleName); // allocated by NSPR
      if (SECSuccess == rv_add) {
        // found a module, no need to try other directories
        break;
      }
    }
  }
}

nsresult
nsNSSComponent::ConfigureInternalPKCS11Token()
{
  nsNSSShutDownPreventionLock locker;
  nsAutoString manufacturerID;
  nsAutoString libraryDescription;
  nsAutoString tokenDescription;
  nsAutoString privateTokenDescription;
  nsAutoString slotDescription;
  nsAutoString privateSlotDescription;
  nsAutoString fipsSlotDescription;
  nsAutoString fipsPrivateSlotDescription;

  nsresult rv;
  rv = GetPIPNSSBundleString("ManufacturerID", manufacturerID);
  if (NS_FAILED(rv)) return rv;

  rv = GetPIPNSSBundleString("LibraryDescription", libraryDescription);
  if (NS_FAILED(rv)) return rv;

  rv = GetPIPNSSBundleString("TokenDescription", tokenDescription);
  if (NS_FAILED(rv)) return rv;

  rv = GetPIPNSSBundleString("PrivateTokenDescription", privateTokenDescription);
  if (NS_FAILED(rv)) return rv;

  rv = GetPIPNSSBundleString("SlotDescription", slotDescription);
  if (NS_FAILED(rv)) return rv;

  rv = GetPIPNSSBundleString("PrivateSlotDescription", privateSlotDescription);
  if (NS_FAILED(rv)) return rv;

  rv = GetPIPNSSBundleString("FipsSlotDescription", fipsSlotDescription);
  if (NS_FAILED(rv)) return rv;

  rv = GetPIPNSSBundleString("FipsPrivateSlotDescription", fipsPrivateSlotDescription);
  if (NS_FAILED(rv)) return rv;

  PK11_ConfigurePKCS11(NS_ConvertUCS2toUTF8(manufacturerID).get(),
                       NS_ConvertUCS2toUTF8(libraryDescription).get(),
                       NS_ConvertUCS2toUTF8(tokenDescription).get(),
                       NS_ConvertUCS2toUTF8(privateTokenDescription).get(),
                       NS_ConvertUCS2toUTF8(slotDescription).get(),
                       NS_ConvertUCS2toUTF8(privateSlotDescription).get(),
                       NS_ConvertUCS2toUTF8(fipsSlotDescription).get(),
                       NS_ConvertUCS2toUTF8(fipsPrivateSlotDescription).get(),
                       0, 0);
  return NS_OK;
}

nsresult
nsNSSComponent::InitializePIPNSSBundle()
{
  // Called during init only, no mutex required.

  nsresult rv;
  nsCOMPtr<nsIStringBundleService> bundleService(do_GetService(NS_STRINGBUNDLE_CONTRACTID, &rv));
  if (NS_FAILED(rv) || !bundleService) 
    return NS_ERROR_FAILURE;
  
  bundleService->CreateBundle(PIPNSS_STRBUNDLE_URL,
                              getter_AddRefs(mPIPNSSBundle));
  if (!mPIPNSSBundle)
    rv = NS_ERROR_FAILURE;

  return rv;
}

nsresult
nsNSSComponent::RegisterPSMContentListener()
{
  // Called during init only, no mutex required.

  nsresult rv = NS_OK;
  if (!mPSMContentListener) {
    nsCOMPtr<nsIURILoader> dispatcher(do_GetService(NS_URI_LOADER_CONTRACTID));
    if (dispatcher) {
      mPSMContentListener = do_CreateInstance(NS_PSMCONTENTLISTEN_CONTRACTID);
      rv = dispatcher->RegisterContentListener(mPSMContentListener);
    }
  }
  return rv;
}

/* Table of pref names and SSL cipher ID */
typedef struct {
  const char* pref;
  long id;
} CipherPref;

static CipherPref CipherPrefs[] = {
/* SSL2 cipher suites, all use RSA and an MD5 MAC */
 {"security.ssl2.rc4_128", SSL_EN_RC4_128_WITH_MD5}, // 128-bit RC4 encryption with RSA and an MD5 MAC
 {"security.ssl2.rc2_128", SSL_EN_RC2_128_CBC_WITH_MD5}, // 128-bit RC2 encryption with RSA and an MD5 MAC
 {"security.ssl2.des_ede3_192", SSL_EN_DES_192_EDE3_CBC_WITH_MD5}, // 168-bit Triple DES encryption with RSA and MD5 MAC 
 {"security.ssl2.des_64", SSL_EN_DES_64_CBC_WITH_MD5}, // 56-bit DES encryption with RSA and an MD5 MAC
 {"security.ssl2.rc4_40", SSL_EN_RC4_128_EXPORT40_WITH_MD5}, // 40-bit RC4 encryption with RSA and an MD5 MAC (export)
 {"security.ssl2.rc2_40", SSL_EN_RC2_128_CBC_EXPORT40_WITH_MD5}, // 40-bit RC2 encryption with RSA and an MD5 MAC (export)
 /* Fortezza SSL3/TLS cipher suites, see bug 133502 */
 {"security.ssl3.fortezza_fortezza_sha", SSL_FORTEZZA_DMS_WITH_FORTEZZA_CBC_SHA},
 {"security.ssl3.fortezza_rc4_sha", SSL_FORTEZZA_DMS_WITH_RC4_128_SHA},
 {"security.ssl3.fortezza_null_sha", SSL_FORTEZZA_DMS_WITH_NULL_SHA},
 /* SSL3/TLS cipher suites*/
 {"security.ssl3.rsa_rc4_128_md5", SSL_RSA_WITH_RC4_128_MD5}, // 128-bit RC4 encryption with RSA and an MD5 MAC
 {"security.ssl3.rsa_rc4_128_sha", SSL_RSA_WITH_RC4_128_SHA}, // 128-bit RC4 encryption with RSA and a SHA1 MAC
 {"security.ssl3.rsa_fips_des_ede3_sha", SSL_RSA_FIPS_WITH_3DES_EDE_CBC_SHA}, // 168-bit Triple DES with RSA and a SHA1 MAC (FIPS)
 {"security.ssl3.rsa_des_ede3_sha", SSL_RSA_WITH_3DES_EDE_CBC_SHA}, // 168-bit Triple DES with RSA and a SHA1 MAC
 {"security.ssl3.rsa_fips_des_sha", SSL_RSA_FIPS_WITH_DES_CBC_SHA}, // 56-bit DES encryption with RSA and a SHA1 MAC (FIPS)
 {"security.ssl3.rsa_des_sha", SSL_RSA_WITH_DES_CBC_SHA}, // 56-bit DES encryption with RSA and a SHA1 MAC
 {"security.ssl3.rsa_1024_rc4_56_sha", TLS_RSA_EXPORT1024_WITH_RC4_56_SHA}, // 56-bit RC4 encryption with RSA and a SHA1 MAC (export)
 {"security.ssl3.rsa_1024_des_cbc_sha", TLS_RSA_EXPORT1024_WITH_DES_CBC_SHA}, // 56-bit DES encryption with RSA and a SHA1 MAC (export)
 {"security.ssl3.rsa_rc4_40_md5", SSL_RSA_EXPORT_WITH_RC4_40_MD5}, // 40-bit RC4 encryption with RSA and an MD5 MAC (export)
 {"security.ssl3.rsa_rc2_40_md5", SSL_RSA_EXPORT_WITH_RC2_CBC_40_MD5}, // 40-bit RC2 encryption with RSA and an MD5 MAC (export)
 /* Extra SSL3/TLS cipher suites */
 {"security.ssl3.dhe_rsa_aes_256_sha", TLS_DHE_RSA_WITH_AES_256_CBC_SHA}, // 256-bit AES encryption with RSA, DHE, and a SHA1 MAC
 {"security.ssl3.dhe_dss_aes_256_sha", TLS_DHE_DSS_WITH_AES_256_CBC_SHA}, // 256-bit AES encryption with DSA, DHE, and a SHA1 MAC
 {"security.ssl3.rsa_aes_256_sha", TLS_RSA_WITH_AES_256_CBC_SHA}, // 256-bit AES encryption with RSA and a SHA1 MAC
   /* TLS_DHE_DSS_WITH_RC4_128_SHA // 128-bit RC4 encryption with DSA, DHE, and a SHA1 MAC
      If this cipher gets included at a later time, it should get added at this position */
 {"security.ssl3.ecdhe_ecdsa_aes_256_sha", TLS_ECDHE_ECDSA_WITH_AES_256_CBC_SHA}, // 256-bit AES encryption with ECDHE-ECDSA and a SHA1 MAC
 {"security.ssl3.ecdhe_ecdsa_aes_128_sha", TLS_ECDHE_ECDSA_WITH_AES_128_CBC_SHA}, // 128-bit AES encryption with ECDHE-ECDSA and a SHA1 MAC
 {"security.ssl3.ecdhe_ecdsa_des_ede3_sha", TLS_ECDHE_ECDSA_WITH_3DES_EDE_CBC_SHA}, // 168-bit Triple DES with ECDHE-ECDSA and a SHA1 MAC
 {"security.ssl3.ecdhe_ecdsa_rc4_128_sha", TLS_ECDHE_ECDSA_WITH_RC4_128_SHA}, // 128-bit RC4 encryption with ECDHE-ECDSA and a SHA1 MAC
 {"security.ssl3.ecdhe_ecdsa_null_sha", TLS_ECDHE_ECDSA_WITH_NULL_SHA}, // No encryption with ECDHE-ECDSA and a SHA1 MAC
 {"security.ssl3.ecdhe_rsa_aes_256_sha", TLS_ECDHE_RSA_WITH_AES_256_CBC_SHA}, // 256-bit AES encryption with ECDHE-RSA and a SHA1 MAC
 {"security.ssl3.ecdhe_rsa_aes_128_sha", TLS_ECDHE_RSA_WITH_AES_128_CBC_SHA}, // 128-bit AES encryption with ECDHE-RSA and a SHA1 MAC
 {"security.ssl3.ecdhe_rsa_des_ede3_sha", TLS_ECDHE_RSA_WITH_3DES_EDE_CBC_SHA}, // 168-bit Triple DES with ECDHE-RSA and a SHA1 MAC
 {"security.ssl3.ecdhe_rsa_rc4_128_sha", TLS_ECDHE_RSA_WITH_RC4_128_SHA}, // 128-bit RC4 encryption with ECDHE-RSA and a SHA1 MAC
 {"security.ssl3.ecdhe_rsa_null_sha", TLS_ECDHE_RSA_WITH_NULL_SHA}, // No encryption with ECDHE-RSA and a SHA1 MAC
 {"security.ssl3.ecdh_ecdsa_aes_256_sha", TLS_ECDH_ECDSA_WITH_AES_256_CBC_SHA}, // 256-bit AES encryption with ECDH-ECDSA and a SHA1 MAC
 {"security.ssl3.ecdh_ecdsa_aes_128_sha", TLS_ECDH_ECDSA_WITH_AES_128_CBC_SHA}, // 128-bit AES encryption with ECDH-ECDSA and a SHA1 MAC
 {"security.ssl3.ecdh_ecdsa_des_ede3_sha", TLS_ECDH_ECDSA_WITH_3DES_EDE_CBC_SHA}, // 168-bit Triple DES with ECDH-ECDSA and a SHA1 MAC
 {"security.ssl3.ecdh_ecdsa_rc4_128_sha", TLS_ECDH_ECDSA_WITH_RC4_128_SHA}, // 128-bit RC4 encryption with ECDH-ECDSA and a SHA1 MAC
 {"security.ssl3.ecdh_ecdsa_null_sha", TLS_ECDH_ECDSA_WITH_NULL_SHA}, // No encryption with ECDH-ECDSA and a SHA1 MAC
 {"security.ssl3.ecdh_rsa_aes_256_sha", TLS_ECDH_RSA_WITH_AES_256_CBC_SHA}, // 256-bit AES encryption with ECDH-RSA and a SHA1 MAC
 {"security.ssl3.ecdh_rsa_aes_128_sha", TLS_ECDH_RSA_WITH_AES_128_CBC_SHA}, // 128-bit AES encryption with ECDH-RSA and a SHA1 MAC
 {"security.ssl3.ecdh_rsa_des_ede3_sha", TLS_ECDH_RSA_WITH_3DES_EDE_CBC_SHA}, // 168-bit Triple DES with ECDH-RSA and a SHA1 MAC
 {"security.ssl3.ecdh_rsa_rc4_128_sha", TLS_ECDH_RSA_WITH_RC4_128_SHA}, // 128-bit RC4 encryption with ECDH-RSA and a SHA1 MAC
 {"security.ssl3.ecdh_rsa_null_sha", TLS_ECDH_RSA_WITH_NULL_SHA}, // No encryption with ECDH-RSA and a SHA1 MAC
 {"security.ssl3.dhe_rsa_aes_128_sha", TLS_DHE_RSA_WITH_AES_128_CBC_SHA}, // 128-bit AES encryption with RSA, DHE, and a SHA1 MAC
 {"security.ssl3.dhe_dss_aes_128_sha", TLS_DHE_DSS_WITH_AES_128_CBC_SHA}, // 128-bit AES encryption with DSA, DHE, and a SHA1 MAC
 {"security.ssl3.rsa_aes_128_sha", TLS_RSA_WITH_AES_128_CBC_SHA}, // 128-bit AES encryption with RSA and a SHA1 MAC
 {"security.ssl3.dhe_rsa_des_ede3_sha", SSL_DHE_RSA_WITH_3DES_EDE_CBC_SHA}, // 168-bit Triple DES with RSA, DHE, and a SHA1 MAC
 {"security.ssl3.dhe_dss_des_ede3_sha", SSL_DHE_DSS_WITH_3DES_EDE_CBC_SHA}, // 168-bit Triple DES with DSA, DHE, and a SHA1 MAC
 {"security.ssl3.dhe_rsa_des_sha", SSL_DHE_RSA_WITH_DES_CBC_SHA}, // 56-bit DES encryption with RSA, DHE, and a SHA1 MAC
 {"security.ssl3.dhe_dss_des_sha", SSL_DHE_DSS_WITH_DES_CBC_SHA}, // 56-bit DES encryption with DSA, DHE, and a SHA1 MAC
 {"security.ssl3.rsa_null_sha", SSL_RSA_WITH_NULL_SHA}, // No encryption with RSA authentication and a SHA1 MAC
 {"security.ssl3.rsa_null_md5", SSL_RSA_WITH_NULL_MD5}, // No encryption with RSA authentication and an MD5 MAC
 {"security.ssl3.rsa_seed_sha", TLS_RSA_WITH_SEED_CBC_SHA}, // SEED encryption with RSA and a SHA1 MAC
 {"security.ssl3.rsa_aes_128_gcm_sha256", TLS_RSA_WITH_AES_128_GCM_SHA256}, // 128-bit AES-GCM encryption with RSA
 {"security.ssl3.ecdhe_ecdsa_aes_128_gcm_sha256", TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256}, // 128-bit AES-GCM encryption with ECDHE-ECDSA
 {"security.ssl3.ecdhe_rsa_aes_128_gcm_sha256", TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256}, // 128-bit AES-GCM encryption with ECDHE-RSA
 {NULL, 0} /* end marker */
};

nsresult nsNSSComponent::GetNSSCipherIDFromPrefString(const nsACString &aPrefString, PRUint16 &aCipherId)
{
  for (CipherPref* cp = CipherPrefs; cp->pref; ++cp) {
    if (nsDependentCString(cp->pref) == aPrefString) {
      aCipherId = cp->id;
      return NS_OK;
    }
  }
  
  return NS_ERROR_NOT_AVAILABLE;
}

static void setOCSPOptions(nsIPrefBranch * pref)
{
  nsNSSShutDownPreventionLock locker;
  // Set up OCSP //
  PRInt32 ocspEnabled;
  pref->GetIntPref("security.OCSP.enabled", &ocspEnabled);
  switch (ocspEnabled) {
  case 0:
    CERT_DisableOCSPChecking(CERT_GetDefaultCertDB());
    CERT_DisableOCSPDefaultResponder(CERT_GetDefaultCertDB());
    break;
  case 1:
    CERT_EnableOCSPChecking(CERT_GetDefaultCertDB());
    break;
  case 2:
    {
      char *signingCA = nsnull;
      char *url = nsnull;

      // Get the signing CA and service url //
      pref->GetCharPref("security.OCSP.signingCA", &signingCA);
      pref->GetCharPref("security.OCSP.URL", &url);

      // Set OCSP up
      CERT_EnableOCSPChecking(CERT_GetDefaultCertDB());
      CERT_SetOCSPDefaultResponder(CERT_GetDefaultCertDB(), url, signingCA);
      CERT_EnableOCSPDefaultResponder(CERT_GetDefaultCertDB());

      nsMemory::Free(signingCA);
      nsMemory::Free(url);
    }
    break;
  }
}

nsresult
nsNSSComponent::PostCRLImportEvent(nsCAutoString *urlString, PSMContentDownloader *psmDownloader)
{
  //Create the event
  CRLDownloadEvent *event = new CRLDownloadEvent;
  PL_InitEvent(event, this, (PLHandleEventProc)HandleCRLImportPLEvent, (PLDestroyEventProc)DestroyCRLImportPLEvent);
  event->urlString = urlString;
  event->psmDownloader = (nsIStreamListener *)psmDownloader;
  
  //Get a handle to the ui event queue
  
  nsCOMPtr<nsIEventQueue>uiQueue = nsNSSEventGetUIEventQueue();

  if (!uiQueue) {
    return NS_ERROR_FAILURE;
  }

  //Post the event
  return uiQueue->PostEvent(event);
}

nsresult
nsNSSComponent::DownloadCRLDirectly(nsAutoString url, nsAutoString key)
{
  //This api is meant to support direct interactive update of crl from the crl manager
  //or other such ui.
  PSMContentDownloader *psmDownloader = new PSMContentDownloader(PSMContentDownloader::PKCS7_CRL);
  
  nsCAutoString *urlString = new nsCAutoString();
  urlString->AssignWithConversion(url.get());
    
  return PostCRLImportEvent(urlString, psmDownloader);
}

nsresult nsNSSComponent::DownloadCrlSilently()
{
  //Add this attempt to the hashtable
  nsStringKey hashKey(mCrlUpdateKey.get());
  crlsScheduledForDownload->Put(&hashKey,(void *)nsnull);
    
  //Set up the download handler
  PSMContentDownloader *psmDownloader = new PSMContentDownloader(PSMContentDownloader::PKCS7_CRL);
  psmDownloader->setSilentDownload(PR_TRUE);
  psmDownloader->setCrlAutodownloadKey(mCrlUpdateKey);
  
  //Now get the url string
  nsCAutoString *urlString = new nsCAutoString();
  urlString->AssignWithConversion(mDownloadURL);

  return PostCRLImportEvent(urlString, psmDownloader);
}

nsresult nsNSSComponent::getParamsForNextCrlToDownload(nsAutoString *url, PRTime *time, nsAutoString *key)
{
  const char *updateEnabledPref = CRL_AUTOUPDATE_ENABLED_PREF;
  const char *updateTimePref = CRL_AUTOUPDATE_TIME_PREF;
  const char *updateURLPref = CRL_AUTOUPDATE_URL_PREF;
  char **allCrlsToBeUpdated;
  PRUint32 noOfCrls;
  PRTime nearestUpdateTime = 0;
  nsAutoString crlKey;
  char *tempUrl;
  nsresult rv;
  
  nsCOMPtr<nsIPrefBranch> pref = do_GetService(NS_PREFSERVICE_CONTRACTID,&rv);
  if(NS_FAILED(rv)){
    return rv;
  }

  rv = pref->GetChildList(updateEnabledPref, &noOfCrls, &allCrlsToBeUpdated);
  if ( (NS_FAILED(rv)) || (noOfCrls==0) ){
    return NS_ERROR_FAILURE;
  }

  for(PRUint32 i=0;i<noOfCrls;i++) {
    PRBool autoUpdateEnabled;
    nsAutoString tempCrlKey;
  
    //First check if update pref is enabled for this crl
    rv = pref->GetBoolPref(*(allCrlsToBeUpdated+i), &autoUpdateEnabled);
    if( (NS_FAILED(rv)) || (autoUpdateEnabled==PR_FALSE) ){
      continue;
    }

    //Now, generate the crl key. Same key would be used as hashkey as well
    nsCAutoString enabledPrefCString(*(allCrlsToBeUpdated+i));
    enabledPrefCString.ReplaceSubstring(updateEnabledPref,".");
    tempCrlKey.AssignWithConversion(enabledPrefCString.get());
      
    //Check if this crl has already been scheduled. Its presence in the hashtable
    //implies that it has been scheduled already this client session, and
    //is either in the process of being downloaded, or its download failed
    //for some reason. In the second case, we will not retry in the current client session
    nsStringKey hashKey(tempCrlKey.get());
    if(crlsScheduledForDownload->Exists(&hashKey)){
      continue;
    }

    char *tempTimeString;
    PRTime tempTime;
    nsCAutoString timingPrefCString(updateTimePref);
    timingPrefCString.AppendWithConversion(tempCrlKey);
    rv = pref->GetCharPref(timingPrefCString.get(), &tempTimeString);
    if (NS_FAILED(rv)){
      continue;
    }
    rv = PR_ParseTimeString(tempTimeString,PR_TRUE, &tempTime);
    nsMemory::Free(tempTimeString);
    if (NS_FAILED(rv)){
      continue;
    }

    if(nearestUpdateTime == 0 || tempTime < nearestUpdateTime){
      nsCAutoString urlPrefCString(updateURLPref);
      urlPrefCString.AppendWithConversion(tempCrlKey);
      rv = pref->GetCharPref(urlPrefCString.get(), &tempUrl);
      if (NS_FAILED(rv) || (!tempUrl)){
        continue;
      }
      nearestUpdateTime = tempTime;
      crlKey = tempCrlKey;
    }
  }

  if(noOfCrls > 0)
    NS_FREE_XPCOM_ALLOCATED_POINTER_ARRAY(noOfCrls, allCrlsToBeUpdated);

  if(nearestUpdateTime > 0){
    *time = nearestUpdateTime;
    url->AssignWithConversion((const char *)tempUrl);
    nsMemory::Free(tempUrl);
    *key = crlKey;
    rv = NS_OK;
  } else{
    rv = NS_ERROR_FAILURE;
  }

  return rv;
}

NS_IMETHODIMP
nsNSSComponent::Notify(nsITimer *timer)
{
  nsresult rv;

  //Timer has fired. So set the flag accordingly
  PR_Lock(mCrlTimerLock);
  crlDownloadTimerOn = PR_FALSE;
  PR_Unlock(mCrlTimerLock);

  //First, handle this download
  rv = DownloadCrlSilently();

  //Dont Worry if successful or not
  //Set the next timer
  DefineNextTimer();
  return NS_OK;
}

nsresult
nsNSSComponent::RemoveCrlFromList(nsAutoString key)
{
  nsStringKey hashKey(key.get());
  if(crlsScheduledForDownload->Exists(&hashKey)){
    crlsScheduledForDownload->Remove(&hashKey);
  }
  return NS_OK;
}

nsresult
nsNSSComponent::DefineNextTimer()
{
  PRTime nextFiring;
  PRTime now = PR_Now();
  PRUint64 diff;
  PRUint32 interval;
  PRUint32 primaryDelay = CRL_AUTOUPDATE_DEFAULT_DELAY;
  nsresult rv;

  if(!mTimer){
    mTimer = do_CreateInstance("@mozilla.org/timer;1", &rv);
    if(NS_FAILED(rv))
      return rv;
  }

  //If some timer is already running, cancel it. Thus, the request that came last,
  //wins. This would ensure that in no way we end up setting two different timers
  //This part should be synchronized because this function might be called from separate
  //threads

  //Lock the lock
  PR_Lock(mCrlTimerLock);

  if(crlDownloadTimerOn == PR_TRUE){
    mTimer->Cancel();
  }

  rv = getParamsForNextCrlToDownload(&mDownloadURL, &nextFiring, &mCrlUpdateKey);
  //If there are no more crls to be updated any time in future
  if(NS_FAILED(rv)){
    //Free the lock and return - no error - just implies nothing to schedule
    PR_Unlock(mCrlTimerLock);
    return NS_OK;
  }
     
  //Define the firing interval, from NOW
  if ( now < nextFiring) {
    LL_SUB(diff,nextFiring,now);
    LL_L2UI(interval, diff);
    //Now, we are doing 32 operations - so, don't need LL_ functions...
    interval = interval/PR_USEC_PER_MSEC;
  }else {
    interval = primaryDelay;
  }
  
  mTimer->InitWithCallback(NS_STATIC_CAST(nsITimerCallback*, this), 
                           interval,
                           nsITimer::TYPE_ONE_SHOT);
  crlDownloadTimerOn = PR_TRUE;
  //Release
  PR_Unlock(mCrlTimerLock);

  return NS_OK;

}

//Note that the StopCRLUpdateTimer and InitializeCRLUpdateTimer functions should never be called
//simultaneously from diff threads - they are NOT threadsafe. But, since there is no chance of 
//that happening, there is not much benefit it trying to make it so at this point
nsresult
nsNSSComponent::StopCRLUpdateTimer()
{
  
  //If it is at all running. 
  if(mUpdateTimerInitialized == PR_TRUE){
    if(crlsScheduledForDownload != nsnull){
      crlsScheduledForDownload->Reset();
      delete crlsScheduledForDownload;
      crlsScheduledForDownload = nsnull;
    }

    PR_Lock(mCrlTimerLock);
    if(crlDownloadTimerOn == PR_TRUE){
      mTimer->Cancel();
    }
    crlDownloadTimerOn = PR_FALSE;
    PR_Unlock(mCrlTimerLock);
    PR_DestroyLock(mCrlTimerLock);

    mUpdateTimerInitialized = PR_FALSE;
  }

  return NS_OK;
}

nsresult
nsNSSComponent::InitializeCRLUpdateTimer()
{
  nsresult rv;
    
  //First check if this is already initialized. Then we stop it.
  if(mUpdateTimerInitialized == PR_FALSE){
    mTimer = do_CreateInstance("@mozilla.org/timer;1", &rv);
    if(NS_FAILED(rv)){
      return rv;
    }
    crlsScheduledForDownload = new nsHashtable(16, PR_TRUE);
    mCrlTimerLock = PR_NewLock();
    DefineNextTimer();
    mUpdateTimerInitialized = PR_TRUE;  
  } 

  return NS_OK;
}

#ifdef XP_MACOSX
void
nsNSSComponent::TryCFM2MachOMigration(nsIFile *cfmPath, nsIFile *machoPath)
{
  // We will modify the parameters.
  //
  // If neither cert7.db, cert8.db, key3.db, are available, 
  // copy from filenames that were used in the old days
  // test for key3.db first, since a new profile might only contain cert8.db, 
  // but not cert7.db - this optimizes number of tests

  NS_NAMED_LITERAL_CSTRING(cstr_key3db, "key3.db");
  NS_NAMED_LITERAL_CSTRING(cstr_cert7db, "cert7.db");
  NS_NAMED_LITERAL_CSTRING(cstr_cert8db, "cert8.db");
  NS_NAMED_LITERAL_CSTRING(cstr_keydatabase3, "Key Database3");
  NS_NAMED_LITERAL_CSTRING(cstr_certificate7, "Certificates7");
  NS_NAMED_LITERAL_CSTRING(cstr_certificate8, "Certificates8");

  PRBool bExists;
  nsresult rv;

  nsCOMPtr<nsIFile> macho_key3db;
  rv = machoPath->Clone(getter_AddRefs(macho_key3db));
  if (NS_FAILED(rv)) {
    return;
  }

  macho_key3db->AppendNative(cstr_key3db);
  rv = macho_key3db->Exists(&bExists);
  if (NS_FAILED(rv) || bExists) {
    return;
  }

  nsCOMPtr<nsIFile> macho_cert7db;
  rv = machoPath->Clone(getter_AddRefs(macho_cert7db));
  if (NS_FAILED(rv)) {
    return;
  }

  macho_cert7db->AppendNative(cstr_cert7db);
  rv = macho_cert7db->Exists(&bExists);
  if (NS_FAILED(rv) || bExists) {
    return;
  }

  nsCOMPtr<nsIFile> macho_cert8db;
  rv = machoPath->Clone(getter_AddRefs(macho_cert8db));
  if (NS_FAILED(rv)) {
    return;
  }

  macho_cert8db->AppendNative(cstr_cert8db);
  rv = macho_cert7db->Exists(&bExists);
  if (NS_FAILED(rv) || bExists) {
    return;
  }

  // None of the new files exist. Try to copy any available old files.

  nsCOMPtr<nsIFile> cfm_key3;
  rv = cfmPath->Clone(getter_AddRefs(cfm_key3));
  if (NS_FAILED(rv)) {
    return;
  }

  cfm_key3->AppendNative(cstr_keydatabase3);
  rv = cfm_key3->Exists(&bExists);
  if (NS_FAILED(rv)) {
    return;
  }

  if (bExists) {
    cfm_key3->CopyToFollowingLinksNative(machoPath, cstr_key3db);
  }

  nsCOMPtr<nsIFile> cfm_cert7;
  rv = cfmPath->Clone(getter_AddRefs(cfm_cert7));
  if (NS_FAILED(rv)) {
    return;
  }

  cfm_cert7->AppendNative(cstr_certificate7);
  rv = cfm_cert7->Exists(&bExists);
  if (NS_FAILED(rv)) {
    return;
  }

  if (bExists) {
    cfm_cert7->CopyToFollowingLinksNative(machoPath, cstr_cert7db);
  }

  nsCOMPtr<nsIFile> cfm_cert8;
  rv = cfmPath->Clone(getter_AddRefs(cfm_cert8));
  if (NS_FAILED(rv)) {
    return;
  }

  cfm_cert8->AppendNative(cstr_certificate8);
  rv = cfm_cert8->Exists(&bExists);
  if (NS_FAILED(rv)) {
    return;
  }

  if (bExists) {
    cfm_cert8->CopyToFollowingLinksNative(machoPath, cstr_cert8db);
  }
}
#endif

nsresult
nsNSSComponent::InitializeNSS(PRBool showWarningBox)
{
  // Can be called both during init and profile change.
  // Needs mutex protection.

  PR_LOG(gPIPNSSLog, PR_LOG_DEBUG, ("nsNSSComponent::InitializeNSS\n"));

  // variables used for flow control within this function

  enum { problem_none, problem_no_rw, problem_no_security_at_all }
    which_nss_problem = problem_none;

  {
    nsAutoLock lock(mutex);

    // Init phase 1, prepare own variables used for NSS

    if (mNSSInitialized) {
      PR_ASSERT(!"Trying to initialize NSS twice"); // We should never try to 
                                                    // initialize NSS more than
                                                    // once in a process.
      return NS_ERROR_FAILURE;
    }
    
    nsresult rv;
    nsCAutoString profileStr;
    nsCOMPtr<nsIFile> profilePath;

    rv = NS_GetSpecialDirectory(NS_APP_USER_PROFILE_50_DIR,
                                getter_AddRefs(profilePath));
    if (NS_FAILED(rv)) {
      PR_LOG(gPIPNSSLog, PR_LOG_ERROR, ("Unable to get profile directory\n"));
      return rv;
    }

  // XP_MAC == CFM
  // XP_MACOSX == MachO

  #if defined(XP_MAC) && defined(XP_MACOSX)
  #error "This code assumes XP_MAC and XP_MACOSX will never be defined at the same time"
  #endif

  #if defined(XP_MAC) || defined(XP_MACOSX)
    // On Mac CFM we place all NSS DBs in the Security
    // Folder in the profile directory.
    nsCOMPtr<nsIFile> cfmSecurityPath;
    cfmSecurityPath = profilePath; // alias for easier code reading
    cfmSecurityPath->AppendNative(NS_LITERAL_CSTRING("Security"));
  #endif

  #if defined(XP_MAC)
    // on CFM, cfmSecurityPath and profilePath point to the same oject
    profilePath->Create(nsIFile::DIRECTORY_TYPE, 0); //This is for Mac, don't worry about
                                                     //permissions.
  #elif defined(XP_MACOSX)
    // On MachO, we need to access both directories,
    // and therefore need separate nsIFile instances.
    // Keep cfmSecurityPath instance, obtain new instance for MachO profilePath.
    rv = cfmSecurityPath->GetParent(getter_AddRefs(profilePath));
    if (NS_FAILED(rv))
      return rv;
  #endif

    rv = profilePath->GetNativePath(profileStr);
    if (NS_FAILED(rv)) 
      return rv;

    hashTableCerts = PL_NewHashTable( 0, certHashtable_keyHash, certHashtable_keyCompare, 
      certHashtable_valueCompare, 0, 0 );

  #if defined(XP_MACOSX)
    // function may modify the parameters
    // ignore return code from conversion, we continue anyway
    TryCFM2MachOMigration(cfmSecurityPath, profilePath);
  #endif

    PRBool supress_warning_preference = PR_FALSE;
    rv = mPrefBranch->GetBoolPref("security.suppress_nss_rw_impossible_warning", &supress_warning_preference);

    if (NS_FAILED(rv)) {
      supress_warning_preference = PR_FALSE;
    }

    // init phase 2, init calls to NSS library

    PR_LOG(gPIPNSSLog, PR_LOG_DEBUG, ("NSS Initialization beginning\n"));

    // The call to ConfigureInternalPKCS11Token needs to be done before NSS is initialized, 
    // but affects only static data.
    // If we could assume i18n will not change between profiles, one call per application
    // run were sufficient. As I can't predict what happens in the future, let's repeat
    // this call for every re-init of NSS.

    ConfigureInternalPKCS11Token();

    SECStatus init_rv = ::NSS_InitReadWrite(profileStr.get());

    if (init_rv != SECSuccess) {
      PR_LOG(gPIPNSSLog, PR_LOG_DEBUG, ("can not init NSS r/w in %s\n", profileStr.get()));

      if (supress_warning_preference) {
        which_nss_problem = problem_none;
      }
      else {
        which_nss_problem = problem_no_rw;
      }

      // try to init r/o
      init_rv = NSS_Init(profileStr.get());

      if (init_rv != SECSuccess) {
        PR_LOG(gPIPNSSLog, PR_LOG_DEBUG, ("can not init in r/o either\n"));
        which_nss_problem = problem_no_security_at_all;

        NSS_NoDB_Init(profileStr.get());
      }
    }

    // init phase 3, only if phase 2 was successful

    if (problem_no_security_at_all != which_nss_problem) {

      mNSSInitialized = PR_TRUE;

      ::NSS_SetDomesticPolicy();
      //  SSL_EnableCipher(SSL_RSA_WITH_NULL_MD5, SSL_ALLOWED);
      //  SSL_EnableCipher(SSL_RSA_WITH_NULL_SHA, SSL_ALLOWED);

      PK11_SetPasswordFunc(PK11PasswordPrompt);

      // Register an observer so we can inform NSS when these prefs change
      nsCOMPtr<nsIPrefBranch2> pbi = do_QueryInterface(mPrefBranch);
      pbi->AddObserver("security.", this, PR_FALSE);

      PRBool enabled;
      mPrefBranch->GetBoolPref("security.enable_ssl2", &enabled);
      SSL_OptionSetDefault(SSL_ENABLE_SSL2, enabled);
      SSL_OptionSetDefault(SSL_V2_COMPATIBLE_HELLO, enabled);
      mPrefBranch->GetBoolPref("security.enable_ssl3", &enabled);
      SSL_OptionSetDefault(SSL_ENABLE_SSL3, enabled);
      mPrefBranch->GetBoolPref("security.enable_tls", &enabled);
      SSL_OptionSetDefault(SSL_ENABLE_TLS, enabled);

      SSLVersionRange supported;
      SSL_VersionRangeGetSupported(ssl_variant_stream, &supported);
      SSL_VersionRangeSetDefault(ssl_variant_stream, &supported);

      // Disable any ciphers that NSS might have enabled by default
      for (PRUint16 i = 0; i < SSL_NumImplementedCiphers; ++i)
      {
        PRUint16 cipher_id = SSL_ImplementedCiphers[i];
        SSL_CipherPrefSetDefault(cipher_id, PR_FALSE);
      }

      // Now only set SSL/TLS ciphers we knew about at compile time
      for (CipherPref* cp = CipherPrefs; cp->pref; ++cp) {
        mPrefBranch->GetBoolPref(cp->pref, &enabled);

        SSL_CipherPrefSetDefault(cp->id, enabled);
      }

      // Enable ciphers for PKCS#12
      SEC_PKCS12EnableCipher(PKCS12_RC4_40, 1);
      SEC_PKCS12EnableCipher(PKCS12_RC4_128, 1);
      SEC_PKCS12EnableCipher(PKCS12_RC2_CBC_40, 1);
      SEC_PKCS12EnableCipher(PKCS12_RC2_CBC_128, 1);
      SEC_PKCS12EnableCipher(PKCS12_DES_56, 1);
      SEC_PKCS12EnableCipher(PKCS12_DES_EDE3_168, 1);
      SEC_PKCS12SetPreferredCipher(PKCS12_DES_EDE3_168, 1);
      PORT_SetUCS2_ASCIIConversionFunction(pip_ucs2_ascii_conversion_fn);

      // Set up OCSP //
      setOCSPOptions(mPrefBranch);

      mHttpForNSS.initTable();
      mHttpForNSS.registerHttpClient();

      InstallLoadableRoots();

      LaunchSmartCardThreads();

      PR_LOG(gPIPNSSLog, PR_LOG_DEBUG, ("NSS Initialization done\n"));
    }
  }

  if (problem_none != which_nss_problem) {
    nsString message;

    PR_LOG(gPIPNSSLog, PR_LOG_DEBUG, ("NSS problem, trying to bring up GUI error message\n"));

    // We might want to use different messages, depending on what failed.
    // For now, let's use the same message.
    if (showWarningBox) {
      ShowAlert(ai_nss_init_problem);
    }
  }

  return NS_OK;
}

nsresult
nsNSSComponent::ShutdownNSS()
{
  // Can be called both during init and profile change,
  // needs mutex protection.
  
  PR_LOG(gPIPNSSLog, PR_LOG_DEBUG, ("nsNSSComponent::ShutdownNSS\n"));

  nsAutoLock lock(mutex);
  nsresult rv = NS_OK;

  if (hashTableCerts) {
    PL_HashTableEnumerateEntries(hashTableCerts, certHashtable_clearEntry, 0);
    PL_HashTableDestroy(hashTableCerts);
    hashTableCerts = nsnull;
  }

  if (mNSSInitialized) {
    mNSSInitialized = PR_FALSE;

    PK11_SetPasswordFunc((PK11PasswordFunc)nsnull);
    mHttpForNSS.unregisterHttpClient();

    if (mPrefBranch) {
      nsCOMPtr<nsIPrefBranch2> pbi = do_QueryInterface(mPrefBranch);
      pbi->RemoveObserver("security.", this);
    }

    ShutdownSmartCardThreads();
    SSL_ClearSessionCache();
    if (mClientAuthRememberService) {
      mClientAuthRememberService->ClearRememberedDecisions();
    }
    PR_LOG(gPIPNSSLog, PR_LOG_DEBUG, ("evaporating psm resources\n"));
    mShutdownObjectList->evaporateAllNSSResources();
    if (SECSuccess != ::NSS_Shutdown()) {
      PR_LOG(gPIPNSSLog, PR_LOG_ALWAYS, ("NSS SHUTDOWN FAILURE\n"));
      rv = NS_ERROR_FAILURE;
    }
    else {
      PR_LOG(gPIPNSSLog, PR_LOG_DEBUG, ("NSS shutdown =====>> OK <<=====\n"));
    }
  }

  return rv;
}
 
NS_IMETHODIMP
nsNSSComponent::Init()
{
  // No mutex protection.
  // Assume Init happens before any concurrency on "this" can start.

  nsresult rv = NS_OK;

  PR_LOG(gPIPNSSLog, PR_LOG_DEBUG, ("Beginning NSS initialization\n"));

  if (!mutex || !mShutdownObjectList)
  {
    PR_LOG(gPIPNSSLog, PR_LOG_DEBUG, ("NSS init, out of memory in constructor\n"));
    return NS_ERROR_OUT_OF_MEMORY;
  }

  rv = InitializePIPNSSBundle();
  if (NS_FAILED(rv)) {
    PR_LOG(gPIPNSSLog, PR_LOG_ERROR, ("Unable to create pipnss bundle.\n"));
    return rv;
  }      

  if (!mPrefBranch) {
    mPrefBranch = do_GetService(NS_PREFSERVICE_CONTRACTID);
    NS_ASSERTION(mPrefBranch, "Unable to get pref service");
  }

  // Do that before NSS init, to make sure we won't get unloaded.
  RegisterObservers();

  rv = InitializeNSS(PR_TRUE); // ok to show a warning box on failure
  if (NS_FAILED(rv)) {
    PR_LOG(gPIPNSSLog, PR_LOG_ERROR, ("Unable to Initialize NSS.\n"));

    DeregisterObservers();
    mPIPNSSBundle = nsnull;
    return rv;
  }

  nsSSLIOLayerHelpers::Init();
  mClientAuthRememberService = new nsClientAuthRememberService;
  if (mClientAuthRememberService)
    mClientAuthRememberService->Init();
  
  mSSLThread = new nsSSLThread();
  if (mSSLThread)
    mSSLThread->startThread();
  mCertVerificationThread = new nsCertVerificationThread();
  if (mCertVerificationThread)
    mCertVerificationThread->startThread();

  if (!mSSLThread || !mCertVerificationThread)
  {
    PR_LOG(gPIPNSSLog, PR_LOG_DEBUG, ("NSS init, could not create threads\n"));

    DeregisterObservers();
    mPIPNSSBundle = nsnull;
    return NS_ERROR_OUT_OF_MEMORY;
  }

  InitializeCRLUpdateTimer();
  RegisterPSMContentListener();

  nsCOMPtr<nsIEntropyCollector> ec
      = do_GetService(NS_ENTROPYCOLLECTOR_CONTRACTID);

  nsCOMPtr<nsIBufEntropyCollector> bec;

  if (ec) {
    bec = do_QueryInterface(ec);
  }

  NS_ASSERTION(bec, "No buffering entropy collector.  "
                    "This means no entropy will be collected.");
  if (bec) {
    bec->ForwardTo(this);
  }

  return rv;
}

/* nsISupports Implementation for the class */
NS_IMPL_THREADSAFE_ISUPPORTS6(nsNSSComponent,
                              nsISignatureVerifier,
                              nsIEntropyCollector,
                              nsINSSComponent,
                              nsIObserver,
                              nsISupportsWeakReference,
                              nsITimerCallback)


/* Callback functions for decoder. For now, use empty/default functions. */
static void ContentCallback(void *arg, 
                                           const char *buf,
                                           unsigned long len)
{
}

static PK11SymKey * GetDecryptKeyCallback(void *arg, 
                                                 SECAlgorithmID *algid)
{
  return nsnull;
}

static PRBool DecryptionAllowedCallback(SECAlgorithmID *algid,  
                                               PK11SymKey *bulkkey)
{
  return SECMIME_DecryptionAllowed(algid, bulkkey);
}

static void * GetPasswordKeyCallback(void *arg, void *handle)
{
  return NULL;
}

NS_IMETHODIMP
nsNSSComponent::VerifySignature(const char* aRSABuf, PRUint32 aRSABufLen,
                                const char* aPlaintext, PRUint32 aPlaintextLen,
                                PRInt32* aErrorCode,
                                nsIPrincipal** aPrincipal)
{
  if (!aPrincipal || !aErrorCode) {
    return NS_ERROR_NULL_POINTER;
  }

  *aErrorCode = 0;
  *aPrincipal = nsnull;

  nsNSSShutDownPreventionLock locker;
  SEC_PKCS7ContentInfo * p7_info = nsnull; 
  unsigned char hash[SHA1_LENGTH]; 

  SECItem item;
  item.type = siEncodedCertBuffer;
  item.data = (unsigned char*)aRSABuf;
  item.len = aRSABufLen;
  p7_info = SEC_PKCS7DecodeItem(&item,
                                ContentCallback, nsnull,
                                GetPasswordKeyCallback, nsnull,
                                GetDecryptKeyCallback, nsnull,
                                DecryptionAllowedCallback);

  if (!p7_info) {
    return NS_ERROR_FAILURE;
  }

  // Make sure we call SEC_PKCS7DestroyContentInfo after this point;
  // otherwise we leak data in p7_info
  
  //-- If a plaintext was provided, hash it.
  SECItem digest;
  digest.data = nsnull;
  digest.len = 0;

  if (aPlaintext) {
    HASHContext* hash_ctxt;
    PRUint32 hashLen = 0;

    hash_ctxt = HASH_Create(HASH_AlgSHA1);
    HASH_Begin(hash_ctxt);
    HASH_Update(hash_ctxt,(const unsigned char*)aPlaintext, aPlaintextLen);
    HASH_End(hash_ctxt, hash, &hashLen, SHA1_LENGTH); 
    HASH_Destroy(hash_ctxt);

    digest.data = hash;
    digest.len = SHA1_LENGTH;
  }

  //-- Verify signature
  PRBool rv = SEC_PKCS7VerifyDetachedSignature(p7_info, certUsageObjectSigner,
                                               &digest, HASH_AlgSHA1, PR_FALSE);
  if (rv != PR_TRUE) {
    *aErrorCode = PR_GetError();
  }

  // Get the signing cert //
  CERTCertificate *cert = p7_info->content.signedData->signerInfos[0]->cert;
  nsresult rv2 = NS_OK;
  if (cert) {
    // Use |do { } while (0);| as a "more C++-ish" thing than goto;
    // this way we don't have to worry about goto across variable
    // declarations.  We have no loops in this code, so it's OK.
    do {
      nsCOMPtr<nsIX509Cert> pCert = new nsNSSCertificate(cert);
      if (!pCert) {
        rv2 = NS_ERROR_OUT_OF_MEMORY;
        break;
      }

      if (!mScriptSecurityManager) {
        nsAutoLock lock(mutex);
        // re-test the condition to prevent double initialization
        if (!mScriptSecurityManager) {
          mScriptSecurityManager = 
            do_GetService(NS_SCRIPTSECURITYMANAGER_CONTRACTID, &rv2);
          if (NS_FAILED(rv2)) {
            break;
          }
        }
      }

      //-- Create a certificate principal with id and organization data
      nsAutoString fingerprint;
      rv2 = pCert->GetSha1Fingerprint(fingerprint);
      if (NS_FAILED(rv2)) {
        break;
      }
      nsAutoString orgName;
      rv2 = pCert->GetOrganization(orgName);
      if (NS_FAILED(rv2)) {
        break;
      }
      nsAutoString subjectName;
      rv2 = pCert->GetSubjectName(subjectName);
      if (NS_FAILED(rv2)) {
        break;
      }
    
      nsCOMPtr<nsIPrincipal> certPrincipal;
      rv2 = mScriptSecurityManager->
        GetCertificatePrincipal(NS_ConvertUTF16toUTF8(fingerprint),
                                NS_ConvertUTF16toUTF8(subjectName),
                                NS_ConvertUTF16toUTF8(orgName),
                                pCert, nsnull, getter_AddRefs(certPrincipal));
      if (NS_FAILED(rv2) || !certPrincipal) {
        break;
      }
      
      certPrincipal.swap(*aPrincipal);
    } while (0);
  }

  SEC_PKCS7DestroyContentInfo(p7_info);

  return rv2;
}

NS_IMETHODIMP
nsNSSComponent::RandomUpdate(void *entropy, PRInt32 bufLen)
{
  nsNSSShutDownPreventionLock locker;

  // Asynchronous event happening often,
  // must not interfere with initialization or profile switch.
  
  nsAutoLock lock(mutex);

  if (!mNSSInitialized)
      return NS_ERROR_NOT_INITIALIZED;

  PK11_RandomUpdate(entropy, bufLen);
  return NS_OK;
}

#define PROFILE_CHANGE_NET_TEARDOWN_TOPIC "profile-change-net-teardown"
#define PROFILE_CHANGE_NET_RESTORE_TOPIC "profile-change-net-restore"
#define PROFILE_APPROVE_CHANGE_TOPIC "profile-approve-change"
#define PROFILE_CHANGE_TEARDOWN_TOPIC "profile-change-teardown"
#define PROFILE_CHANGE_TEARDOWN_VETO_TOPIC "profile-change-teardown-veto"
#define PROFILE_BEFORE_CHANGE_TOPIC "profile-before-change"
#define PROFILE_AFTER_CHANGE_TOPIC "profile-after-change"
#define SESSION_LOGOUT_TOPIC "session-logout"

NS_IMETHODIMP
nsNSSComponent::Observe(nsISupports *aSubject, const char *aTopic, 
                        const PRUnichar *someData)
{
  if (nsCRT::strcmp(aTopic, PROFILE_APPROVE_CHANGE_TOPIC) == 0) {
    if (mShutdownObjectList->isUIActive()) {
      ShowAlert(ai_crypto_ui_active);
      nsCOMPtr<nsIProfileChangeStatus> status = do_QueryInterface(aSubject);
      if (status) {
        status->VetoChange();
      }
    }
  }
  else if (nsCRT::strcmp(aTopic, PROFILE_CHANGE_TEARDOWN_TOPIC) == 0) {
    PR_LOG(gPIPNSSLog, PR_LOG_DEBUG, ("in PSM code, receiving change-teardown\n"));

    PRBool callVeto = PR_FALSE;

    if (!mShutdownObjectList->ifPossibleDisallowUI()) {
      callVeto = PR_TRUE;
      ShowAlert(ai_crypto_ui_active);
    }
    else if (mShutdownObjectList->areSSLSocketsActive()) {
      callVeto = PR_TRUE;
      ShowAlert(ai_sockets_still_active);
    }

    if (callVeto) {
      nsCOMPtr<nsIProfileChangeStatus> status = do_QueryInterface(aSubject);
      if (status) {
        status->VetoChange();
      }
    }
  }
  else if (nsCRT::strcmp(aTopic, PROFILE_CHANGE_TEARDOWN_VETO_TOPIC) == 0) {
    mShutdownObjectList->allowUI();
  }
  else if (nsCRT::strcmp(aTopic, PROFILE_BEFORE_CHANGE_TOPIC) == 0) {
    PR_LOG(gPIPNSSLog, PR_LOG_DEBUG, ("receiving profile change topic\n"));
    NS_ASSERTION(mIsNetworkDown, "nsNSSComponent relies on profile manager to wait for synchronous shutdown of all network activity");

    PRBool needsCleanup = PR_TRUE;

    {
      nsAutoLock lock(mutex);

      if (!mNSSInitialized) {
        // Make sure we don't try to cleanup if we have already done so.
        // This makes sure we behave safely, in case we are notified
        // multiple times.
        needsCleanup = PR_FALSE;
      }
    }
    
    StopCRLUpdateTimer();

    if (needsCleanup) {
      if (NS_FAILED(ShutdownNSS())) {
        nsCOMPtr<nsIProfileChangeStatus> status = do_QueryInterface(aSubject);
        if (status) {
          status->ChangeFailed();
        }
      }
    }
    mShutdownObjectList->allowUI();

  }
  else if (nsCRT::strcmp(aTopic, PROFILE_AFTER_CHANGE_TOPIC) == 0) {
  
    PRBool needsInit = PR_TRUE;

    {
      nsAutoLock lock(mutex);

      if (mNSSInitialized) {
        // We have already initialized NSS before the profile came up,
        // no need to do it again
        needsInit = PR_FALSE;
      }
    }
    
    if (needsInit) {
      if (NS_FAILED(InitializeNSS(PR_FALSE))) { // do not show a warning box on failure
        PR_LOG(gPIPNSSLog, PR_LOG_ERROR, ("Unable to Initialize NSS after profile switch.\n"));
        nsCOMPtr<nsIProfileChangeStatus> status = do_QueryInterface(aSubject);
        if (status) {
          status->ChangeFailed();
        }
      }
    }

    InitializeCRLUpdateTimer();
  }
  else if (nsCRT::strcmp(aTopic, NS_XPCOM_SHUTDOWN_OBSERVER_ID) == 0) {

    PR_LOG(gPIPNSSLog, PR_LOG_DEBUG, ("nsNSSComponent: XPCom shutdown observed\n"));

    // Cleanup code that requires services, it's too late in destructor.

    if (mPSMContentListener) {
      nsresult rv = NS_ERROR_FAILURE;

      nsCOMPtr<nsIURILoader> dispatcher(do_GetService(NS_URI_LOADER_CONTRACTID));
      if (dispatcher) {
        rv = dispatcher->UnRegisterContentListener(mPSMContentListener);
      }
      mPSMContentListener = nsnull;
    }

    nsCOMPtr<nsIEntropyCollector> ec
        = do_GetService(NS_ENTROPYCOLLECTOR_CONTRACTID);

    if (ec) {
      nsCOMPtr<nsIBufEntropyCollector> bec
        = do_QueryInterface(ec);
      if (bec) {
        bec->DontForward();
      }
    }
  }
  else if ((nsCRT::strcmp(aTopic, SESSION_LOGOUT_TOPIC) == 0) && mNSSInitialized) {
    nsNSSShutDownPreventionLock locker;
    PK11_LogoutAll();
    SSL_ClearSessionCache();
    LogoutAuthenticatedPK11();
  }
  else if (nsCRT::strcmp(aTopic, NS_PREFBRANCH_PREFCHANGE_TOPIC_ID) == 0) { 
    nsNSSShutDownPreventionLock locker;
    PRBool enabled;
    NS_ConvertUCS2toUTF8  prefName(someData);

    if (prefName.Equals("security.enable_ssl2")) {
      mPrefBranch->GetBoolPref("security.enable_ssl2", &enabled);
      SSL_OptionSetDefault(SSL_ENABLE_SSL2, enabled);
      SSL_OptionSetDefault(SSL_V2_COMPATIBLE_HELLO, enabled);
    } else if (prefName.Equals("security.enable_ssl3")) {
      mPrefBranch->GetBoolPref("security.enable_ssl3", &enabled);
      SSL_OptionSetDefault(SSL_ENABLE_SSL3, enabled);
    } else if (prefName.Equals("security.enable_tls")) {
      mPrefBranch->GetBoolPref("security.enable_tls", &enabled);
      SSL_OptionSetDefault(SSL_ENABLE_TLS, enabled);

      SSLVersionRange supported;
      SSL_VersionRangeGetSupported(ssl_variant_stream, &supported);
      SSL_VersionRangeSetDefault(ssl_variant_stream, &supported);

    } else if (prefName.Equals("security.OCSP.enabled")) {
      setOCSPOptions(mPrefBranch);
    } else {
      /* Look through the cipher table and set according to pref setting */
      for (CipherPref* cp = CipherPrefs; cp->pref; ++cp) {
        if (prefName.Equals(cp->pref)) {
          mPrefBranch->GetBoolPref(cp->pref, &enabled);
          SSL_CipherPrefSetDefault(cp->id, enabled);
          break;
        }
      }
    }
  }
  else if (nsCRT::strcmp(aTopic, PROFILE_CHANGE_NET_TEARDOWN_TOPIC) == 0) {
    PR_LOG(gPIPNSSLog, PR_LOG_DEBUG, ("receiving network teardown topic\n"));
    if (mSSLThread)
      mSSLThread->requestExit();
    if (mCertVerificationThread)
      mCertVerificationThread->requestExit();
    mIsNetworkDown = PR_TRUE;
  }
  else if (nsCRT::strcmp(aTopic, PROFILE_CHANGE_NET_RESTORE_TOPIC) == 0) {
    PR_LOG(gPIPNSSLog, PR_LOG_DEBUG, ("receiving network restore topic\n"));
    delete mSSLThread;
    mSSLThread = new nsSSLThread();
    if (mSSLThread)
      mSSLThread->startThread();
    delete mCertVerificationThread;
    mCertVerificationThread = new nsCertVerificationThread();
    if (mCertVerificationThread)
      mCertVerificationThread->startThread();
    mIsNetworkDown = PR_FALSE;
  }

  return NS_OK;
}

void nsNSSComponent::ShowAlert(AlertIdentifier ai)
{
  nsString message;
  nsresult rv;

  switch (ai) {
    case ai_nss_init_problem:
      rv = GetPIPNSSBundleString("NSSInitProblem", message);
      break;
    case ai_sockets_still_active:
      rv = GetPIPNSSBundleString("ProfileSwitchSocketsStillActive", message);
      break;
    case ai_crypto_ui_active:
      rv = GetPIPNSSBundleString("ProfileSwitchCryptoUIActive", message);
      break;
    case ai_incomplete_logout:
      rv = GetPIPNSSBundleString("LogoutIncompleteUIActive", message);
      break;
    default:
      return;
  }
  
  if (NS_FAILED(rv))
    return;

  nsCOMPtr<nsIWindowWatcher> wwatch(do_GetService(NS_WINDOWWATCHER_CONTRACTID));
  if (!wwatch) {
    PR_LOG(gPIPNSSLog, PR_LOG_DEBUG, ("can't get window watcher\n"));
  }
  else {
    nsCOMPtr<nsIPrompt> prompter;
    wwatch->GetNewPrompter(0, getter_AddRefs(prompter));
    if (!prompter) {
      PR_LOG(gPIPNSSLog, PR_LOG_DEBUG, ("can't get window prompter\n"));
    }
    else {
      nsCOMPtr<nsIProxyObjectManager> proxyman(do_GetService(NS_XPCOMPROXY_CONTRACTID));
      if (!proxyman) {
        PR_LOG(gPIPNSSLog, PR_LOG_DEBUG, ("can't get proxy manager\n"));
      }
      else {
        nsCOMPtr<nsIPrompt> proxyPrompt;
        proxyman->GetProxyForObject(NS_UI_THREAD_EVENTQ, NS_GET_IID(nsIPrompt),
                                    prompter, PROXY_SYNC, getter_AddRefs(proxyPrompt));
        if (!proxyPrompt) {
          PR_LOG(gPIPNSSLog, PR_LOG_DEBUG, ("can't get proxy for nsIPrompt\n"));
        }
        else {
          proxyPrompt->Alert(nsnull, message.get());
        }
      }
    }
  }
}

nsresult nsNSSComponent::LogoutAuthenticatedPK11()
{
  if (mClientAuthRememberService) {
    mClientAuthRememberService->ClearRememberedDecisions();
  }
  return mShutdownObjectList->doPK11Logout();
}

nsresult
nsNSSComponent::RegisterObservers()
{
  // Happens once during init only, no mutex protection.

  nsCOMPtr<nsIObserverService> observerService(do_GetService("@mozilla.org/observer-service;1"));
  NS_ASSERTION(observerService, "could not get observer service");
  if (observerService) {
    mObserversRegistered = PR_TRUE;
    PR_LOG(gPIPNSSLog, PR_LOG_DEBUG, ("nsNSSComponent: adding observers\n"));

    // We are a service.
    // Once we are loaded, don't allow being removed from memory.
    // This makes sense, as initializing NSS is expensive.

    // By using PR_FALSE for parameter ownsWeak in AddObserver,
    // we make sure that we won't get unloaded until the application shuts down.

    observerService->AddObserver(this, NS_XPCOM_SHUTDOWN_OBSERVER_ID, PR_FALSE);

    observerService->AddObserver(this, PROFILE_APPROVE_CHANGE_TOPIC, PR_FALSE);
    observerService->AddObserver(this, PROFILE_CHANGE_TEARDOWN_TOPIC, PR_FALSE);
    observerService->AddObserver(this, PROFILE_CHANGE_TEARDOWN_VETO_TOPIC, PR_FALSE);
    observerService->AddObserver(this, PROFILE_BEFORE_CHANGE_TOPIC, PR_FALSE);
    observerService->AddObserver(this, PROFILE_AFTER_CHANGE_TOPIC, PR_FALSE);
    observerService->AddObserver(this, SESSION_LOGOUT_TOPIC, PR_FALSE);
    observerService->AddObserver(this, PROFILE_CHANGE_NET_TEARDOWN_TOPIC, PR_FALSE);
    observerService->AddObserver(this, PROFILE_CHANGE_NET_RESTORE_TOPIC, PR_FALSE);
  }
  return NS_OK;
}

nsresult
nsNSSComponent::DeregisterObservers()
{
  if (!mObserversRegistered)
    return NS_OK;

  nsCOMPtr<nsIObserverService> observerService(do_GetService("@mozilla.org/observer-service;1"));
  NS_ASSERTION(observerService, "could not get observer service");
  if (observerService) {
    mObserversRegistered = PR_FALSE;
    PR_LOG(gPIPNSSLog, PR_LOG_DEBUG, ("nsNSSComponent: removing observers\n"));

    observerService->RemoveObserver(this, NS_XPCOM_SHUTDOWN_OBSERVER_ID);

    observerService->RemoveObserver(this, PROFILE_APPROVE_CHANGE_TOPIC);
    observerService->RemoveObserver(this, PROFILE_CHANGE_TEARDOWN_TOPIC);
    observerService->RemoveObserver(this, PROFILE_CHANGE_TEARDOWN_VETO_TOPIC);
    observerService->RemoveObserver(this, PROFILE_BEFORE_CHANGE_TOPIC);
    observerService->RemoveObserver(this, PROFILE_AFTER_CHANGE_TOPIC);
    observerService->RemoveObserver(this, SESSION_LOGOUT_TOPIC);
    observerService->RemoveObserver(this, PROFILE_CHANGE_NET_TEARDOWN_TOPIC);
    observerService->RemoveObserver(this, PROFILE_CHANGE_NET_RESTORE_TOPIC);
  }
  return NS_OK;
}

NS_IMETHODIMP
nsNSSComponent::RememberCert(CERTCertificate *cert)
{
  nsNSSShutDownPreventionLock locker;

  // Must not interfere with init / shutdown / profile switch.

  nsAutoLock lock(mutex);

  if (!hashTableCerts || !cert)
    return NS_OK;
  
  void *found = PL_HashTableLookup(hashTableCerts, (void*)&cert->certKey);
  
  if (found) {
    // we remember that cert already
    return NS_OK;
  }
  
  CERTCertificate *myDupCert = CERT_DupCertificate(cert);
  
  if (!myDupCert)
    return NS_ERROR_OUT_OF_MEMORY;
  
  if (!PL_HashTableAdd(hashTableCerts, (void*)&myDupCert->certKey, myDupCert)) {
    CERT_DestroyCertificate(myDupCert);
  }
  
  return NS_OK;
}

NS_IMETHODIMP
nsNSSComponent::GetClientAuthRememberService(nsClientAuthRememberService **cars)
{
  NS_ENSURE_ARG_POINTER(cars);
  NS_IF_ADDREF(*cars = mClientAuthRememberService);
  return NS_OK;
}

//---------------------------------------------
// Implementing nsICryptoHash
//---------------------------------------------

nsCryptoHash::nsCryptoHash()
  : mHashContext(nsnull)
{
}

nsCryptoHash::~nsCryptoHash()
{
  if (mHashContext)
    HASH_Destroy(mHashContext);
}

NS_IMPL_ISUPPORTS1(nsCryptoHash, nsICryptoHash)

NS_IMETHODIMP 
nsCryptoHash::Init(PRUint32 algorithm)
{
  if (mHashContext)
    HASH_Destroy(mHashContext);

  mHashContext = HASH_Create((HASH_HashType) algorithm);
  if (!mHashContext)
    return NS_ERROR_INVALID_ARG;

  HASH_Begin(mHashContext);
  return NS_OK; 
}

NS_IMETHODIMP
nsCryptoHash::InitWithString(const nsACString & aAlgorithm)
{
  if (aAlgorithm.LowerCaseEqualsLiteral("md2"))
    return Init(nsICryptoHash::MD2);

  if (aAlgorithm.LowerCaseEqualsLiteral("md5"))
    return Init(nsICryptoHash::MD5);

  if (aAlgorithm.LowerCaseEqualsLiteral("sha1"))
    return Init(nsICryptoHash::SHA1);

  if (aAlgorithm.LowerCaseEqualsLiteral("sha256"))
    return Init(nsICryptoHash::SHA256);

  if (aAlgorithm.LowerCaseEqualsLiteral("sha384"))
    return Init(nsICryptoHash::SHA384);

  if (aAlgorithm.LowerCaseEqualsLiteral("sha512"))
    return Init(nsICryptoHash::SHA512);

  return NS_ERROR_INVALID_ARG;
}

NS_IMETHODIMP
nsCryptoHash::Update(const PRUint8 *data, PRUint32 len)
{
  if (!mHashContext)
    return NS_ERROR_NOT_INITIALIZED;

  HASH_Update(mHashContext, data, len);
  return NS_OK; 
}

NS_IMETHODIMP
nsCryptoHash::UpdateFromStream(nsIInputStream *data, PRUint32 len)
{
  if (!mHashContext)
    return NS_ERROR_NOT_INITIALIZED;

  if (!data)
    return NS_ERROR_INVALID_ARG;

  PRUint32 n;
  nsresult rv = data->Available(&n);
  if (NS_FAILED(rv))
    return rv;

  // if the user has passed PR_UINT32_MAX, then read
  // everything in the stream

  if (len == PR_UINT32_MAX)
    len = n;

  // So, if the stream has NO data available for the hash,
  // or if the data available is less then what the caller
  // requested, we can not fulfill the hash update.  In this
  // case, just return NS_ERROR_NOT_AVAILABLE indicating
  // that there is not enough data in the stream to satisify
  // the request.

  if (n == 0 || n < len)
    return NS_ERROR_NOT_AVAILABLE;
  
  char buffer[NS_CRYPTO_HASH_BUFFER_SIZE];
  PRUint32 read;
  
  while(NS_SUCCEEDED(rv) && len>0)
  {
    read = PR_MIN(NS_CRYPTO_HASH_BUFFER_SIZE, len);
    
    rv = data->Read(buffer, read, &read);
    
    if (NS_SUCCEEDED(rv))
      rv = Update((const PRUint8*)buffer, read);
    
    len -= read;
  }
  
  return rv;
}

NS_IMETHODIMP
nsCryptoHash::Finish(PRBool ascii, nsACString & _retval)
{
  if (!mHashContext)
    return NS_ERROR_NOT_INITIALIZED;
  
  PRUint32 hashLen = 0;
  unsigned char buffer[HASH_LENGTH_MAX];
  unsigned char* pbuffer = buffer;

  HASH_End(mHashContext, pbuffer, &hashLen, HASH_LENGTH_MAX);
  HASH_Destroy(mHashContext);

  mHashContext = nsnull;

  if (ascii)
  {
    char *asciiData = BTOA_DataToAscii(buffer, hashLen);
    _retval.Assign(asciiData);
    PORT_Free(asciiData);
  }
  else
  {
    _retval.Assign((const char*)buffer, hashLen);
  }

  return NS_OK;
}


NS_IMPL_ISUPPORTS1(PipUIContext, nsIInterfaceRequestor)

PipUIContext::PipUIContext()
{
}

PipUIContext::~PipUIContext()
{
}

/* void getInterface (in nsIIDRef uuid, [iid_is (uuid), retval] out nsQIResult result); */
NS_IMETHODIMP PipUIContext::GetInterface(const nsIID & uuid, void * *result)
{
  nsresult rv = NS_OK;

  if (uuid.Equals(NS_GET_IID(nsIPrompt))) {
    nsCOMPtr<nsIProxyObjectManager> proxyman(do_GetService(NS_XPCOMPROXY_CONTRACTID));
    if (!proxyman) return NS_ERROR_FAILURE;

    nsCOMPtr<nsIPrompt> prompter;
    nsCOMPtr<nsIWindowWatcher> wwatch(do_GetService(NS_WINDOWWATCHER_CONTRACTID));
    if (wwatch) {
      wwatch->GetNewPrompter(0, getter_AddRefs(prompter));
      if (prompter) {
        nsCOMPtr<nsIPrompt> proxyPrompt;
        proxyman->GetProxyForObject(NS_UI_THREAD_EVENTQ, NS_GET_IID(nsIPrompt),
                                    prompter, PROXY_SYNC, getter_AddRefs(proxyPrompt));
        if (!proxyPrompt) return NS_ERROR_FAILURE;
        *result = proxyPrompt;
        NS_ADDREF((nsIPrompt*)*result);
      }
    }
  } else {
    rv = NS_ERROR_NO_INTERFACE;
  }

  return rv;
}

nsresult 
getNSSDialogs(void **_result, REFNSIID aIID, const char *contract)
{
  nsresult rv;

  nsCOMPtr<nsISupports> svc = do_GetService(contract, &rv);
  if (NS_FAILED(rv)) 
    return rv;

  nsCOMPtr<nsIProxyObjectManager> proxyman =
      do_GetService(NS_XPCOMPROXY_CONTRACTID, &rv);
  if (NS_FAILED(rv))
    return rv;
 
  rv = proxyman->GetProxyForObject(NS_UI_THREAD_EVENTQ,
                                   aIID, svc, PROXY_SYNC,
                                   _result);
  return rv;
}

nsresult
setPassword(PK11SlotInfo *slot, nsIInterfaceRequestor *ctx)
{
  nsNSSShutDownPreventionLock locker;
  nsresult rv = NS_OK;
  
  if (PK11_NeedUserInit(slot)) {
    nsITokenPasswordDialogs *dialogs;
    PRBool canceled;
    NS_ConvertUTF8toUCS2 tokenName(PK11_GetTokenName(slot));

    rv = getNSSDialogs((void**)&dialogs,
                       NS_GET_IID(nsITokenPasswordDialogs),
                       NS_TOKENPASSWORDSDIALOG_CONTRACTID);

    if (NS_FAILED(rv)) goto loser;

    {
      nsPSMUITracker tracker;
      if (tracker.isUIForbidden()) {
        rv = NS_ERROR_NOT_AVAILABLE;
      }
      else {
        rv = dialogs->SetPassword(ctx,
                                  tokenName.get(),
                                  &canceled);
      }
    }
    NS_RELEASE(dialogs);
    if (NS_FAILED(rv)) goto loser;

    if (canceled) { rv = NS_ERROR_NOT_AVAILABLE; goto loser; }
  }
 loser:
  return rv;
}


PSMContentDownloader::PSMContentDownloader(PRUint32 type)
  : mByteData(nsnull),
    mType(type),
    mDoSilentDownload(PR_FALSE)
{
}

PSMContentDownloader::~PSMContentDownloader()
{
  if (mByteData)
    nsMemory::Free(mByteData);
}

/*NS_IMPL_ISUPPORTS1(CertDownloader, nsIStreamListener)*/
NS_IMPL_ISUPPORTS1(PSMContentDownloader,nsIStreamListener)

const PRInt32 kDefaultCertAllocLength = 2048;

NS_IMETHODIMP
PSMContentDownloader::OnStartRequest(nsIRequest* request, nsISupports* context)
{
  nsresult rv;
  PR_LOG(gPIPNSSLog, PR_LOG_DEBUG, ("CertDownloader::OnStartRequest\n"));
  nsCOMPtr<nsIChannel> channel(do_QueryInterface(request));
  if (!channel) return NS_ERROR_FAILURE;

  // Get the URI //
  channel->GetURI(getter_AddRefs(mURI));

  PRInt32 contentLength;
  rv = channel->GetContentLength(&contentLength);
  if (NS_FAILED(rv) || contentLength <= 0)
    contentLength = kDefaultCertAllocLength;
  
  mBufferOffset = 0;
  mBufferSize = 0;
  mByteData = (char*) nsMemory::Alloc(contentLength);
  if (!mByteData)
    return NS_ERROR_OUT_OF_MEMORY;
  
  mBufferSize = contentLength;
  return NS_OK;
}

NS_IMETHODIMP
PSMContentDownloader::OnDataAvailable(nsIRequest* request,
                                nsISupports* context,
                                nsIInputStream *aIStream,
                                PRUint32 aSourceOffset,
                                PRUint32 aLength)
{
  if (!mByteData)
    return NS_ERROR_OUT_OF_MEMORY;
  
  PRUint32 amt;
  nsresult err;
  //Do a check to see if we need to allocate more memory.
  if ((mBufferOffset + (PRInt32)aLength) > mBufferSize) {
      size_t newSize = (mBufferOffset + aLength) *2; // grow some more than needed
      char *newBuffer;
      newBuffer = (char*)nsMemory::Realloc(mByteData, newSize);
      if (newBuffer == nsnull) {
        return NS_ERROR_OUT_OF_MEMORY;
      }
      mByteData = newBuffer;
      mBufferSize = newSize;
  }
  
  PR_LOG(gPIPNSSLog, PR_LOG_DEBUG, ("CertDownloader::OnDataAvailable\n"));
  do {
    err = aIStream->Read(mByteData+mBufferOffset,
                         aLength, &amt);
    if (NS_FAILED(err)) return err;
    if (amt == 0) break;
    
    aLength -= amt;
    mBufferOffset += amt;
    
  } while (aLength > 0);
  
  return NS_OK;
}

NS_IMETHODIMP
PSMContentDownloader::OnStopRequest(nsIRequest* request,
                              nsISupports* context,
                              nsresult aStatus)
{
  nsNSSShutDownPreventionLock locker;
  //Check if the download succeeded - it might have failed due to
  //network issues, etc.
  if (NS_FAILED(aStatus)){
    handleContentDownloadError(aStatus);
    return aStatus;
  }

  PR_LOG(gPIPNSSLog, PR_LOG_DEBUG, ("CertDownloader::OnStopRequest\n"));

  nsCOMPtr<nsIX509CertDB> certdb;
  nsCOMPtr<nsICRLManager> crlManager;

  nsresult rv;
  nsCOMPtr<nsIInterfaceRequestor> ctx = new PipUIContext();

  switch (mType) {
  case PSMContentDownloader::X509_CA_CERT:
  case PSMContentDownloader::X509_USER_CERT:
  case PSMContentDownloader::X509_EMAIL_CERT:
    certdb = do_GetService(NS_X509CERTDB_CONTRACTID);
    break;

  case PSMContentDownloader::PKCS7_CRL:
    crlManager = do_GetService(NS_CRLMANAGER_CONTRACTID);

  default:
    break;
  }

  switch (mType) {
  case PSMContentDownloader::X509_CA_CERT:
    return certdb->ImportCertificates((PRUint8*)mByteData, mBufferOffset, mType, ctx); 
  case PSMContentDownloader::X509_USER_CERT:
    return certdb->ImportUserCertificate((PRUint8*)mByteData, mBufferOffset, ctx);
  case PSMContentDownloader::X509_EMAIL_CERT:
    return certdb->ImportEmailCertificate((PRUint8*)mByteData, mBufferOffset, ctx); 
  case PSMContentDownloader::PKCS7_CRL:
    return crlManager->ImportCrl((PRUint8*)mByteData, mBufferOffset, mURI, SEC_CRL_TYPE, mDoSilentDownload, mCrlAutoDownloadKey.get());
  default:
    rv = NS_ERROR_FAILURE;
    break;
  }
  
  return rv;
}


nsresult
PSMContentDownloader::handleContentDownloadError(nsresult errCode)
{
  nsString tmpMessage;
  nsresult rv;
  nsCOMPtr<nsINSSComponent> nssComponent(do_GetService(kNSSComponentCID, &rv));
  if(NS_FAILED(rv)){
    return rv;
  }
      
  //Handling errors for crl download only, for now.
  switch (mType){
  case PSMContentDownloader::PKCS7_CRL:

    //TO DO: Handle network errors in details
    //XXXXXXXXXXXXXXXXXX
    nssComponent->GetPIPNSSBundleString("CrlImportFailureNetworkProblem", tmpMessage);
      
    if(mDoSilentDownload == PR_TRUE){
      //This is the case for automatic download. Update failure history
      nsCAutoString updateErrCntPrefStr(CRL_AUTOUPDATE_ERRCNT_PREF);
      nsCAutoString updateErrDetailPrefStr(CRL_AUTOUPDATE_ERRDETAIL_PREF);
      PRUnichar *nameInDb;
      nsCString errMsg;
      PRInt32 errCnt;

      nsCOMPtr<nsIPrefBranch> pref = do_GetService(NS_PREFSERVICE_CONTRACTID,&rv);
      if(NS_FAILED(rv)){
        return rv;
      }
      
      nameInDb = (PRUnichar *)mCrlAutoDownloadKey.get();
      updateErrCntPrefStr.AppendWithConversion(nameInDb);
      updateErrDetailPrefStr.AppendWithConversion(nameInDb);  
      errMsg.AssignWithConversion(tmpMessage.get());
      
      rv = pref->GetIntPref(updateErrCntPrefStr.get(),&errCnt);
      if( (NS_FAILED(rv)) || (errCnt == 0) ){
        pref->SetIntPref(updateErrCntPrefStr.get(),1);
      }else{
        pref->SetIntPref(updateErrCntPrefStr.get(),errCnt+1);
      }
      pref->SetCharPref(updateErrDetailPrefStr.get(),errMsg.get());
      nsCOMPtr<nsIPrefService> prefSvc(do_QueryInterface(pref));
      prefSvc->SavePrefFile(nsnull);
    }else{
      nsString message;
      nsCOMPtr<nsIWindowWatcher> wwatch(do_GetService(NS_WINDOWWATCHER_CONTRACTID));
      nsCOMPtr<nsIPrompt> prompter;
      if (wwatch){
        wwatch->GetNewPrompter(0, getter_AddRefs(prompter));
        nssComponent->GetPIPNSSBundleString("CrlImportFailure1", message);
        message.Append(NS_LITERAL_STRING("\n").get());
        message.Append(tmpMessage);
        nssComponent->GetPIPNSSBundleString("CrlImportFailure2", tmpMessage);
        message.Append(NS_LITERAL_STRING("\n").get());
        message.Append(tmpMessage);

        if(prompter) {
          nsPSMUITracker tracker;
          if (!tracker.isUIForbidden()) {
            prompter->Alert(0, message.get());
          }
        }
      }
    }
    break;
  default:
    break;
  }

  return NS_OK;

}

void 
PSMContentDownloader::setSilentDownload(PRBool flag)
{
  mDoSilentDownload = flag;
}

void
PSMContentDownloader::setCrlAutodownloadKey(nsAutoString key)
{
  mCrlAutoDownloadKey = key;
}


/* other mime types that we should handle sometime:
   
   application/x-pkcs7-crl
   application/x-pkcs7-mime
   application/pkcs7-signature
   application/pre-encrypted
   
*/

PRUint32
getPSMContentType(const char * aContentType)
{ 
  // Don't forget to update RegisterPSMContentListeners in nsNSSModule.cpp 
  // for every supported content type.
  
  if (!nsCRT::strcasecmp(aContentType, "application/x-x509-ca-cert"))
    return PSMContentDownloader::X509_CA_CERT;
  else if (!nsCRT::strcasecmp(aContentType, "application/x-x509-server-cert"))
    return PSMContentDownloader::X509_SERVER_CERT;
  else if (!nsCRT::strcasecmp(aContentType, "application/x-x509-user-cert"))
    return PSMContentDownloader::X509_USER_CERT;
  else if (!nsCRT::strcasecmp(aContentType, "application/x-x509-email-cert"))
    return PSMContentDownloader::X509_EMAIL_CERT;
  else if (!nsCRT::strcasecmp(aContentType, "application/x-pkcs7-crl"))
    return PSMContentDownloader::PKCS7_CRL;
  else if (!nsCRT::strcasecmp(aContentType, "application/x-x509-crl"))
    return PSMContentDownloader::PKCS7_CRL;
  else if (!nsCRT::strcasecmp(aContentType, "application/pkix-crl"))
    return PSMContentDownloader::PKCS7_CRL;
  return PSMContentDownloader::UNKNOWN_TYPE;
}


NS_IMPL_ISUPPORTS2(PSMContentListener,
                   nsIURIContentListener,
                   nsISupportsWeakReference) 

PSMContentListener::PSMContentListener()
{
  mLoadCookie = nsnull;
  mParentContentListener = nsnull;
}

PSMContentListener::~PSMContentListener()
{
}

nsresult
PSMContentListener::init()
{
  return NS_OK;
}

NS_IMETHODIMP
PSMContentListener::OnStartURIOpen(nsIURI *aURI, PRBool *aAbortOpen)
{
  //if we don't want to handle the URI, return PR_TRUE in
  //*aAbortOpen
  return NS_OK;
}

NS_IMETHODIMP
PSMContentListener::IsPreferred(const char * aContentType,
                                 char ** aDesiredContentType,
                                 PRBool * aCanHandleContent)
{
  return CanHandleContent(aContentType, PR_TRUE,
                          aDesiredContentType, aCanHandleContent);
}

NS_IMETHODIMP
PSMContentListener::CanHandleContent(const char * aContentType,
                                      PRBool aIsContentPreferred,
                                      char ** aDesiredContentType,
                                      PRBool * aCanHandleContent)
{
  PRUint32 type;
  type = getPSMContentType(aContentType);
  if (type == PSMContentDownloader::UNKNOWN_TYPE) {
    *aCanHandleContent = PR_FALSE;
  } else {
    *aCanHandleContent = PR_TRUE;
  }
  return NS_OK;
}

NS_IMETHODIMP
PSMContentListener::DoContent(const char * aContentType,
                               PRBool aIsContentPreferred,
                               nsIRequest * aRequest,
                               nsIStreamListener ** aContentHandler,
                               PRBool * aAbortProcess)
{
  PSMContentDownloader *downLoader;
  PRUint32 type;
  type = getPSMContentType(aContentType);
  PR_LOG(gPIPNSSLog, PR_LOG_DEBUG, ("PSMContentListener::DoContent\n"));
  if (type != PSMContentDownloader::UNKNOWN_TYPE) {
    downLoader = new PSMContentDownloader(type);
    if (downLoader) {
      downLoader->QueryInterface(NS_GET_IID(nsIStreamListener), 
                                            (void **)aContentHandler);
      return NS_OK;
    }
  }
  return NS_ERROR_FAILURE;
}

NS_IMETHODIMP
PSMContentListener::GetLoadCookie(nsISupports * *aLoadCookie)
{
  *aLoadCookie = mLoadCookie;
  NS_IF_ADDREF(*aLoadCookie);
  return NS_OK;
}

NS_IMETHODIMP
PSMContentListener::SetLoadCookie(nsISupports * aLoadCookie)
{
  mLoadCookie = aLoadCookie;
  return NS_OK;
}

NS_IMETHODIMP
PSMContentListener::GetParentContentListener(nsIURIContentListener ** aContentListener)
{
  *aContentListener = mParentContentListener;
  NS_IF_ADDREF(*aContentListener);
  return NS_OK;
}

NS_IMETHODIMP
PSMContentListener::SetParentContentListener(nsIURIContentListener * aContentListener)
{
  mParentContentListener = aContentListener;
  return NS_OK;
}
