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
 *   Brian Ryner <bryner@brianryner.com>
 *   Terry Hayes <thayes@netscape.com>
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
#include "nsNSSComponent.h" // for PIPNSS string bundle calls.
#include "nsNSSCallbacks.h"
#include "nsNSSCertificate.h"
#include "nsISSLStatus.h"
#include "nsNSSIOLayer.h" // for nsNSSSocketInfo
#include "nsIWebProgressListener.h"
#include "nsIStringBundle.h"
#include "nsXPIDLString.h"
#include "nsCOMPtr.h"
#include "nsIServiceManager.h"
#include "nsReadableUtils.h"
#include "nsIPrompt.h"
#include "nsProxiedService.h"
#include "nsIInterfaceRequestor.h"
#include "nsIInterfaceRequestorUtils.h"
#include "nsCRT.h"
#include "nsNSSShutDown.h"
#include "nsNSSEvent.h"
#include "nsIUploadChannel.h"
#include "nsSSLThread.h"
#include "nsAutoLock.h"
#include "nsIThread.h"
#include "nsIWindowWatcher.h"
#include "nsIPrompt.h"

#include "ssl.h"
#include "cert.h"
#include "ocsp.h"
#include "secerr.h"

static NS_DEFINE_CID(kNSSComponentCID, NS_NSSCOMPONENT_CID);

#ifdef PR_LOGGING
extern PRLogModuleInfo* gPIPNSSLog;
#endif

struct nsHTTPDownloadEvent : PLEvent {
  nsHTTPDownloadEvent();
  ~nsHTTPDownloadEvent();
  
  nsNSSHttpRequestSession *mRequestSession; // no ownership
  
  nsCOMPtr<nsHTTPListener> mListener;
  PRBool mResponsibleForDoneSignal;
};

nsHTTPDownloadEvent::nsHTTPDownloadEvent()
:mResponsibleForDoneSignal(PR_TRUE)
{
}

nsHTTPDownloadEvent::~nsHTTPDownloadEvent()
{
  if (mResponsibleForDoneSignal && mListener)
    mListener->send_done_signal();
}

static void PR_CALLBACK HandleHTTPDownloadPLEvent(nsHTTPDownloadEvent *aEvent)
{
  if((!aEvent) || (!aEvent->mListener))
    return;

  nsresult rv;
  nsCOMPtr<nsIIOService> ios = do_GetIOService(&rv);
  if (NS_FAILED(rv))
    return;

  nsCOMPtr<nsIChannel> chan;
  ios->NewChannel(aEvent->mRequestSession->mURL, nsnull, nsnull, getter_AddRefs(chan));
  if (NS_FAILED(rv))
    return;

  // Create a loadgroup for this new channel.  This way if the channel
  // is redirected, we'll have a way to cancel the resulting channel.
  nsCOMPtr<nsILoadGroup> loadGroup =
    do_CreateInstance(NS_LOADGROUP_CONTRACTID);
  chan->SetLoadGroup(loadGroup);

  if (aEvent->mRequestSession->mHasPostData)
  {
    nsCOMPtr<nsIInputStream> uploadStream;
    rv = NS_NewPostDataStream(getter_AddRefs(uploadStream),
                              PR_FALSE,
                              aEvent->mRequestSession->mPostData,
                              0, ios);
    if (NS_FAILED(rv))
      return;

    nsCOMPtr<nsIUploadChannel> uploadChannel(do_QueryInterface(chan, &rv));
    if (NS_FAILED(rv))
      return;

    rv = uploadChannel->SetUploadStream(uploadStream, 
                                        aEvent->mRequestSession->mPostContentType,
                                        -1);
    if (NS_FAILED(rv))
      return;
  }

  nsCOMPtr<nsIHttpChannel> hchan = do_QueryInterface(chan, &rv);
  if (NS_FAILED(rv))
    return;

  rv = hchan->SetRequestMethod(aEvent->mRequestSession->mRequestMethod);
  if (NS_FAILED(rv))
    return;

  nsSSLThread::rememberPendingHTTPRequest(loadGroup);

  aEvent->mResponsibleForDoneSignal = PR_FALSE;
  aEvent->mListener->mResponsibleForDoneSignal = PR_TRUE;

  rv = NS_NewStreamLoader(getter_AddRefs(aEvent->mListener->mLoader), 
                          hchan, 
                          aEvent->mListener, 
                          nsnull);

  if (NS_FAILED(rv)) {
    aEvent->mListener->mResponsibleForDoneSignal = PR_FALSE;
    aEvent->mResponsibleForDoneSignal = PR_TRUE;
    
    nsSSLThread::rememberPendingHTTPRequest(nsnull);
  }
}

