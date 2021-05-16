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
 * The Original Code is ChatZilla.
 *
 * The Initial Developer of the Original Code is
 * the Mozilla Foundation <http://www.mozilla.org/>.
 * Portions created by the Initial Developer are Copyright (C) 2008
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Gijs Kruitbosch <gijskruitbosch@gmail.com> (Initial author)
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


/**
 * Serializer for lists of data that can be printed line-by-line.
 * If you pass an autoLimit, it will automatically call limit() once the number
 * of appended items exceeds the limit (so the number of items will never
 * exceed limit*2).
 */

function TextLogger(path, autoLimit)
{
    // Check if we can open the path. This will throw if it doesn't work
    var f = fopen(path, ">>");
    f.close();
    this.path = path;

    this.appended = 0;
    if (typeof autoLimit == "number")
        this.autoLimit = autoLimit;
    else
        this.autoLimit = -1;

    // Limit the amount of data in the file when constructing, when asked to.
    if (this.autoLimit != -1)
        this.limit();
}

/**
 * Append data (an array or single item) to the file
 */
TextLogger.prototype.append =
function tl_append(data)
{
    if (!isinstance(data, Array))
        data = [data];

    // If we go over the limit, don't write everything twice:
    if ((this.autoLimit != -1) &&
        (data.length + this.appended > this.autoLimit))
    {
        // Collect complete set of data instead:
        var dataInFile = this.read();
        var newData = dataInFile.concat(data);
        // Get the last |autoLimit| items: yay JS negative indexing!
        newData = newData.slice(-this.autoLimit);
        this.limit(newData);
        return true;
    }

    var file = fopen(this.path, ">>");
    for (var i = 0; i < data.length; i++)
        file.write(ecmaEscape(data[i]) + "\n");
    file.close();
    this.appended += data.length;

    return true;
}

/**
 * Limit the data already in the file to the data provided, or the count given.
 */
TextLogger.prototype.limit =
function tl_limit(dataOrCount)
{
    // Find data and count:
    var data = null, count = -1;
    if (isinstance(dataOrCount, Array))
    {
        data = dataOrCount;
        count = data.length;
    }
    else if (typeof dataOrCount == "number")
    {
        count = dataOrCount;
        data = this.read();
    }
    else if (this.autoLimit != -1)
    {
        count = this.autoLimit;
        data = this.read();
    }
    else
    {
        throw "Can't limit the length of the file without a limit..."
    }

    // Write the right data out. Note that we use the back of the array, not
    // the front (start from data.length - count), without dropping below 0:
    var start = Math.max(data.length - count, 0);
    var file = fopen(this.path, ">");
    for (var i = start; i < data.length; i++)
        file.write(ecmaEscape(data[i]) + "\n");
    file.close();
    this.appended = 0;

    return true;
}

/**
 * Reads out the data currently in the file, and returns an array.
 */
TextLogger.prototype.read =
function tl_read()
{
    var rv = new Array(), parsedLines = new Array(), buffer = "";
    var file = fopen(this.path, "<");
    while (true)
    {
        var newData = file.read();
        if (newData)
            buffer += newData;
        else if (buffer.length == 0)
            break;

        // Got more data in the buffer, so split into lines. Unless we're
        // done, the last one might not be complete yet, so save that one.
        // We split rather strictly on line ends, because empty lines should
        // be preserved.
        var lines = buffer.split(/\r?\n/);
        if (!newData)
            buffer = "";
        else
            buffer = lines.pop();

        rv = rv.concat(lines);
    }
    // Unescape here...
    for (var i = 0; i < rv.length; i++)
        rv[i] = ecmaUnescape(rv[i]);
    return rv;
}
