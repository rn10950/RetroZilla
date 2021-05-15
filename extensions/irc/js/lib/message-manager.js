/* -*- Mode: C++; tab-width: 4; indent-tabs-mode: nil; c-basic-offset: 4 -*-
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
 * The Original Code is The JavaScript Debugger.
 *
 * The Initial Developer of the Original Code is
 * Netscape Communications Corporation.
 * Portions created by the Initial Developer are Copyright (C) 1998
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Robert Ginda, <rginda@netscape.com>, original author
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

function MessageManager(entities)
{
    const UC_CTRID = "@mozilla.org/intl/scriptableunicodeconverter";
    const nsIUnicodeConverter = 
        Components.interfaces.nsIScriptableUnicodeConverter;

    this.ucConverter =
        Components.classes[UC_CTRID].getService(nsIUnicodeConverter);
    this.defaultBundle = null;
    this.bundleList = new Array();
    // Provide a fallback so we don't break getMsg and related constants later.
    this.entities = entities || {};
}

// ISO-2022-JP (often used for Japanese on IRC) doesn't contain any support
// for hankaku kana (half-width katakana), so we support the option to convert
// it to zenkaku kana (full-width katakana). This does not affect any other
// encoding at this time.
MessageManager.prototype.enableHankakuToZenkaku = false;

MessageManager.prototype.loadBrands =
function mm_loadbrands()
{
    var entities = this.entities;
    var app = getService("@mozilla.org/xre/app-info;1", "nsIXULAppInfo");
    if (app)
    {
        // Use App info if possible
        entities.brandShortName = app.name;
        entities.brandFullName = app.name + " " + app.version;
        entities.brandVendorName = app.vendor;
        return;
    }

    var brandBundle;
    var path = "chrome://branding/locale/brand.properties";
    try
    {
        brandBundle = this.addBundle(path);
    }
    catch (exception)
    {
        // May be an older mozilla version, try another location.
        path = "chrome://global/locale/brand.properties";
        brandBundle = this.addBundle(path);
    }

    entities.brandShortName = brandBundle.GetStringFromName("brandShortName");
    entities.brandVendorName = brandBundle.GetStringFromName("vendorShortName");
    // Not all versions of Suite / Fx have this defined; Cope:
    try
    {
        entities.brandFullName = brandBundle.GetStringFromName("brandFullName");
    }
    catch(exception)
    {
        entities.brandFullName = entities.brandShortName;
    }

    // Remove all of this junk, or it will be the default bundle for getMsg...
    this.bundleList.pop();
}

MessageManager.prototype.addBundle = 
function mm_addbundle(bundlePath, targetWindow)
{
    var bundle = srGetStrBundle(bundlePath);
    this.bundleList.push(bundle);

    // The bundle will load if the file doesn't exist. This will fail though.
    // We want to be clean and remove the bundle again.
    try
    {
        this.importBundle(bundle, targetWindow, this.bundleList.length - 1);
    }
    catch (exception)
    {
        // Clean up and return the exception.
        this.bundleList.pop();
        throw exception;
    }
    return bundle;
}

MessageManager.prototype.importBundle =
function mm_importbundle(bundle, targetWindow, index)
{
    var me = this;
    function replaceEntities(matched, entity)
    {
        if (entity in me.entities)
            return me.entities[entity];

        return matched;
    };
    const nsIPropertyElement = Components.interfaces.nsIPropertyElement;

    if (!targetWindow)
        targetWindow = window;

    if (typeof index == "undefined")
        index = arrayIndexOf(this.bundleList, bundle);
    
    var pfx;
    if (index == 0)
        pfx = "";
    else
        pfx = index + ":";

    var enumer = bundle.getSimpleEnumeration();

    while (enumer.hasMoreElements())
    {
        var prop = enumer.getNext().QueryInterface(nsIPropertyElement);
        var ary = prop.key.match (/^(msg|msn)/);
        if (ary)
        {
            var constValue;
            var constName = prop.key.toUpperCase().replace (/\./g, "_");
            if (ary[1] == "msn" || prop.value.search(/%(\d+\$)?s/i) != -1)
                constValue = pfx + prop.key;
            else
                constValue = prop.value.replace (/^\"/, "").replace (/\"$/, "");

            constValue = constValue.replace(/\&(\w+)\;/g, replaceEntities);
            targetWindow[constName] = constValue;
        }
    }

    if (this.bundleList.length == 1)
        this.defaultBundle = bundle;
}

MessageManager.prototype.convertHankakuToZenkaku =
function mm_converthankakutozenkaku(msg)
{
    const basicMapping = [
        /* 0xFF60 */ 0xFF60,0x3002,0x300C,0x300D,0x3001,0x30FB,0x30F2,0x30A1,
        /* 0xFF68 */ 0x30A3,0x30A5,0x30A7,0x30A9,0x30E3,0x30E5,0x30E7,0x30C3,
        /* 0xFF70 */ 0x30FC,0x30A2,0x30A4,0x30A6,0x30A8,0x30AA,0x30AB,0x30AD,
        /* 0xFF78 */ 0x30AF,0x30B1,0x30B3,0x30B5,0x30B7,0x30B9,0x30BB,0x30BD,
        /* 0xFF80 */ 0x30BF,0x30C1,0x30C4,0x30C6,0x30C8,0x30CA,0x30CB,0x30CC,
        /* 0xFF88 */ 0x30CD,0x30CE,0x30CF,0x30D2,0x30D5,0x30D8,0x30DB,0x30DE,
        /* 0xFF90 */ 0x30DF,0x30E0,0x30E1,0x30E2,0x30E4,0x30E6,0x30E8,0x30E9,
        /* 0xFF98 */ 0x30EA,0x30EB,0x30EC,0x30ED,0x30EF,0x30F3,0x309B,0x309C
    ];

    const HANKAKU_BASE1 = 0xFF60;
    const HANKAKU_BASE2 = 0xFF80;
    const HANKAKU_MASK  = 0xFFE0;

    const MOD_NIGORI      = 0xFF9E;
    const NIGORI_MIN1     = 0xFF76;
    const NIGORI_MAX1     = 0xFF84;
    const NIGORI_MIN2     = 0xFF8A;
    const NIGORI_MAX2     = 0xFF8E;
    const NIGORI_MODIFIER = 1;

    const MOD_MARU      = 0xFF9F;
    const MARU_MIN      = 0xFF8A;
    const MARU_MAX      = 0xFF8E;
    const MARU_MODIFIER = 2;

    var i, src, srcMod, dest;
    var rv = "";

    for (i = 0; i < msg.length; i++)
    {
        // Get both this character and the next one, which could be a modifier.
        src = msg.charCodeAt(i);
        if (i < msg.length - 1)
            srcMod = msg.charCodeAt(i + 1);

        // Is the source characher hankaku?
        if ((HANKAKU_BASE1 == (src & HANKAKU_MASK)) ||
            (HANKAKU_BASE2 == (src & HANKAKU_MASK)))
        {
            // Do the basic character mapping first.
            dest = basicMapping[src - HANKAKU_BASE1];

            // If the source character is in the nigori or maru ranges and
            // the following character is the associated modifier, we apply
            // the modification and skip over the modifier.
            if (i < msg.length - 1)
            {
                if ((MOD_NIGORI == srcMod) &&
                    (((src >= NIGORI_MIN1) && (src <= NIGORI_MAX1)) ||
                     ((src >= NIGORI_MIN2) && (src <= NIGORI_MAX2))))
                {
                    dest += NIGORI_MODIFIER;
                    i++;
                }
                else if ((MOD_MARU == srcMod) &&
                         (src >= MARU_MIN) && (src <= MARU_MAX))
                {
                    dest += MARU_MODIFIER;
                    i++;
                }
            }

            rv += String.fromCharCode(dest);
        }
        else
        {
            rv += msg[i];
        }
    }

    return rv;
}