static void PR_CALLBACK DestroyHTTPDownloadPLEvent(nsHTTPDownloadEvent* aEvent)
{
  delete aEvent;
}

struct nsCancelHTTPDownloadEvent : PLEvent {
};

static void PR_CALLBACK HandleCancelHTTPDownloadPLEvent(nsCancelHTTPDownloadEvent *aEvent)
{
  nsSSLThread::cancelPendingHTTPRequest();
}

static void PR_CALLBACK DestroyCancelHTTPDownloadPLEvent(nsCancelHTTPDownloadEvent* aEvent)
{
  delete aEvent;
}

SECStatus nsNSSHttpServerSession::createSessionFcn(const char *host,
                                                   PRUint16 portnum,
                                                   SEC_HTTP_SERVER_SESSION *pSession)
{
  if (!host || !pSession)
    return SECFailure;

  nsNSSHttpServerSession *hss = new nsNSSHttpServerSession;
  if (!hss)
    return SECFailure;

  hss->mHost = host;
  hss->mPort = portnum;

  *pSession = hss;
  return SECSuccess;
}

SECStatus nsNSSHttpRequestSession::createFcn(SEC_HTTP_SERVER_SESSION session,
                                             const char *http_protocol_variant,
                                             const char *path_and_query_string,
                                             const char *http_request_method, 
                                             const PRIntervalTime timeout, 
                                             SEC_HTTP_REQUEST_SESSION *pRequest)
{
  if (!session || !http_protocol_variant || !path_and_query_string || 
      !http_request_method || !pRequest)
    return SECFailure;

  nsNSSHttpServerSession* hss = NS_STATIC_CAST(nsNSSHttpServerSession*, session);
  if (!hss)
    return SECFailure;

  nsNSSHttpRequestSession *rs = new nsNSSHttpRequestSession;
  if (!rs)
    return SECFailure;

  rs->mTimeoutInterval = timeout;

  rs->mURL.Append(nsDependentCString(http_protocol_variant));
  rs->mURL.AppendLiteral("://");
  rs->mURL.Append(hss->mHost);
  rs->mURL.AppendLiteral(":");
  rs->mURL.AppendInt(hss->mPort);
  rs->mURL.Append(path_and_query_string);

  rs->mRequestMethod = nsDependentCString(http_request_method);

  *pRequest = (void*)rs;
  return SECSuccess;
}

SECStatus nsNSSHttpRequestSession::setPostDataFcn(const char *http_data, 
                                                  const PRUint32 http_data_len,
                                                  const char *http_content_type)
{
  mHasPostData = PR_TRUE;
  mPostData.Assign(http_data, http_data_len);
  mPostContentType.Assign(http_content_type);

  return SECSuccess;
}

SECStatus nsNSSHttpRequestSession::addHeaderFcn(const char *http_header_name, 
                                                const char *http_header_value)
{
  return SECFailure; // not yet implemented

  // All http code needs to be postponed to the UI thread.
  // Once this gets implemented, we need to add a string list member to
  // nsNSSHttpRequestSession and queue up the headers,
  // so they can be added in HandleHTTPDownloadPLEvent.
  //
  // The header will need to be set using 
  //   mHttpChannel->SetRequestHeader(nsDependentCString(http_header_name), 
  //                                  nsDependentCString(http_header_value), 
  //                                  PR_FALSE)));
}

#define CONDITION_WAIT_TIME PR_MillisecondsToInterval(250)

