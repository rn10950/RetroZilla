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
 * The Original Code is Minimo Desktop
 *
 * The Initial Developer of the Original Code is 
 * Douglas F. Turner II  <dougt@meer.net>
 * Portions created by the Initial Developer are Copyright (C) 2006
 * the Initial Developer. All Rights Reserved.
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

#include "nsGenericFactory.h"
#include "nsIMinimoDesktop.h"
#include "nsString.h"
#include "nsIFile.h"

#ifdef WIN32
// You need to have the windows platform SDK in your INCLUDE path.
#include <Objidl.h>
#include <rapi.h>
#endif

class MinimoDesktop : public nsIMinimoDesktop
{
public:
  NS_DECL_ISUPPORTS
  NS_DECL_NSIMINIMODESKTOP

  MinimoDesktop();

private:
  ~MinimoDesktop();
};

NS_IMPL_ISUPPORTS1(MinimoDesktop, nsIMinimoDesktop)

PRBool device_connect()
{
#ifdef WIN32
  HRESULT hRapiResult = CeRapiInit();
  if (hRapiResult == E_FAIL)
    return PR_FALSE;
  return PR_TRUE;
#else
  return PR_FALSE;
#endif
}

void device_disconnect()
{
  CeRapiUninit();
}

class device_connection
{
public:
  device_connection()
  {
    connected = device_connect();
  }

  ~device_connection()
  {
    device_disconnect();
  }

  PRBool connected;
};

MinimoDesktop::MinimoDesktop()
{
}

MinimoDesktop::~MinimoDesktop()
{
}

NS_IMETHODIMP MinimoDesktop::GetConnected(PRBool *aConnected)
{
  device_connection dc;
  *aConnected = dc.connected;
  return NS_OK;
}

NS_IMETHODIMP MinimoDesktop::GetAvailableMemory(PRInt32 *aAvailableMemory)
{
  device_connection dc;
  if (!dc.connected)
    return NS_ERROR_NOT_AVAILABLE;

#ifdef WIN32
  MEMORYSTATUS ms;
  ms.dwLength = sizeof(MEMORYSTATUS);

  CeGlobalMemoryStatus(&ms);

  *aAvailableMemory = ms.dwAvailPhys;
#endif

  return NS_OK;
}

NS_IMETHODIMP MinimoDesktop::GetBatteryLifePercent(PRInt32 *aBatteryLifePercent)
{
  device_connection dc;
  if (!dc.connected)
    return NS_ERROR_NOT_AVAILABLE;

#ifdef WIN32
  SYSTEM_POWER_STATUS_EX ps;
  BOOL b = CeGetSystemPowerStatusEx(&ps, false);

  if (!b)
    return NS_ERROR_FAILURE;

  *aBatteryLifePercent = ps.BatteryLifePercent;
#endif

  return NS_OK;
}

NS_IMETHODIMP MinimoDesktop::GetMinimoInstallLocation(PRUnichar **_retval)
{
  return NS_ERROR_NOT_IMPLEMENTED;
}

NS_IMETHODIMP MinimoDesktop::RemoteStartProcess(const PRUnichar *path, const PRUnichar *args)
{
  device_connection dc;
  if (!dc.connected)
    return NS_ERROR_NOT_AVAILABLE;

#ifdef WIN32
  PROCESS_INFORMATION p;
  CeCreateProcess(path, args, nsnull, nsnull, false, 0, nsnull, nsnull, nsnull, &p);

#endif

  return NS_OK;
}

NS_IMETHODIMP MinimoDesktop::RemoteCreateDirectory(const PRUnichar *dir)
{
  device_connection dc;
  if (!dc.connected)
    return NS_ERROR_NOT_AVAILABLE;

#ifdef WIN32
  CeCreateDirectory(dir, nsnull); 
#endif

  return NS_OK;
}

NS_IMETHODIMP MinimoDesktop::RemoteRemoveFile(const PRUnichar *source)
{
  device_connection dc;
  if (!dc.connected)
    return NS_ERROR_NOT_AVAILABLE;

#ifdef WIN32
  CeDeleteFile(source);
  CeRemoveDirectory(source);
#endif

  return NS_OK;
}

NS_IMETHODIMP MinimoDesktop::RemoteCopyFile(const PRUnichar *source, const PRUnichar *dest)
{
  device_connection dc;
  if (!dc.connected)
    return NS_ERROR_NOT_AVAILABLE;

#ifdef WIN32
  CeCopyFile(source, dest, false);
#endif

  return NS_OK;
}