MessageManager.prototype.checkCharset =
function mm_checkset(charset)
{
    try
    {
        this.ucConverter.charset = charset;
    }
    catch (ex)
    {
        return false;
    }
    
    return true;
}

MessageManager.prototype.toUnicode =
function mm_tounicode(msg, charset)
{
    if (!charset)
        return msg;
    
    try
    {
        this.ucConverter.charset = charset;
        msg = this.ucConverter.ConvertToUnicode(msg);
    }
    catch (ex)
    {
        //dd ("caught exception " + ex + " converting " + msg + " to charset " +
        //    charset);
    }

    return msg;
}

MessageManager.prototype.fromUnicode =
function mm_fromunicode(msg, charset)
{
    if (!charset)
        return msg;

    if (this.enableHankakuToZenkaku && (charset.toLowerCase() == "iso-2022-jp"))
        msg = this.convertHankakuToZenkaku(msg);

    try
    {
        // This can actually fail in bizare cases. Cope.
        if (charset != this.ucConverter.charset)
            this.ucConverter.charset = charset;

        if ("Finish" in this.ucConverter)
        {
            msg = this.ucConverter.ConvertFromUnicode(msg) +
                this.ucConverter.Finish();
        }
        else
        {
            msg = this.ucConverter.ConvertFromUnicode(msg + " ");
            msg = msg.substr(0, msg.length - 1);
        }
    }
    catch (ex)
    {
        //dd ("caught exception " + ex + " converting " + msg + " to charset " +
        //    charset);
    }
    
    return msg;
}

MessageManager.prototype.getMsg = 
function mm_getmsg (msgName, params, deflt)
{
    try
    {    
        var bundle;
        var ary = msgName.match (/(\d+):(.+)/);
        if (ary)
        {
            return (this.getMsgFrom(this.bundleList[ary[1]], ary[2], params,
                                    deflt));
        }
        
        return this.getMsgFrom(this.bundleList[0], msgName, params, deflt);
    }
    catch (ex)
    {
        ASSERT (0, "Caught exception getting message: " + msgName + "/" +
                params);
        return deflt ? deflt : msgName;
    }
}

MessageManager.prototype.getMsgFrom =
function mm_getfrom (bundle, msgName, params, deflt)
{
    var me = this;
    function replaceEntities(matched, entity)
    {
        if (entity in me.entities)
            return me.entities[entity];

        return matched;
    };

    try 
    {
        var rv;
        
        if (params && isinstance(params, Array))
            rv = bundle.formatStringFromName (msgName, params, params.length);
        else if (params || params == 0)
            rv = bundle.formatStringFromName (msgName, [params], 1);
        else
            rv = bundle.GetStringFromName (msgName);
        
        /* strip leading and trailing quote characters, see comment at the
         * top of venkman.properties.
         */
        rv = rv.replace(/^\"/, "");
        rv = rv.replace(/\"$/, "");
        rv = rv.replace(/\&(\w+)\;/g, replaceEntities);

        return rv;
    }
    catch (ex)
    {
        if (typeof deflt == "undefined")
        {
            ASSERT (0, "caught exception getting value for ``" + msgName +
                    "''\n" + ex + "\n");
            return msgName;
        }
        return deflt;
    }

    return null;
}