SECStatus nsNSSHttpRequestSession::trySendAndReceiveFcn(PRPollDesc **pPollDesc,
                                                        PRUint16 *http_response_code, 
                                                        const char **http_response_content_type, 
                                                        const char **http_response_headers, 
                                                        const char **http_response_data, 
                                                        PRUint32 *http_response_data_len)
{
  PR_LOG(gPIPNSSLog, PR_LOG_DEBUG,
         ("nsNSSHttpRequestSession::trySendAndReceiveFcn to %s\n", mURL.get()));

  if (nsIThread::IsMainThread())
  {
    nsresult rv;
    nsCOMPtr<nsINSSComponent> nssComponent(do_GetService(kNSSComponentCID, &rv));
    if (NS_FAILED(rv))
      return SECFailure;

    nsCOMPtr<nsIWindowWatcher> wwatch(do_GetService(NS_WINDOWWATCHER_CONTRACTID));
    if (wwatch){
      nsCOMPtr<nsIPrompt> prompter;
      wwatch->GetNewPrompter(0, getter_AddRefs(prompter));

      nsString message;
      nssComponent->GetPIPNSSBundleString("OCSPDeadlock", message);

      if(prompter) {
        nsPSMUITracker tracker;
        if (!tracker.isUIForbidden()) {
          prompter->Alert(0, message.get());
        }
      }
    }

    return SECFailure;
  }

  const int max_retries = 5;
  int retry_count = 0;
  PRBool retryable_error = PR_FALSE;
  SECStatus result_sec_status = SECFailure;

  do
  {
    if (retry_count > 0)
    {
      if (retryable_error)
      {
        PR_LOG(gPIPNSSLog, PR_LOG_DEBUG,
               ("nsNSSHttpRequestSession::trySendAndReceiveFcn - sleeping and retrying: %d of %d\n",
                retry_count, max_retries));
      }

      PR_Sleep( PR_MillisecondsToInterval(300) * retry_count );
    }

    ++retry_count;
    retryable_error = PR_FALSE;

    result_sec_status =
      internal_send_receive_attempt(retryable_error, pPollDesc, http_response_code,
                                    http_response_content_type, http_response_headers,
                                    http_response_data, http_response_data_len);
  }
  while (retryable_error &&
         retry_count < max_retries);

#ifdef PR_LOGGING
  if (retry_count > 1)
  {
    if (retryable_error)
      PR_LOG(gPIPNSSLog, PR_LOG_DEBUG,
             ("nsNSSHttpRequestSession::trySendAndReceiveFcn - still failing, giving up...\n"));
    else
      PR_LOG(gPIPNSSLog, PR_LOG_DEBUG,
             ("nsNSSHttpRequestSession::trySendAndReceiveFcn - success at attempt %d\n",
              retry_count));
  }
#endif

  return result_sec_status;
}

SECStatus
nsNSSHttpRequestSession::internal_send_receive_attempt(PRBool &retryable_error,
                                                       PRPollDesc **pPollDesc,
                                                       PRUint16 *http_response_code,
                                                       const char **http_response_content_type,
                                                       const char **http_response_headers,
                                                       const char **http_response_data,
                                                       PRUint32 *http_response_data_len)
{
  if (pPollDesc) *pPollDesc = nsnull;
  if (http_response_code) *http_response_code = 0;
  if (http_response_content_type) *http_response_content_type = 0;
  if (http_response_headers) *http_response_headers = 0;
  if (http_response_data) *http_response_data = 0;

  PRUint32 acceptableResultSize = 0;

  if (http_response_data_len)
  {
    acceptableResultSize = *http_response_data_len;
    *http_response_data_len = 0;
  }
  
  nsCOMPtr<nsIEventQueue> uiQueue = nsNSSEventGetUIEventQueue();
  if (!uiQueue)
    return SECFailure;

  if (!mListener)
    return SECFailure;

  if (NS_FAILED(mListener->InitLocks()))
    return SECFailure;

  PRLock *waitLock = mListener->mLock;
  PRCondVar *waitCondition = mListener->mCondition;
  volatile PRBool &waitFlag = mListener->mWaitFlag;
  waitFlag = PR_TRUE;

  nsHTTPDownloadEvent *event = new nsHTTPDownloadEvent;
  if (!event)
    return SECFailure;

  event->mListener = mListener;
  event->mRequestSession = this;

  PL_InitEvent(event, nsnull, (PLHandleEventProc)HandleHTTPDownloadPLEvent, 
                              (PLDestroyEventProc)DestroyHTTPDownloadPLEvent);
  nsresult rv = uiQueue->PostEvent(event);
  if (NS_FAILED(rv))
  {
    event->mResponsibleForDoneSignal = PR_FALSE;
    delete event;
    return SECFailure;
  }

  PRBool request_canceled = PR_FALSE;
  PRBool aborted_wait = PR_FALSE;

  {
    nsAutoLock locker(waitLock);

    const PRIntervalTime start_time = PR_IntervalNow();
    const PRIntervalTime wait_interval = CONDITION_WAIT_TIME;

    while (waitFlag)
    {
      PR_WaitCondVar(waitCondition, wait_interval);
      
      if (!waitFlag)
        break;

      if (!request_canceled)
      {
        if ((PRIntervalTime)(PR_IntervalNow() - start_time) > mTimeoutInterval)
        {
          request_canceled = PR_TRUE;
          // but we'll to continue to wait for waitFlag
          
          nsCancelHTTPDownloadEvent *cancelevent = new nsCancelHTTPDownloadEvent;
          PL_InitEvent(cancelevent, nsnull, (PLHandleEventProc)HandleCancelHTTPDownloadPLEvent, 
                                            (PLDestroyEventProc)DestroyCancelHTTPDownloadPLEvent);
          rv = uiQueue->PostEvent(cancelevent);
          if (NS_FAILED(rv))
          {
            NS_WARNING("cannot post cancel event");
            delete cancelevent;
            aborted_wait = PR_TRUE;
            break;
          }
        }
      }
    }
  }

  if (aborted_wait)
  {
    // we couldn't cancel it, let's no longer reference it
    nsSSLThread::rememberPendingHTTPRequest(nsnull);
  }

  if (request_canceled)
    return SECFailure;

  if (NS_FAILED(mListener->mResultCode))
  {
    if (mListener->mResultCode == NS_ERROR_CONNECTION_REFUSED
        ||
        mListener->mResultCode == NS_ERROR_NET_RESET)
    {
      retryable_error = PR_TRUE;
    }
    return SECFailure;
  }

  if (http_response_code)
    *http_response_code = mListener->mHttpResponseCode;

  if (mListener->mHttpRequestSucceeded && http_response_data && http_response_data_len) {

    *http_response_data_len = mListener->mResultLen;
  
    // acceptableResultSize == 0 means: any size is acceptable
    if (acceptableResultSize != 0
        &&
        acceptableResultSize < mListener->mResultLen)
    {
      return SECFailure;
    }

    // return data by reference, result data will be valid 
    // until "this" gets destroyed by NSS
    *http_response_data = (const char*)mListener->mResultData;
  }

  if (mListener->mHttpRequestSucceeded && http_response_content_type) {
    if (mListener->mHttpResponseContentType.Length()) {
      *http_response_content_type = mListener->mHttpResponseContentType.get();
    }
  }

  return SECSuccess;
}

