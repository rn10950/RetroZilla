# ***** BEGIN LICENSE BLOCK *****
# Version: MPL 1.1/GPL 2.0/LGPL 2.1
#
# The contents of this file are subject to the Mozilla Public License Version
# 1.1 (the "License"); you may not use this file except in compliance with
# the License. You may obtain a copy of the License at
# http://www.mozilla.org/MPL/
#
# Software distributed under the License is distributed on an "AS IS" basis,
# WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
# for the specific language governing rights and limitations under the
# License.
#
# The Original Code is the Mozilla Installer code.
#
# The Initial Developer of the Original Code is Mozilla Foundation
# Portions created by the Initial Developer are Copyright (C) 2006
# the Initial Developer. All Rights Reserved.
#
# Contributor(s):
#  Robert Strong <robert.bugzilla@gmail.com>
#
# Alternatively, the contents of this file may be used under the terms of
# either the GNU General Public License Version 2 or later (the "GPL"), or
# the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
# in which case the provisions of the GPL or the LGPL are applicable instead
# of those above. If you wish to allow use of your version of this file only
# under the terms of either the GPL or the LGPL, and not to allow others to
# use your version of this file under the terms of the MPL, indicate your
# decision by deleting the provisions above and replace them with the notice
# and other provisions required by the GPL or the LGPL. If you do not delete
# the provisions above, a recipient may use your version of this file under
# the terms of any one of the MPL, the GPL or the LGPL.
#
# ***** END LICENSE BLOCK *****

; The fonts for the ja and ko locales are wider and shorter than western fonts.
; This will increase the width and lessen the height of the window which
; increases the width and lessens the height of the bitmaps since they stretch
; to fit so they look correct under various dpi settings. IMAGE_SUFFIX is used
; to specify a different bitmap by adding a suffix to the bitmap name to
; workaround this issue.
!define WIZ_IMAGE_SUFFIX ""
; Besides the ja and ko issue noted above this is also used to append RTL to the
; header image for RTL locales.
!define HDR_IMAGE_SUFFIX ""

; Appends _RTL to MUI_HEADERIMAGE_BITMAP for RTL locales.
!define MUI_HEADER_SUFFIX ""

; Locales that require a font specified.
!if ${AB_CD} == "ja"
!undef WIZ_IMAGE_SUFFIX
!define WIZ_IMAGE_SUFFIX "4"
!undef HDR_IMAGE_SUFFIX
!define HDR_IMAGE_SUFFIX "4"
!endif

!if ${AB_CD} == "ko"
!undef WIZ_IMAGE_SUFFIX
!define WIZ_IMAGE_SUFFIX "2"
!undef HDR_IMAGE_SUFFIX
!define HDR_IMAGE_SUFFIX "2"
!endif

!if ${AB_CD} == "zh-CN"
!undef WIZ_IMAGE_SUFFIX
!define WIZ_IMAGE_SUFFIX "3"
!undef HDR_IMAGE_SUFFIX
!define HDR_IMAGE_SUFFIX "3"
!endif

!if ${AB_CD} == "zh-TW"
!undef WIZ_IMAGE_SUFFIX
!define WIZ_IMAGE_SUFFIX "3"
!undef HDR_IMAGE_SUFFIX
!define HDR_IMAGE_SUFFIX "3"
!endif

; RTL Locales
!if ${AB_CD} == "ar"
!undef MUI_HEADER_SUFFIX
!define MUI_HEADER_SUFFIX "_RTL"
!undef HDR_IMAGE_SUFFIX
!define HDR_IMAGE_SUFFIX "RTL"
!endif

!if ${AB_CD} == "he"
!undef MUI_HEADER_SUFFIX
!define MUI_HEADER_SUFFIX "_RTL"
!undef HDR_IMAGE_SUFFIX
!define HDR_IMAGE_SUFFIX "RTL"
!endif

