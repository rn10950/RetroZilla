/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 4 -*-
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
 * The Original Code is JSIRC Library.
 *
 * The Initial Developer of the Original Code is
 * New Dimensions Consulting, Inc.
 * Portions created by the Initial Developer are Copyright (C) 1999
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Robert Ginda, rginda@ndcico.com, original author
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

bot.personality.guessPrefixes = ["I guess ", "maybe ", "probably ", "I think ",
                                "could be that ", "", ""];
bot.personality.guessActionPrefixes = ["guesses ", "postulates ", "figures ",
                                      "tries ","pretends ", "", ""];

function initMingus()
{
    //XXX You should add the owner(s) of the bot here. You can do so with a
    // regular expression which matches their hostmask, like so:
    // addOwner(/rginda.*!.*@.*netscape\.com$/i);

    bot.primNet = bot.networks["moznet"];

    load("DP.js");
    CIRCNetwork.prototype.INITIAL_NICK = "mingus";
    CIRCNetwork.prototype.INITIAL_NAME = "mingus";
    CIRCNetwork.prototype.INITIAL_DESC = "real men do it with prototypes";
    CIRCNetwork.prototype.INITIAL_CHANNEL = "#chatzilla";

    CIRCChannel.prototype.onJoin =
    function my_chan_join(e)
    {
        if (userIsOwner(e.user))
            e.user.setOp(true);
    };

    bot.eventPump.addHook(psn_isAddressedToMe, psn_onAddressedMsg,
                          "addressed-to-me-hook");
    bot.personality.dp = new CDPressMachine();
    /*
    bot.personality.dp.addPhrase ("I am " +
                                  CIRCNetwork.prototype.INITIAL_NICK +
                                  ", hear me roar.");
    */
    bot.personality.dp.addPhrase("\01ACTION is back.");

    /* dp hooks start */

    var f = function(e)
    {
        var catchall = (e.hooks[e.hooks.length - 1].name == "catchall");
        var answer = "";

        if (catchall)
        {
            var ary = e.statement.split(" ");
            for (var i = 0; i < 3; i++)
            {
                var randomElem = getRandomElement(ary);
                answer = bot.personality.dp.getPhraseContaining(randomElem);
                if (answer)
                    break;
            }
        }

        if (!answer)
            answer = bot.personality.dp.getPhrase();

        if (answer[answer.length - 1] == "\01")
        {
            if (answer[0] != "\01")
            {
                if (catchall)
                {
                    var prefes = bot.personality.guessActionPrefes;
                    answer = "\01ACTION " + getRandomElement(prefes) + answer;
                }
                else
                {
                    answer = "\01ACTION " + answer;
                }
            }
        }
        else
        {
            if (!answer)
                answer = "I don't know anything";

            if (catchall)
            {
                answer = getRandomElement(bot.personality.guessPrefixes) +
                         answer;
            }
        }

        if (answer[0] != "\01")
            e.replyTo.say(e.user.unicodeName + ", " + answer);
        else
            e.replyTo.say(answer);

        return false;
    };

/* first hook added is last checked */
    bot.personality.addHook(/.*/i, f, "catchall");
    bot.personality.addHook(/speak$/i, f, "speak");
    bot.personality.addHook(/talk$/i, f, "hook");
    bot.personality.addHook(/say something$/i, f, "say-something");

    f = function(e)
    {
        var subject = e.matchresult[1].match(CDPressMachine.WORD_PATTERN);
        if (subject == null)
            subject = "";
        else
            subject = subject.toString();

        var escapedSubject = escape(subject.toLowerCase());
        var answer = bot.personality.dp.getPhraseContaining(escapedSubject);

        if (!answer)
            answer = "I don't know anything about " + e.matchresult[1];

        if (answer.charCodeAt(0) != 1)
            e.replyTo.say(e.user.unicodeName + ", " + answer);
        else
            e.replyTo.say(answer);

        return false;
    };

    bot.personality.addHook(/speak about (\S+)/i, f);
    bot.personality.addHook(/talk about (\S+)/i, f);
    bot.personality.addHook(/say something about (\S+)/i, f);

    f = function(e)
    {
        var answer = bot.personality.dp.getPhraseContaining("%01ACTION");

        if (!answer)
            answer = "I can't do a thing.";

        e.replyTo.say(answer);

        return false; 
    };

    bot.personality.addHook(/do something/i, f);

    f = function(e)
    {
        var ary = bot.personality.dp.getPhraseWeights(e.matchresult[1]);
        var c = bot.personality.dp.getPhraseWeight(e.matchresult[1]);

        e.replyTo.say(e.user.unicodeName + ", that phrase weighs " +
                      c + ": " + ary);

        return false;
    };

    bot.personality.addHook(/weigh (.+)/i, f);

    f = function(e)
    {
        var word = e.matchresult[1].toLowerCase();
        var pivot = bot.personality.dp.getPivot(word);
        var result = "";

        if (pivot)
        {
            var list, w, l;

            list = pivot.previousList;

            w = list.getListWeights();
            l = list.getListLinks();

            if (w.length != l.length)
                e.replyTo.say("warning: previous list mismatched.");

            for (var i = 0; i < Math.max(w.length, l.length); i++)
                result += ("`" + l[i] + "'" + w[i] + " ");

            if (result.length > 250)
                result += "\n";

            result += ( "[" + word + "]" );

            if (result.length > 250)
                result += "\n";

            list = pivot.nextList;

            w = list.getListWeights();
            l = list.getListLinks();

            if (w.length != l.length)
                e.replyTo.say("warning: next list mismatched.");

            for (var i = 0; i < Math.max(w.length, l.length); i++)
                result += (" `" + l[i] + "'" + w[i]);
        }
        else
        {
            result = "- [" + word + "] -";
        }

        e.replyTo.say(result);

        return false;
    };

    bot.personality.addHook(/pivot (.*)/i, f);

/* dp hooks end */

    f = function(e)
    {
        print("I can hear you.");
        e.replyTo.say(e.user.unicodeName + ", yes, I am.");

        return false;
    };

    bot.personality.addHook(/are you alive(\?)?/i, f);


    f = function(e)
    {
        if (!userIsOwner(e.user))
        {
            e.replyTo.say("nope.");
            return;
        }

        chan = e.matchresult[1];

        if (chan.charAt(0) != "#")
            chan = "#" + chan;

        e.server.sendData("join " + chan + "\n");

        return false;
    };

    bot.personality.addHook(/join\s+(\S+)\.*/i, f);

    f = function(e)
    {
        if (!userIsOwner(e.user))
        {
            e.channel.say("nope.");
            return false;
        }

        chan = e.matchresult[1];

        if (chan.charAt(0) != "#")
            chan = "#" + chan;

        e.server.sendData("part " + chan + "\n");

        return false;
    };

    bot.personality.addHook(/part\s+(\S+)\.*/i, f);
    bot.personality.addHook(/leave\s+(\S+)\.*/i, f);

    f = function (e)
    {
        e.replyTo.say("mmmmmmm. Thanks " + e.user.unicodeName + ".");
        return false;
    };

    bot.personality.addHook(/botsnack/i, f);

    f = function(e)
    {
        e.replyTo.act("blushes");
        return false;
    };

    bot.personality.addHook(/you rock/i, f);

    f = function(e)
    {
        if (e.matchresult[1] == "me") 
            e.replyTo.act("hugs " + e.user.unicodeName);
        else
            e.replyTo.act("hugs " + e.matchresult[1]);
        return false;
    };

    bot.personality.addHook(/hug (.*)/i, f);

    f = function(e)
    {
        if (e.matchresult[1] == "me") 
            e.replyTo.say(e.user.unicodeName + ", :*");
        else
            e.replyTo.say(e.matchresult[1] + ", :*"); 
        return false;
    };

    bot.personality.addHook(/kiss (\w+)/, f);

    f = function (e)
    {
        e.replyTo.say(e.user.unicodeName + ", I'll try :(");
        return false;
    };

    bot.personality.addHook
        (/(shut up)|(shaddup)|(be quiet)|(keep quiet)|(sssh)|(stfu)/i, f);

    f = function(e)
    {
        if (!userIsOwner(e.user))
        {
            e.replyTo.say("No.");
        }
        else
        {
            for (var n in bot.networks)
                bot.networks[n].quit("Goodnight.");
        }
        return false;
    };

    bot.personality.addHook(/(go to bed)|(go to sleep)|(sleep)/i, f);

    f = function(e)
    {
        e.replyTo.say(":)");
        return false;
    };

    bot.personality.addHook
        (/(smile)|(rotfl)|(lmao)|(rotflmao)|(look happy)|(you(.)?re smart)/i, f);
/*    (/(smile)|(rotfl)|(lmao)|(rotflmao)|(you(.)?re funny)|(look happy)|(you(.)?re smart)/i, f); */

    f = function(e)
    {
        e.replyTo.say(":(");
        return false;
    };

    bot.personality.addHook(/(frown)|(don(.)?t like you)|(look sad)/i, f);

    f = function(e)
    {
        e.replyTo.say(">:|");
        return false;
    };

    bot.personality.addHook(/(look mad)|(beat you up)/i, f);

    f = function(e)
    {
        e.replyTo.say(":/");
        return false;
    };

    bot.personality.addHook(/(look confused)|(i like windows)/i, f);
}