SECStatus nsNSSHttpRequestSession::cancelFcn()
{
  // As of today, only the blocking variant of the http interface
  // has been implemented. Implementing cancelFcn will be necessary
  // as soon as we implement the nonblocking variant.
  return SECSuccess;
}

SECStatus nsNSSHttpRequestSession::freeFcn()
{
  delete this;
  return SECSuccess;
}

nsNSSHttpRequestSession::nsNSSHttpRequestSession()
: mHasPostData(PR_FALSE),
  mTimeoutInterval(0),
  mListener(new nsHTTPListener)
{
}

nsNSSHttpRequestSession::~nsNSSHttpRequestSession()
{
}

SEC_HttpClientFcn nsNSSHttpInterface::sNSSInterfaceTable;

void nsNSSHttpInterface::initTable()
{
  sNSSInterfaceTable.version = 1;
  SEC_HttpClientFcnV1 &v1 = sNSSInterfaceTable.fcnTable.ftable1;
  v1.createSessionFcn = createSessionFcn;
  v1.keepAliveSessionFcn = keepAliveFcn;
  v1.freeSessionFcn = freeSessionFcn;
  v1.createFcn = createFcn;
  v1.setPostDataFcn = setPostDataFcn;
  v1.addHeaderFcn = addHeaderFcn;
  v1.trySendAndReceiveFcn = trySendAndReceiveFcn;
  v1.cancelFcn = cancelFcn;
  v1.freeFcn = freeFcn;
}

void nsNSSHttpInterface::registerHttpClient()
{
  SEC_RegisterDefaultHttpClient(&sNSSInterfaceTable);
}

void nsNSSHttpInterface::unregisterHttpClient()
{
  SEC_RegisterDefaultHttpClient(nsnull);
}

nsHTTPListener::nsHTTPListener()
: mResultData(nsnull),
  mResultLen(0),
  mLock(nsnull),
  mCondition(nsnull),
  mWaitFlag(PR_TRUE),
  mResponsibleForDoneSignal(PR_FALSE)
{
}

nsresult nsHTTPListener::InitLocks()
{
  mLock = PR_NewLock();
  if (!mLock)
    return NS_ERROR_OUT_OF_MEMORY;
  
  mCondition = PR_NewCondVar(mLock);
  if (!mCondition)
  {
    PR_DestroyLock(mLock);
    mLock = nsnull;
    return NS_ERROR_OUT_OF_MEMORY;
  }
  
  return NS_OK;
}

nsHTTPListener::~nsHTTPListener()
{
  if (mResponsibleForDoneSignal)
    send_done_signal();

  if (mCondition)
    PR_DestroyCondVar(mCondition);
  
  if (mLock)
    PR_DestroyLock(mLock);
}

NS_IMPL_THREADSAFE_ISUPPORTS1(nsHTTPListener, nsIStreamLoaderObserver)