NS_IMETHODIMP MinimoDesktop::RemoteMoveFile(const PRUnichar *source, const PRUnichar *dest)
{
  device_connection dc;
  if (!dc.connected)
    return NS_ERROR_NOT_AVAILABLE;

#ifdef WIN32
  CeMoveFile(source, dest);
#endif

  return NS_OK;
}

NS_IMETHODIMP MinimoDesktop::CopyFileToDevice(const PRUnichar *locationOnDevice, nsIFile *localFile)
{
  device_connection dc;
  if (!dc.connected)
    return NS_ERROR_NOT_AVAILABLE;

  nsresult rv = NS_OK;

  nsCAutoString path;
  localFile->GetNativePath(path);

  HANDLE hSrc = CreateFile(path.get(),
                           GENERIC_READ,
                           FILE_SHARE_READ,
                           NULL,
                           OPEN_EXISTING,
                           FILE_ATTRIBUTE_NORMAL,
                           NULL);

  if (INVALID_HANDLE_VALUE == hSrc)
  {
    return NS_ERROR_FAILURE;
  }
  
  HANDLE hDest = CeCreateFile(locationOnDevice,
                              GENERIC_WRITE,
                              FILE_SHARE_READ,
                              NULL,
                              CREATE_ALWAYS,
                              FILE_ATTRIBUTE_NORMAL,
                              NULL);
  
  if (INVALID_HANDLE_VALUE == hDest )
  {
    return NS_ERROR_FAILURE;
  }

  BYTE  buffer[4096];
  DWORD dwNumRead, dwNumWritten;

  do
  {
    if (ReadFile(hSrc, &buffer, sizeof(buffer), &dwNumRead, NULL))
    {
      if (!CeWriteFile(hDest, &buffer, dwNumRead, &dwNumWritten, NULL))
      {
        rv = NS_ERROR_FAILURE;
        goto FatalError;
      }
    }
    else
    {
      rv = NS_ERROR_FAILURE;
      goto FatalError;
    }
  }
  while (dwNumRead);

FatalError:
    CeCloseHandle(hDest);
    CloseHandle (hSrc);

  return rv;
}

NS_IMETHODIMP MinimoDesktop::CopyFileFromDevice(const PRUnichar *locationOnDevice, nsIFile *localFile)
{
  device_connection dc;
  if (!dc.connected)
    return NS_ERROR_NOT_AVAILABLE;

  nsresult rv = NS_OK;

  HANDLE hSrc = CeCreateFile(locationOnDevice,
                             GENERIC_READ,
                             FILE_SHARE_READ,
                             NULL,
                             OPEN_EXISTING,
                             FILE_ATTRIBUTE_NORMAL,
                             NULL);

  if (!hSrc)
    return NS_ERROR_FAILURE;

  nsCAutoString path;
  localFile->GetNativePath(path);
  
  HANDLE hDest = CreateFile(path.get(),
                            GENERIC_WRITE,
                            FILE_SHARE_READ,
                            NULL,
                            CREATE_ALWAYS,
                            FILE_ATTRIBUTE_NORMAL,
                            NULL);

  
  BYTE  buffer[4096];
  DWORD dwNumRead, dwNumWritten;

  do
  {
    if (CeReadFile( hSrc, &buffer, sizeof(buffer), &dwNumRead, NULL))
    {
     
      if (!WriteFile(hDest, &buffer, dwNumRead, &dwNumWritten, NULL))
      {
        rv = NS_ERROR_FAILURE;
        goto FatalError;
      }
    }
    else
    {
      rv = NS_ERROR_FAILURE;
      goto FatalError;
    }
  } 
  while (dwNumRead);
  
FatalError:
  CeCloseHandle(hSrc);
  CloseHandle (hDest);

  return rv;
}



//------------------------------------------------------------------------------
//  XPCOM REGISTRATION BELOW
//------------------------------------------------------------------------------

#define MinimoDesktop_CID \
{ 0x178e2513, 0x957c, 0x4e1b, \
{ 0x81, 0xf4, 0x11, 0x18, 0x35, 0x49, 0xc3, 0xd2 } }

#define MinimoDesktop_ContractID "@mozilla.org/minimoDesktop;1"


NS_GENERIC_FACTORY_CONSTRUCTOR(MinimoDesktop)
  
  
static const nsModuleComponentInfo components[] =
{
  { "MinimoDesktop", 
    MinimoDesktop_CID, 
    MinimoDesktop_ContractID,
    MinimoDesktopConstructor,
    nsnull,
    nsnull
  }
  
};

NS_IMPL_NSGETMODULE(MinimoDesktopModule, components)