NS_IMETHODIMP
nsHTTPListener::OnStreamComplete(nsIStreamLoader* aLoader,
                                 nsISupports* aContext,
                                 nsresult aStatus,
                                 PRUint32 stringLen,
                                 const PRUint8* string)
{
  mResultCode = aStatus;

  nsCOMPtr<nsIRequest> req;
  nsCOMPtr<nsIHttpChannel> hchan;

  nsresult rv = aLoader->GetRequest(getter_AddRefs(req));
  
#ifdef PR_LOGGING
  if (NS_FAILED(aStatus))
  {
    PR_LOG(gPIPNSSLog, PR_LOG_DEBUG,
           ("nsHTTPListener::OnStreamComplete status failed %d", aStatus));
  }
#endif

  if (NS_SUCCEEDED(rv))
    hchan = do_QueryInterface(req, &rv);

  if (NS_SUCCEEDED(rv))
  {
    rv = hchan->GetRequestSucceeded(&mHttpRequestSucceeded);
    if (NS_FAILED(rv))
      mHttpRequestSucceeded = PR_FALSE;

    mResultLen = stringLen;
    mResultData = string; // reference. Make sure loader lives as long as this

    unsigned int rcode;
    rv = hchan->GetResponseStatus(&rcode);
    if (NS_FAILED(rv))
      mHttpResponseCode = 500;
    else
      mHttpResponseCode = rcode;

    hchan->GetResponseHeader(NS_LITERAL_CSTRING("Content-Type"), 
                                    mHttpResponseContentType);
  }

  if (mResponsibleForDoneSignal)
    send_done_signal();
  
  return aStatus;
}

void nsHTTPListener::send_done_signal()
{
  nsSSLThread::rememberPendingHTTPRequest(nsnull);
  
  mResponsibleForDoneSignal = PR_FALSE;

  {
    nsAutoLock locker(mLock);
    mWaitFlag = PR_FALSE;
    PR_NotifyAllCondVar(mCondition);
  }
}

/* Implementation of nsISSLStatus */
class nsSSLStatus
  : public nsISSLStatus
{
public:
  NS_DECL_ISUPPORTS
  NS_DECL_NSISSLSTATUS

  nsSSLStatus();
  virtual ~nsSSLStatus();

  /* public for initilization in this file */
  nsCOMPtr<nsIX509Cert> mServerCert;
  PRUint32 mKeyLength;
  PRUint32 mSecretKeyLength;
  PRUint32 mProtocolVersion;
  nsXPIDLCString mCipherName;
};

NS_IMETHODIMP
nsSSLStatus::GetServerCert(nsIX509Cert** _result)
{
  NS_ASSERTION(_result, "non-NULL destination required");

  *_result = mServerCert;
  NS_IF_ADDREF(*_result);

  return NS_OK;
}

NS_IMETHODIMP
nsSSLStatus::GetKeyLength(PRUint32* _result)
{
  NS_ASSERTION(_result, "non-NULL destination required");

  *_result = mKeyLength;

  return NS_OK;
}

NS_IMETHODIMP
nsSSLStatus::GetSecretKeyLength(PRUint32* _result)
{
  NS_ASSERTION(_result, "non-NULL destination required");

  *_result = mSecretKeyLength;

  return NS_OK;
}

NS_IMETHODIMP
nsSSLStatus::GetProtocolVersion(PRUint32* _result)
{
  NS_ASSERTION(_result, "non-NULL destination required");

  *_result = mProtocolVersion;

  return NS_OK;
}

NS_IMETHODIMP
nsSSLStatus::GetCipherName(char** _result)
{
  NS_ASSERTION(_result, "non-NULL destination required");

  *_result = PL_strdup(mCipherName.get());

  return NS_OK;
}

nsSSLStatus::nsSSLStatus()
: mKeyLength(0), mSecretKeyLength(0), mProtocolVersion(0)
{
}

NS_IMPL_THREADSAFE_ISUPPORTS1(nsSSLStatus, nsISSLStatus)

nsSSLStatus::~nsSSLStatus()
{
}


char* PR_CALLBACK
PK11PasswordPrompt(PK11SlotInfo* slot, PRBool retry, void* arg) {
  nsNSSShutDownPreventionLock locker;
  nsresult rv = NS_OK;
  PRUnichar *password = nsnull;
  PRBool value = PR_FALSE;
  nsIInterfaceRequestor *ir = NS_STATIC_CAST(nsIInterfaceRequestor*, arg);
  nsCOMPtr<nsIPrompt> proxyPrompt;

  // If no context is provided, no prompt is possible.
  if (!ir)
    return nsnull;

  /* TODO: Retry should generate a different dialog message */
/*
  if (retry)
    return nsnull;
*/

  // The interface requestor object may not be safe, so
  // proxy the call to get the nsIPrompt.

  nsCOMPtr<nsIProxyObjectManager> proxyman(do_GetService(NS_XPCOMPROXY_CONTRACTID));
  if (!proxyman) return nsnull;

  nsCOMPtr<nsIInterfaceRequestor> proxiedCallbacks;
  proxyman->GetProxyForObject(NS_UI_THREAD_EVENTQ,
                              NS_GET_IID(nsIInterfaceRequestor),
                              ir,
                              PROXY_SYNC,
                              getter_AddRefs(proxiedCallbacks));

  // Get the desired interface
  nsCOMPtr<nsIPrompt> prompt(do_GetInterface(proxiedCallbacks));
  if (!prompt) {
    NS_ASSERTION(PR_FALSE, "callbacks does not implement nsIPrompt");
    return nsnull;
  }

  // Finally, get a proxy for the nsIPrompt
  proxyman->GetProxyForObject(NS_UI_THREAD_EVENTQ,
	                      NS_GET_IID(nsIPrompt),
                              prompt,
                              PROXY_SYNC,
                              getter_AddRefs(proxyPrompt));


  nsAutoString promptString;
  nsCOMPtr<nsINSSComponent> nssComponent(do_GetService(kNSSComponentCID, &rv));

  if (NS_FAILED(rv))
    return nsnull; 

  const PRUnichar* formatStrings[1] = { ToNewUnicode(NS_ConvertUTF8toUCS2(PK11_GetTokenName(slot))) };
  rv = nssComponent->PIPBundleFormatStringFromName("CertPassPrompt",
                                      formatStrings, 1,
                                      promptString);
  nsMemory::Free(NS_CONST_CAST(PRUnichar*, formatStrings[0]));

  if (NS_FAILED(rv))
    return nsnull;

  {
    nsPSMUITracker tracker;
    if (tracker.isUIForbidden()) {
      rv = NS_ERROR_NOT_AVAILABLE;
    }
    else {
      rv = proxyPrompt->PromptPassword(nsnull, promptString.get(),
                                       &password, nsnull, nsnull, &value);
    }
  }
  
  if (NS_SUCCEEDED(rv) && value) {
    char* str = ToNewUTF8String(nsDependentString(password));
    Recycle(password);
    return str;
  }

  return nsnull;
}

void PR_CALLBACK HandshakeCallback(PRFileDesc* fd, void* client_data) {
  nsNSSShutDownPreventionLock locker;
  PRInt32 sslStatus;
  char* signer = nsnull;
  char* cipherName = nsnull;
  PRInt32 keyLength;
  nsresult rv;
  PRInt32 encryptBits;

  if (SECSuccess != SSL_SecurityStatus(fd, &sslStatus, &cipherName, &keyLength,
                                       &encryptBits, &signer, nsnull)) {
    return;
  }

  PRInt32 secStatus;
  if (sslStatus == SSL_SECURITY_STATUS_OFF)
    secStatus = nsIWebProgressListener::STATE_IS_BROKEN;
  else if (encryptBits >= 90)
    secStatus = (nsIWebProgressListener::STATE_IS_SECURE |
                 nsIWebProgressListener::STATE_SECURE_HIGH);
  else
    secStatus = (nsIWebProgressListener::STATE_IS_SECURE |
                 nsIWebProgressListener::STATE_SECURE_LOW);

  CERTCertificate *peerCert = SSL_PeerCertificate(fd);
  char* caName = CERT_GetOrgName(&peerCert->issuer);
  CERT_DestroyCertificate(peerCert);
  if (!caName) {
    caName = signer;
  }

  // If the CA name is RSA Data Security, then change the name to the real
  // name of the company i.e. VeriSign, Inc.
  if (nsCRT::strcmp((const char*)caName, "RSA Data Security, Inc.") == 0) {
    // In this case, caName != signer since the logic implies signer
    // would be at minimal "O=RSA Data Security, Inc" because caName
    // is what comes after to O=.  So we're OK just freeing this memory
    // without checking to see if it's equal to signer;
    NS_ASSERTION(caName != signer, "caName was equal to caName when it shouldn't be");
    PR_Free(caName);
    caName = PL_strdup("Verisign, Inc.");
  }

  nsAutoString shortDesc;
  const PRUnichar* formatStrings[1] = { ToNewUnicode(NS_ConvertUTF8toUCS2(caName)) };
  nsCOMPtr<nsINSSComponent> nssComponent(do_GetService(kNSSComponentCID, &rv));
  if (NS_SUCCEEDED(rv)) {
    rv = nssComponent->PIPBundleFormatStringFromName("SignedBy",
                                                   formatStrings, 1,
                                                   shortDesc);

    nsMemory::Free(NS_CONST_CAST(PRUnichar*, formatStrings[0]));

    nsNSSSocketInfo* infoObject = (nsNSSSocketInfo*) fd->higher->secret;
    infoObject->SetSecurityState(secStatus);
    infoObject->SetShortSecurityDescription(shortDesc.get());

    /* Set the SSL Status information */
    nsCOMPtr<nsSSLStatus> status = new nsSSLStatus();

    CERTCertificate *serverCert = SSL_PeerCertificate(fd);
    if (serverCert) {
      status->mServerCert = new nsNSSCertificate(serverCert);
      CERT_DestroyCertificate(serverCert);
    }

    status->mKeyLength = keyLength;
    status->mSecretKeyLength = encryptBits;
    status->mCipherName.Adopt(cipherName);

    SSLChannelInfo channelInfo;
    if (SSL_GetChannelInfo(fd, &channelInfo, sizeof(channelInfo)) == SECSuccess) {
      // Get the protocol version
      // 0=ssl3, 1=tls1, 2=tls1.1, 3=tls1.2
      status->mProtocolVersion = channelInfo.protocolVersion & 0xFF;
    }

    infoObject->SetSSLStatus(status);
  }

  if (caName != signer) {
    PR_Free(caName);
  }
  PR_Free(signer);
}

struct nsSerialBinaryBlacklistEntry
{
  unsigned int len;
  const char *binary_serial;
};

// bug 642395
static struct nsSerialBinaryBlacklistEntry myUTNBlacklistEntries[] = {
  { 17, "\x00\x92\x39\xd5\x34\x8f\x40\xd1\x69\x5a\x74\x54\x70\xe1\xf2\x3f\x43" },
  { 17, "\x00\xd8\xf3\x5f\x4e\xb7\x87\x2b\x2d\xab\x06\x92\xe3\x15\x38\x2f\xb0" },
  { 16, "\x72\x03\x21\x05\xc5\x0c\x08\x57\x3d\x8e\xa5\x30\x4e\xfe\xe8\xb0" },
  { 17, "\x00\xb0\xb7\x13\x3e\xd0\x96\xf9\xb5\x6f\xae\x91\xc8\x74\xbd\x3a\xc0" },
  { 16, "\x39\x2a\x43\x4f\x0e\x07\xdf\x1f\x8a\xa3\x05\xde\x34\xe0\xc2\x29" },
  { 16, "\x3e\x75\xce\xd4\x6b\x69\x30\x21\x21\x88\x30\xae\x86\xa8\x2a\x71" },
  { 17, "\x00\xe9\x02\x8b\x95\x78\xe4\x15\xdc\x1a\x71\x0a\x2b\x88\x15\x44\x47" },
  { 17, "\x00\xd7\x55\x8f\xda\xf5\xf1\x10\x5b\xb2\x13\x28\x2b\x70\x77\x29\xa3" },
  { 16, "\x04\x7e\xcb\xe9\xfc\xa5\x5f\x7b\xd0\x9e\xae\x36\xe1\x0c\xae\x1e" },
  { 17, "\x00\xf5\xc8\x6a\xf3\x61\x62\xf1\x3a\x64\xf5\x4f\x6d\xc9\x58\x7c\x06" },
  { 0, 0 } // end marker
};

// Bug 682927: Do not trust any DigiNotar-issued certificates.
// We do this check after normal certificate validation because we do not
// want to override a "revoked" OCSP response.
PRErrorCode
PSM_SSL_BlacklistDigiNotar(CERTCertificate * serverCert,
                           CERTCertList * serverCertChain)
{
  PRBool isDigiNotarIssuedCert = PR_FALSE;

  for (CERTCertListNode *node = CERT_LIST_HEAD(serverCertChain);
       !CERT_LIST_END(node, serverCertChain);
       node = CERT_LIST_NEXT(node)) {
    if (!node->cert->issuerName)
      continue;

    if (strstr(node->cert->issuerName, "CN=DigiNotar")) {
      isDigiNotarIssuedCert = PR_TRUE;
      // Do not let the user override the error if the cert was
      // chained from the "DigiNotar Root CA" cert and the cert was issued
      // within the time window in which we think the mis-issuance(s) occurred.
      if (strstr(node->cert->issuerName, "CN=DigiNotar Root CA")) {
        PRTime cutoff = 0, notBefore = 0, notAfter = 0;
        PRStatus status = PR_ParseTimeString("01-JUL-2011 00:00", PR_TRUE, &cutoff);
        NS_ASSERTION(status == PR_SUCCESS, "PR_ParseTimeString failed");
        if (status != PR_SUCCESS ||
           CERT_GetCertTimes(serverCert, &notBefore, &notAfter) != SECSuccess ||
           notBefore >= cutoff) {
          return SEC_ERROR_REVOKED_CERTIFICATE;
        }
      }
    }
  }

  if (isDigiNotarIssuedCert)
    return SEC_ERROR_UNTRUSTED_ISSUER; // user can override this
  else
    return 0; // No DigiNotor cert => carry on as normal
}

SECStatus PR_CALLBACK AuthCertificateCallback(void* client_data, PRFileDesc* fd,
                                              PRBool checksig, PRBool isServer) {
  nsNSSShutDownPreventionLock locker;

  CERTCertificate *serverCert = SSL_PeerCertificate(fd);
  if (serverCert && 
      serverCert->serialNumber.data &&
      serverCert->issuerName &&
      !strcmp(serverCert->issuerName, 
        "CN=UTN-USERFirst-Hardware,OU=http://www.usertrust.com,O=The USERTRUST Network,L=Salt Lake City,ST=UT,C=US")) {

    unsigned char *server_cert_comparison_start = (unsigned char*)serverCert->serialNumber.data;
    unsigned int server_cert_comparison_len = serverCert->serialNumber.len;

    while (server_cert_comparison_len) {
      if (*server_cert_comparison_start != 0)
        break;

      ++server_cert_comparison_start;
      --server_cert_comparison_len;
    }

    nsSerialBinaryBlacklistEntry *walk = myUTNBlacklistEntries;
    for ( ; walk && walk->len; ++walk) {

      unsigned char *locked_cert_comparison_start = (unsigned char*)walk->binary_serial;
      unsigned int locked_cert_comparison_len = walk->len;
      
      while (locked_cert_comparison_len) {
        if (*locked_cert_comparison_start != 0)
          break;
        
        ++locked_cert_comparison_start;
        --locked_cert_comparison_len;
      }

      if (server_cert_comparison_len == locked_cert_comparison_len &&
          !memcmp(server_cert_comparison_start, locked_cert_comparison_start, locked_cert_comparison_len)) {
        PR_SetError(SEC_ERROR_REVOKED_CERTIFICATE, 0);
        return SECFailure;
      }
    }
  }
  
  // first the default action
  SECStatus rv = SSL_AuthCertificate(CERT_GetDefaultCertDB(), fd, checksig, isServer);

  // We want to remember the CA certs in the temp db, so that the application can find the
  // complete chain at any time it might need it.
  // But we keep only those CA certs in the temp db, that we didn't already know.

  CERTCertList *certList = nsnull;
  if (rv == SECSuccess) {
    certList = CERT_GetCertChainFromCert(serverCert, PR_Now(), certUsageSSLCA);
    if (!certList) {
      rv = SECFailure;
    } else {
      PRErrorCode blacklistErrorCode = PSM_SSL_BlacklistDigiNotar(serverCert,
                                                                  certList);
      if (blacklistErrorCode != 0) {
        nsNSSSocketInfo* infoObject = (nsNSSSocketInfo*) fd->higher->secret;
        infoObject->SetCertIssuerBlacklisted();
        PORT_SetError(blacklistErrorCode);
        rv = SECFailure;
      }
    }
  }
  
  if (SECSuccess == rv) {
    if (serverCert) {

      nsCOMPtr<nsINSSComponent> nssComponent;
      
      for (CERTCertListNode *node = CERT_LIST_HEAD(certList);
           !CERT_LIST_END(node, certList);
           node = CERT_LIST_NEXT(node)) {

        if (node->cert->slot) {
          // This cert was found on a token, no need to remember it in the temp db.
          continue;
        }

        if (node->cert->isperm) {
          // We don't need to remember certs already stored in perm db.
          continue;
        }
        
        if (node->cert == serverCert) {
          // We don't want to remember the server cert, 
          // the code that cares for displaying page info does this already.
          continue;
        }
        
        // We have found a signer cert that we want to remember.

        if (!nssComponent) {
          // delay getting the service until we really need it
          nsresult rv;
          nssComponent = do_GetService(kNSSComponentCID, &rv);
        }
        
        if (nssComponent) {
          nssComponent->RememberCert(node->cert);
        }
      }

      if(certList) {
        CERT_DestroyCertList(certList);
      }
      CERT_DestroyCertificate(serverCert);
    }
  }

  return rv;
}
