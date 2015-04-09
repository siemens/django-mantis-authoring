#!/usr/local/bin/python
# -*- coding: latin-1 -*-




######
###### Taken from and modified from
###### http://www.ianlewis.org/en/parsing-email-attachments-python
######

import json
from StringIO import StringIO
from email.Header import decode_header
from email.utils import parseaddr
import dateutil.parser, dateutil.tz

def eml_parse_attachment(message_part):
    content_disposition = message_part.get("Content-Disposition", None)
    if content_disposition:
        dispositions = content_disposition.strip().split(";")
        if bool(content_disposition and dispositions[0].lower() == "attachment"):

            file_data = message_part.get_payload(decode=True)
            attachment = StringIO(file_data)
            attachment.content_type = message_part.get_content_type()
            attachment.size = len(file_data)
            attachment.name = ''
            attachment.create_date = None
            attachment.mod_date = None
            attachment.read_date = None
            for param in dispositions[1:]:
                name,value = param.split("=")
                name = name.lower().strip()
                value = value.strip().strip('"')
                if name == "filename":
                    attachment.name = value
                elif name == "create-date":
                    attachment.create_date = value  #TODO: datetime
                elif name == "modification-date":
                    attachment.mod_date = value #TODO: datetime
                elif name == "read-date":
                    attachment.read_date = value #TODO: datetime
            return attachment

    return None

def parseEml(content):
    msgobj = email.message_from_string(content)
    if msgobj['Subject'] is not None:
        decodefrag = decode_header(msgobj['Subject'])
        subj_fragments = []
        for s , enc in decodefrag:
            if enc:
                s = unicode(s , enc).encode('utf8','replace')
            subj_fragments.append(s)
        subject = ''.join(subj_fragments)
    else:
        subject = None

    attachments = []
    body = None
    html = None
    for part in msgobj.walk():
        attachment = eml_parse_attachment(part)
        if attachment:
            attachments.append(attachment)
        elif part.get_content_type() == "text/plain":
            if body is None:
                body = ""
            body += unicode(
                part.get_payload(decode=True),
                part.get_content_charset(),
                'replace'
            ).encode('utf8','replace')
        elif part.get_content_type() == "text/html":
            if html is None:
                html = ""
            html += unicode(
                part.get_payload(decode=True),
                part.get_content_charset(),
                'replace'
            ).encode('utf8','replace')

    try:
        dt = dateutil.parser.parse(msgobj.get('Date', None))
        send_date = dt.astimezone(dateutil.tz.gettz('UTC')).strftime("%Y-%m-%d %H:%M:%S")
    except:
        send_date = ''

    rl = []
    for rline in msgobj.get_all('Received'):
        rl.append( ' '.join([l.strip().replace("\t", ' ').decode('utf8', 'replace') for l in rline.split("\n")]) )

    return {
        'subject' : subject,
        'body' : body,
        'html' : html,
        'from' : msgobj.get('From', ''), #parseaddr(msgobj.get('From'))[1],
        'to' : msgobj.get('To', ''), ##parseaddr(msgobj.get('To'))[1],
        'in_reply_to': msgobj.get('In-Reply-To', ''),
        'reply_to': msgobj.get('Reply-To', ''),
        'received_lines' : json.dumps(rl),
        'x_mailer': msgobj.get('X-Mailer', ''),
        'send_date': send_date,
        'attachments': attachments,
    }










"""
ExtractMsg:
    Extracts emails and attachments saved in Microsoft Outlook's .msg files

https://github.com/mattgwwalker/msg-extractor
"""

__author__  = "Matthew Walker"
__date__    = "2013-11-19"
__version__ = '0.2'

#--- LICENSE ------------------------------------------------------------------
#
#    Copyright 2013 Matthew Walker
#
#    This program is free software: you can redistribute it and/or modify
#    it under the terms of the GNU General Public License as published by
#    the Free Software Foundation, either version 3 of the License, or
#    (at your option) any later version.
#
#    This program is distributed in the hope that it will be useful,
#    but WITHOUT ANY WARRANTY; without even the implied warranty of
#    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
#    GNU General Public License for more details.
#
#    You should have received a copy of the GNU General Public License
#    along with this program.  If not, see <http://www.gnu.org/licenses/>.

import OleFileIO_PL as OleFile  # Used version 0.25 http://www.decalage.info/python/olefileio
from email.parser import Parser as EmailParser
import email.utils
import os.path
import glob
import traceback


# This property information was sourced from 
# http://www.fileformat.info/format/outlookmsg/index.htm 
# on 2013-07-22.
properties = {
    '001A': 'Message class',
    '0037': 'Subject',
    '003D': 'Subject prefix',
    '0040': 'Received by name',
    '0042': 'Sent repr name',
    '0044': 'Rcvd repr name',
    '004D': 'Org author name',
    '0050': 'Reply rcipnt names',
    '005A': 'Org sender name',
    '0064': 'Sent repr adrtype',
    '0065': 'Sent repr email',
    '0070': 'Topic',
    '0075': 'Rcvd by adrtype',
    '0076': 'Rcvd by email',
    '0077': 'Repr adrtype',
    '0078': 'Repr email',
    '007d': 'Message header',
    '0C1A': 'Sender name',
    '0C1E': 'Sender adr type',
    '0C1F': 'Sender email',
    '0E02': 'Display BCC',
    '0E03': 'Display CC',
    '0E04': 'Display To',
    '0E1D': 'Subject (normalized)',
    '0E28': 'Recvd account1 (uncertain)',
    '0E29': 'Recvd account2 (uncertain)',
    '1000': 'Message body',
    '1008': 'RTF sync body tag',
    '1035': 'Message ID (uncertain)',
    '1046': 'Sender email (uncertain)',
    '3001': 'Display name',
    '3002': 'Address type',
    '3003': 'Email address',
    '39FE': '7-bit email (uncertain)',
    '39FF': '7-bit display name',

    # Attachments (37xx)
    '3701': 'Attachment data',
    '3703': 'Attachment extension',
    '3704': 'Attachment short filename',
    '3707': 'Attachment long filename',
    '370E': 'Attachment mime tag',
    '3712': 'Attachment ID (uncertain)',

    # Address book (3Axx):
    '3A00': 'Account',
    '3A02': 'Callback phone no',
    '3A05': 'Generation',
    '3A06': 'Given name',
    '3A08': 'Business phone',
    '3A09': 'Home phone',
    '3A0A': 'Initials',
    '3A0B': 'Keyword',
    '3A0C': 'Language',
    '3A0D': 'Location',
    '3A11': 'Surname',
    '3A15': 'Postal address',
    '3A16': 'Company name',
    '3A17': 'Title',
    '3A18': 'Department',
    '3A19': 'Office location',
    '3A1A': 'Primary phone',
    '3A1B': 'Business phone 2',
    '3A1C': 'Mobile phone',
    '3A1D': 'Radio phone no',
    '3A1E': 'Car phone no',
    '3A1F': 'Other phone',
    '3A20': 'Transmit dispname',
    '3A21': 'Pager',
    '3A22': 'User certificate',
    '3A23': 'Primary Fax',
    '3A24': 'Business Fax',
    '3A25': 'Home Fax',
    '3A26': 'Country',
    '3A27': 'Locality',
    '3A28': 'State/Province',
    '3A29': 'Street address',
    '3A2A': 'Postal Code',
    '3A2B': 'Post Office Box',
    '3A2C': 'Telex',
    '3A2D': 'ISDN',
    '3A2E': 'Assistant phone',
    '3A2F': 'Home phone 2',
    '3A30': 'Assistant',
    '3A44': 'Middle name',
    '3A45': 'Dispname prefix',
    '3A46': 'Profession',
    '3A48': 'Spouse name',
    '3A4B': 'TTYTTD radio phone',
    '3A4C': 'FTP site',
    '3A4E': 'Manager name',
    '3A4F': 'Nickname',
    '3A51': 'Business homepage',
    '3A57': 'Company main phone',
    '3A58': 'Childrens names',
    '3A59': 'Home City',
    '3A5A': 'Home Country',
    '3A5B': 'Home Postal Code',
    '3A5C': 'Home State/Provnce',
    '3A5D': 'Home Street',
    '3A5F': 'Other adr City',
    '3A60': 'Other adr Country',
    '3A61': 'Other adr PostCode',
    '3A62': 'Other adr Province',
    '3A63': 'Other adr Street',
    '3A64': 'Other adr PO box',

    '3FF7': 'Server (uncertain)',
    '3FF8': 'Creator1 (uncertain)',
    '3FFA': 'Creator2 (uncertain)',
    '3FFC': 'To email (uncertain)',
    '403D': 'To adrtype (uncertain)',
    '403E': 'To email (uncertain)',
    '5FF6': 'To (uncertain)'}


def windowsUnicode(string):
    if string is None:
        return None
    return unicode(string, 'utf_16_le')


class Attachment:
    def __init__(self, msg, dir):
        # Get long filename
        self.longFilename = msg._getStringStream( [dir, '__substg1.0_3707'] )

        # Get short filename
        self.shortFilename = msg._getStringStream( [dir, '__substg1.0_3704'] )

        # Get attachment data
        self.data = msg._getStream( [dir, '__substg1.0_37010102'] )

    def save(self):
        # Use long filename as first preference
        filename = self.longFilename
        # Otherwise use the short filename
        if filename is None:
            filename = self.shortFilename
        # Otherwise just make something up!
        if filename is None:
            import random
            import string
            filename = 'UnknownFilename ' + ''.join(random.choice(string.ascii_uppercase + string.digits) for x in range(5))+".bin"
        f = open(filename, 'wb')
        f.write(self.data)
        f.close()

class Message(OleFile.OleFileIO):
    def __init__(self, filename):
        OleFile.OleFileIO.__init__(self, filename)


    def _getStream(self, filename):
        if self.exists(filename):
            stream = self.openstream(filename)
            return stream.read()
        else:
            return None

    def _getStringStream(self, filename, prefer='unicode'):
        """Gets a string representation of the requested filename.
        Checks for both ASCII and Unicode representations and returns
        a value if possible.  If there are both ASCII and Unicode
        versions, then the parameter /prefer/ specifies which will be
        returned.

        """

        if isinstance(filename, list):
            # Join with slashes to make it easier to append the type
            filename = "/".join(filename)

        asciiVersion = self._getStream(filename+'001E')
        unicodeVersion = windowsUnicode(self._getStream(filename+'001F'))
        if asciiVersion is None:
            return unicodeVersion
        elif unicodeVersion is None:
            return asciiVersion
        else:
            if prefer == 'unicode':
                return unicodeVersion
            else:
                return asciiVersion

    @property
    def subject(self):
        return self._getStringStream('__substg1.0_0037')

    @property
    def header(self):
        try:
            return self._header
        except:
            headerText = self._getStringStream('__substg1.0_007D')
            if headerText is not None:
                self._header = EmailParser().parsestr(headerText)
            else:
                self._header = None
            return self._header
            
    @property
    def date(self):
        # Get the message's header and extract the date
        if self.header is None:
            return None
        else:
            return self.header['date']

    @property
    def parsedDate(self):
        return email.utils.parsedate(self.date)

    @property
    def sender(self):
        try:
            return self._sender
        except:
            # Check header first
            if self.header is not None:
                headerResult = self.header["from"]
                if headerResult is not None:
                    self._sender = headerResult 
                    return headerResult

            # Extract from other fields
            text = self._getStringStream('__substg1.0_0C1A')
            email = self._getStringStream('__substg1.0_0C1F')
            result = None
            if text is None:
                result = email
            else:
                result = text
                if email is not None:
                    result = result + " <" + email + ">"

            self._sender = result
            return result

    @property
    def to(self):
        try:
            return self._to
        except:
            # Check header first
            if self.header is not None:
                headerResult = self.header["to"]
                if headerResult is not None:
                    self._to = headerResult 
                    return headerResult

            # Extract from other fields
            # TODO: This should really extract data from the recip folders, 
            # but how do you know which is to/cc/bcc?
            display = self._getStringStream('__substg1.0_0E04')
            self._to = display
            return display


    @property
    def cc(self):
        try:
            return self._cc
        except:
            # Check header first
            if self.header is not None:
                headerResult = self.header["cc"]
                if headerResult is not None:
                    self._cc = headerResult 
                    return headerResult

            # Extract from other fields
            # TODO: This should really extract data from the recip folders, 
            # but how do you know which is to/cc/bcc?
            display = self._getStringStream('__substg1.0_0E03')
            self._cc = display
            return display



    @property
    def body(self):
        # Get the message body
        return self._getStringStream('__substg1.0_1000')

    @property
    def attachments(self):
        try:
            return self._attachments
        except:
            # Get the attachments
            attachmentDirs = []

            for dir in self.listdir():
                if dir[0].startswith('__attach') and dir[0] not in attachmentDirs:
                    attachmentDirs.append(dir[0])

            self._attachments = []
        
            for attachmentDir in attachmentDirs:
                self._attachments.append( Attachment( self, attachmentDir ) )

            return self._attachments


    def save(self, raw=False):
        # Create a directory based on the date and subject of the message
        d = self.parsedDate
        if d is not None:
            dirName = '{0:02d}-{1:02d}-{2:02d}_{3:02d}{4:02d}'.format(*d)
        else:
            dirName = "UnknownDate"
            
        if self.subject is None:
            subject = "[No subject]"
        else:
            subject = "".join(i for i in self.subject if i not in r'\/:*?"<>|')

        dirName = dirName + " " + subject


        def addNumToDir(dirName):
            # Attempt to create the directory with a '(n)' appended
            dirCreated = False
            for i in range(2,100):
                try:
                    newDirName = dirName+" ("+str(i)+")"
                    os.makedirs(newDirName)
                    return dirName
                except:
                    pass
            return None

        try:
            os.makedirs(dirName)
        except:
            newDirName = addNumToDir(dirName)
            if newDirName is not None:
                dirName = newDirName
            else:
                raise Exception("Failed to create directory '"+dirName+"'.  Does it already exist?")

        oldDir = os.getcwd()
        try:
            os.chdir(dirName)

            # Save the message body
            f = open("message.txt", "w")
            # From, to , cc, subject, date
            def xstr(s):
                return '' if s is None else str(s)

            f.write("From: "+xstr(self.sender)+"\n")
            f.write("To: "+xstr(self.to)+"\n")
            f.write("CC: "+xstr(self.cc)+"\n")
            f.write("Subject: "+xstr(self.subject)+"\n")
            f.write("Date: "+xstr(self.date)+"\n")
            f.write("-----------------\n\n")

            f.write(self.body)
            f.close()

            # Save the attachments
            for attachment in self.attachments:
                attachment.save()
        except:
            self.saveRaw()
            raise

        finally:
            # Return to previous directory
            os.chdir(oldDir)


    def saveRaw(self):
        # Create a 'raw' folder
        oldDir = os.getcwd()
        try:
            rawDir = "raw"
            os.makedirs(rawDir)
            os.chdir(rawDir)
            sysRawDir = os.getcwd()

            # Loop through all the directories
            for dir in self.listdir():
                sysdir = "/".join(dir)
                code = dir[-1][-8:-4]
                global properties
                if code in properties:
                    sysdir = sysdir + " - " + properties[code]
                os.makedirs(sysdir)
                os.chdir(sysdir)
                
                # Generate appropriate filename
                if dir[-1].endswith("001E"):
                    filename = "contents.txt"
                else:
                    filename = "contents"

                # Save contents of directory
                f = open(filename, 'wb')
                f.write( self._getStream(dir) )
                f.close()

                # Return to base directory
                os.chdir(sysRawDir)

                

        finally:
            os.chdir(oldDir)



    def dump(self):
        # Prints out a summary of the message
        print 'Message'
        print 'Subject:', self.subject
        print 'Date:', self.date
        print 'Body:'
        print self.body
        
    def debug(self):
        for dir in self.listdir():
            if dir[-1].endswith('001E'): # FIXME: Check for unicode 001F too
                print "Directory: "+str(dir)
                print "Contents: "+self._getStream(dir)


if __name__ == "__main__":
    import sys

    if len(sys.argv) <= 1:
        print __doc__
        print """
Launched from command line, this script parses Microsoft Outlook Message files and save their contents to the current directory.  On error the script will write out a 'raw' directory will all the details from the file, but in a less-than-desirable format.  To force this mode, the flag '--raw' can be specified.

Usage:  <file> [file2 ...]
   or:  --raw <file>

"""
        sys.exit()

    writeRaw = False

    for rawFilename in sys.argv[1:]:
        if rawFilename == '--raw':
            writeRaw = True
        for filename in glob.glob(rawFilename):
            msg = Message(filename)
            try:
                if writeRaw:
                    msg.saveRaw()
                else:
                    msg.save()
            except:
                #msg.debug()
                print "Error with file '"+filename+"': "+traceback.format_exc()










########
######## The following below is extracted (and slightly modified) from the
######## receivedDB.py script found at http://www.cs.cmu.edu/~benhdj/Code/
########



header_db = """

# Received: header database

# 20040114: Benjamin Han <benhdj@cs.cmu.edu> Created; version 0.1.

# Copyright (C) 2003-2004  Benjamin Han <benhdj@cs.cmu.edu>
#
# This program is free software; you can redistribute it and/or
# modify it under the terms of the GNU General Public License
# as published by the Free Software Foundation; either version 2
# of the License, or (at your option) any later version.

# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU General Public License for more details.

# You should have received a copy of the GNU General Public License
# along with this program; if not, write to the Free Software
# Foundation, Inc., 59 Temple Place - Suite 330, Boston, MA  02111-1307, USA.

# * Every group starts with an identification pattern, following with pattern/assignment lines
# * A group starts with character '*' and a group identification pattern; an '*' following nothing means a generic group;
#   a pattern preceded with '-' means inverse match; a group with only identification pattern means ignored.
# * All patterns are surrounded by "; you don't need to escape " inside patterns
# * Assignments are keywords in CSV format; the keywords are: HELO, IDENT, RDNS, IP, BY; ordering matters:
#   the first keyword is for the first group (register), and so on; missing ones get None; a single None means None.
# * All patterns are used in regexp search() calls
# * Blank lines are ignored, so are the lines started with #; space characters are stripped unless they're inside patterns
# * Some predefined patterns: (?#IP) matches "(?:::\w\w\w\w:)?\d+\.\d+\.\d+\.\d+"; (?#LOCAL) matches localhost strings.
# * Ordering between groups and between patterns *matters*.
# * NO MIXING OF COMMENTS AND CODE AT SAME LINES!

# --- Ignored ---
* -"^from"
  # (qmail 27981 invoked by uid 225); 14 Mar 2003 07:24:34 -0000
  # (qmail 84907 invoked from network); 13 Feb 2003 20:59:28 -0000
  # (ofmipd 208.31.42.38); 17 Mar 2003 04:09:01 -0000

# --- Sendmail ---
* ".+ by \S+ \(\w+\.\w+\.\w+/(?:\w+\.\w+\.\w+(?:/\S+)?)?\) "

  # from localhost (mailnull@localhost) by x.org (8.12.6/8.9.3) with SMTP id h2R2iivG093740; Wed, 26 Mar 2003 20:44:44 -0600 (CST) (envelope-from x@x.org)
  # from localhost.localdomain (UNIX15.andrew.cmu.edu [128.2.13.145]) by mx6.andrew.cmu.edu (8.12.10/8.12.10) with ESMTP id i05HQtDa011626; Mon, 5 Jan 2004 12:26:55 -0500  
  "^from (?#LOCAL) \(.+\) "  
  None

  # from aaaiservices.org (localhost.localdomain [127.0.0.1]) by aaaiservices.org (8.12.8/8.12.8) with ESMTP id hBFMZQmG020746; Mon, 15 Dec 2003 14:35:27 -0800
  "^from \S+ \((?#LOCAL) \[(?#LOCAL)\]\) "
  None

  # from mail1.insuranceiq.com (host66.insuranceiq.com [65.217.159.66] (may be forged)) by dogma.slashnull.org (8.11.6/8.11.6) with ESMTP id h2F0c2x31856 for <jm@jmason.org>; Sat, 15 Mar 2003 00:38:03 GMT
  # from BAY0-HMR08.adinternal.hotmail.com (bay0-hmr08.bay0.hotmail.com [65.54.241.207]) by dogma.slashnull.org (8.11.6/8.11.6) with ESMTP id h2DBpvs24047 for <webmaster@efi.ie>; Thu, 13 Mar 2003 11:51:57 GMT
  # from ran-out.mx.develooper.com (IDENT:qmailr@one.develooper.com [64.81.84.115]) by dogma.slashnull.org (8.11.6/8.11.6) with SMTP id h381Vvf19860 for <jm-cpan@jmason.org>; Tue, 8 Apr 2003 02:31:57 +0100
  # from rev.net (natpool62.rev.net [63.148.93.62] (may be forged)) (authenticated) by mail.rev.net (8.11.4/8.11.4) with ESMTP id h0KKa7d32306 for <spamassassin-talk@lists.sourceforge.net>
  # from mail.sxptt.zj.cn ([218.0.185.24]) by dogma.slashnull.org (8.11.6/8.11.6) with ESMTP id h2FH0Zx11330 for <webmaster@efi.ie>; Sat, 15 Mar 2003 17:00:41 GMT
  # from umr-mail7.umr.edu (umr-mail7.umr.edu [131.151.1.64]) via ESMTP by mrelay1.cc.umr.edu (8.12.1/) id h06GHYLZ022481; Mon, 6 Jan 2003 10:17:34 -0600
  # from gandalf ([4.37.75.131]) (authenticated bits=0) by herald.cc.purdue.edu (8.12.5/8.12.5/herald) with ESMTP id g9JLefrm028228 for <spamassassin-talk@lists.sourceforge.net>; Sat, 19 Oct 2002 16:40:41 -0500 (EST)
  # from roissy (p573.as1.exs.dublin.eircom.net [159.134.226.61]) (authenticated bits=0) by slate.dublin.wbtsystems.com (8.12.6/8.12.6) with ESMTP id g9MFWcvb068860 for <jm@jmason.org>; Tue, 22 Oct 2002 16:32:39 +0100 (IST)
  # from gnome.at.coli.uni-sb.de (gnome.coli.uni-sb.de [134.96.68.17]) by top.coli.uni-sb.de (8.9.3p3/8.9.0) with ESMTP id MAA28497 for <bhan@andrew.cmu.edu>; Tue, 13 Jan 2004 12:47:03 +0100 (MET)
  "^from (\S+) \((?:(?:(?:IDENT:)?(\S+)\@)?(\S+) )?\[((?#IP))\].*\) (?:via \w+ )?by (\S+) \("
  HELO,IDENT,RDNS,IP,BY

# --- Exim ---
* "\(Exim "

  # from [61.174.163.26] (helo=host) by sc8-sf-list1.sourceforge.net with smtp (Exim 3.31-VA-mm2 #1 (Debian)) id 18t2z0-0001NX-00 for <razor-users@lists.sourceforge.net>; Wed, 12 Mar 2003 01:57:10 -0800
  # from [218.19.142.229] (helo=hotmail.com ident=yiuhyotp) by yzordderrex with smtp (Exim 3.35 #1 (Debian)) id 194BE5-0005Zh-00; Sat, 12 Apr 2003 03:58:53 +0100
  "^from \[((?#IP))\] \((?:helo=(\S+))?.*?(?:ident=(\S+))?\) by (\S+) "
  IP,HELO,IDENT,BY

  # from sc8-sf-list1-b.sourceforge.net ([10.3.1.13] helo=sc8-sf-list1.sourceforge.net) by sc8-sf-list2.sourceforge.net with esmtp (Exim 3.31-VA-mm2 #1 (Debian)) id 18t301-0007Bh-00; Wed, 12 Mar 2003 01:58:13 -0800
  # from dsl092-072-213.bos1.dsl.speakeasy.net ([66.92.72.213] helo=blazing.arsecandle.org) by sc8-sf-list1.sourceforge.net with esmtp (Cipher TLSv1:DES-CBC3-SHA:168) (Exim 3.31-VA-mm2 #1 (Debian)) id 18lyuU-0007TI-00 for <SpamAssassin-talk@lists.sourceforge.net>; Thu, 20 Feb 2003 14:11:18 -0800
  # from eclectic.kluge.net ([66.92.69.221] ident=[W9VcNxE2vKxgWHD05PJbLzIHSxcmZQ/O]) by sc8-sf-list1.sourceforge.net with esmtp (Cipher TLSv1:DES-CBC3-SHA:168) (Exim 3.31-VA-mm2 #1 (Debian)) id 18m0hT-00031I-00 for <spamassassin-talk@lists.sourceforge.net>; Thu, 20 Feb 2003 16:06:00 -0800
  # from mail.ssccbelen.edu.pe ([216.244.149.154]) by yzordderrex with esmtp (Exim 3.35 #1 (Debian)) id 18tqiz-000702-00 for <jm@example.com>; Fri, 14 Mar 2003 15:03:57 +0000
  "^from (\S+) \(\[((?#IP))\](?: helo=(\S+))?(?: ident=(\S+))?\) by (\S+) "
  RDNS,IP,HELO,IDENT,BY

  # from boggle.ihug.co.nz [203.109.252.209] by grunt6.ihug.co.nz with esmtp (Exim 3.35 #1 (Debian)) id 18SWRe-0006X6-00; Sun, 29 Dec 2002 18:57:06 +1300
  "^from (\S+) \[((?#IP))\] by (\S+) "
  RDNS,IP,BY

  # from andrew by trinity.supernews.net with local (Exim 4.12) id 18xeL6-000Dn1-00; Tue, 25 Mar 2003 02:39:00 +0000
  "^from \S+ by \S+ (?:with|via|for) (?#LOCAL)"
  None

# --- Postfix ---
* " \(Postfix\) with "

  # from localhost (unknown [127.0.0.1]) by cabbage.jmason.org (Postfix) with ESMTP id A96E18BD97 for <jm@localhost>; Thu, 13 Mar 2003 15:23:15 -0500 (EST)
  # from 207.8.214.3 (unknown[211.94.164.65]) by puzzle.pobox.com (Postfix) with SMTP id 9029AFB732; Sat,  8 Nov 2003 17:57:46 -0500 (EST) (Pobox.com version: reported in bug 2745)
  "^from (\S+) \((\S+) ?\[((?#IP))\]\) by (\S+) "    
  HELO,RDNS,IP,BY

# --- fetchmail ---
* " \(fetchmail-\S+\)"

  # from cabbage.jmason.org [127.0.0.1] by localhost with IMAP (fetchmail-5.9.0)
  # from po11.mit.edu [18.7.21.73] by stark.dyndns.tv with POP3 (fetchmail-5.9.7) for stark@localhost (single-drop); Tue, 18 Feb 2003 10:43:09 -0500 (EST) by po11.mit.edu (Cyrus v2.1.5) with LMTP; Tue, 18 Feb 2003 09:49:46 -0500
  "^from (\S+) \[((?#IP))\] by (\S+) with "
  RDNS,IP,BY  

# --- Cyrus ---
* " by \S+ \(Cyrus"

  # from mx5.andrew.cmu.edu (MX5.andrew.cmu.edu [::ffff:128.2.10.115]) by mail6.andrew.cmu.edu (Cyrus v2.2.2-BETA-082) with LMTPA; Tue, 13 Jan 2004 06:47:18 -0500
  "^from (\S+) \((\S+) \[((?#IP))\]\) by (\S+)"
  HELO,RDNS,IP,BY

  # from mx5.andrew.cmu.edu ([unix socket]) by mx5.andrew.cmu.edu (Cyrus v2.2.2-BETA-082) with LMTP; Tue, 13 Jan 2004 06:47:21 -0500
  "^from \S+ \(\[unix socket\]\)"
  None

# --- Yahoo ---
* "by \S+\.yahoo\.com "

  # from [193.220.176.134] by web40310.mail.yahoo.com via HTTP; Wed, 12 Feb 2003 14:22:21 PST
  "^from \[((?#IP))\] by (\S+) via HTTP\;"
  IP,BY

  # from customer254-217.iplannetworks.net (HELO AGAMENON) (baldusi@200.69.254.217 with plain) by smtp.mail.vip.sc5.yahoo.com with SMTP; 11 Mar 2003 21:03:28 -0000
  "^from (\S+) \(HELO (\S+)\) \((?:(\S+)\@)?((?#IP)).*?\) by (\S+) with "
  RDNS,HELO,IDENT,IP,BY

# --- Hotmail ---
* "by \S+\.hotmail\.msn\.com "

  # from 213.123.174.21 by lw11fd.law11.hotmail.msn.com with HTTP; Wed, 24 Jul 2002 16:36:44 GMT
  "^from ((?#IP)).*?by (\S+\.hotmail\.msn\.com) "
  IP,BY

# --- Microsoft ---
* "^from .+ by \S+ with Microsoft"

  # from inet-vrs-05.redmond.corp.microsoft.com ([157.54.6.157]) by INET-IMC-05.redmond.corp.microsoft.com with Microsoft SMTPSVC(5.0.2195.6624); Thu, 6 Mar 2003 12:02:35 -0800
  # from tthompson ([217.35.105.172] unverified) by mail.neosinteractive.com with Microsoft SMTPSVC(5.0.2195.5329); Tue, 11 Mar 2003 13:23:01 +0000
  "^from (\S+) \(\[((?#IP))\](?: unverified)?\) by (\S+) "
  HELO,IP,BY

  # from mail pickup service by mail1.insuranceiq.com with Microsoft SMTPSVC; Thu, 13 Feb 2003 19:05:39 -0500
  "^from mail pickup service by \S+ "
  None

  # from xxxx (IP) by YYYY (IP) with Microsoft SMTP Server (TLS) id 14.3.224.2; Thu, 24 Feb 2013 09:40:11 -6000
  "^from (\S+) \((?#IP)\).*?by(\S+).*?with Microsoft SMTP Server "
  RDNS,IP,BY

# --- CommuniGate ---
* " by \S+ \(CommuniGate"

  # from [192.168.1.104] (account nazgul HELO [192.168.1.104]) by somewhere.com (CommuniGate Pro SMTP 3.5.7) with ESMTP-TLS id 2088434; Fri, 07 Mar 2003 13:05:06 -0500
  "^from \[((?#IP))\] \(account \S+ HELO (\S+)\) by (\S+)"
  IP,HELO,BY

  # from [212.87.144.30] (account seiz [212.87.144.30] verified) by x.imd.net (CommuniGate Pro SMTP 4.0.3) with ESMTP-TLS id 5026665 for spamassassin-talk@lists.sourceforge.net; Wed, 15 Jan 2003 16:27:05 +0100
  "^from \[((?#IP))\] \([^\)]+\) by (\S+) "
  IP,BY

# --- Generic ---
*
  # qmail headers: they don't have unique signatures!
  # from postfix3-2.free.fr (HELO machine.domain.com) (foobar@213.228.0.169) by totor.bouissou.net with SMTP; 14 Nov 2003 08:05:50 -0000
  # from postfix3-2.free.fr (HELO machine.domain.com) (213.228.0.169) by totor.bouissou.net with SMTP; 14 Nov 2003 08:05:50 -0000
  # from postfix3-2.free.fr (foobar@213.228.0.169) by totor.bouissou.net with SMTP; 14 Nov 2003 08:05:50 -0000
  # from unknown (HELO terpsichore.farfalle.com) (jdavid@[216.254.40.70]) (envelope-sender <jdavid@farfalle.com>) by mail13.speakeasy.net (qmail-ldap-1.03) with SMTP for <jm@jmason.org>; 12 Feb 2003 18:23:19 -0000
  # from mtsbp606.email-info.net (?dXqpg3b0hiH9faI2OxLT94P/YKDD3rQ1?@64.253.199.166) by kde.informatik.uni-kl.de with SMTP; 30 Apr 2003 15:06:29
  "^from (\S+) (?:\(HELO (\S+)\) )?\((?:(\S+)\@)?\[?((?#IP))\]?\)(?: \(envelope-sender <\S+>\))? by (\S+)(?: \(.+\))* with (?:.* )?(?:SMTP|QMQP)"
  RDNS,HELO,IDENT,IP,BY

  # from ns.elcanto.co.kr (66.161.246.58 [66.161.246.58]) by mail.ssccbelen.edu.pe with SMTP (Microsoft Exchange Internet Mail Service Version 5.5.1960.3) id G69TW478; Thu, 13 Mar 2003 14:01:10 -0500  
  "^from (\S+) \((\S+) \[((?#IP))\]\) by (\S+) with \S+ \(Microsoft"  
  HELO,RDNS,IP,BY

  # from mail2.detr.gsi.gov.uk ([51.64.35.18] helo=ahvfw.dtlr.gsi.gov.uk) by mail4.gsi.gov.uk with smtp id 190K1R-0000me-00 for spamassassin-talk-admin@lists.sourceforge.net; Tue, 01 Apr 2003 12:33:46 +0100
  "^from (\S+) \(\[((?#IP))\](?: helo=(\S+))?\) by (\S+) with smtp"
  RDNS,IP,HELO,BY

  # from 12-211-5-69.client.attbi.com (<unknown.domain>[12.211.5.69]) by rwcrmhc53.attbi.com (rwcrmhc53) with SMTP id <2002112823351305300akl1ue>; Thu, 28 Nov 2002 23:35:13 +0000
  "^from (\S+) \(<unknown\S*>\[((?#IP))\]\) by (\S+) "
  HELO,IP,BY

  # from attbi.com (h000502e08144.ne.client2.attbi.com[24.128.27.103]) by rwcrmhc53.attbi.com (rwcrmhc53) with SMTP id <20030222193438053008f7tee>; Sat, 22 Feb 2003 19:34:39 +0000
  # from pobox.com (h005018086b3b.ne.client2.attbi.com[66.31.45.164]) by rwcrmhc53.attbi.com (rwcrmhc53) with SMTP id <2003031302165605300suph7e>; Thu, 13 Mar 2003 02:16:56 +0000
  "^from (\S+) \((\S+\.\S+)\[((?#IP))\]\) by (\S+) "
  HELO,RDNS,IP,BY

  # from imo-m01.mx.aol.com ([64.12.136.4]) by eagle.glenraven.com via smtpd (for [198.85.87.98]) with SMTP; Wed, 08 Oct 2003 16:25:37 -0400
  "^from (\S+) \(\[((?#IP))\]\) by (\S+) via smtpd \(for \S+\) with SMTP"
  HELO,IP,BY

  # from 192.168.5.158 ( [192.168.5.158]) as user jason@localhost by mail.reusch.net with HTTP; Mon, 8 Jul 2002 23:24:56 -0400
  "^from \S+ \( \[((?#IP))\]\).*? by (\S+) "
  IP,BY
  
  # from (64.52.135.194 [64.52.135.194]) by mail.unearthed.com with ESMTP id BQB0hUH2 Thu, 20 Feb 2003 16:13:20 -0700 (PST)
  "^from \((\S+) \[((?#IP))\]\) by (\S+) "
  HELO,IP,BY

  # from [65.167.180.251] by relent.cedata.com (MessageWall 1.1.0) with SMTP; 20 Feb 2003 23:57:15 -0000
  # from [192.168.0.71] by web01-nyc.clicvu.com (Post.Office MTA v3.5.3 release 223 ID# 0-64039U1000L100S0V35) with SMTP id com for <x@x.org>; Tue, 25 Mar 2003 11:42:04 -0500
  # from [127.0.0.1] by euphoria (ArGoSoft Mail Server Freeware, Version 1.8 (1.8.2.5)); Sat, 8 Feb 2003 09:45:32 +0200
  # from [192.168.0.13] by <server> (MailGate 3.5.172) with SMTP; Tue, 1 Apr 2003 15:04:55 +0100
  "^from \[((?#IP))\] by (\S+) "
  IP,BY

  # from acecomms [202.83.84.95] by mailscan.acenet.net.au [202.83.84.27] with SMTP (MDaemon.PRO.v5.0.6.R) for <spamassassin-talk@lists.sourceforge.net>; Fri, 21 Feb 2003 09:32:27 +1000
  "^from (\S+) \[((?#IP))\] by (\S+) \[(?:\S+)\] with \S+ \(MDaemon"
  HELO,IP,BY

  # from Agni (localhost [::ffff:127.0.0.1]) (TLS: TLSv1/SSLv3, 168bits,DES-CBC3-SHA) by agni.forevermore.net with esmtp; Mon, 28 Oct 2002 14:48:52 -0800
  "^from (\S+) \((?:(\S+) )?\[((?#IP))\]\) \(TLS.+?\) by (\S+) "
  HELO,RDNS,IP,BY

  # from snake.corp.yahoo.com(216.145.52.229) by x.x.org via smap (V1.3) id xma093673; Wed, 26 Mar 03 20:43:24 -0600
  "^from (\S+)\(((?#IP))\) by (\S+) via smap "
  RDNS,IP,BY

  # from 157.54.8.23 by inet-vrs-05.redmond.corp.microsoft.com (InterScan E-Mail VirusWall NT); Thu, 06 Mar 2003 12:02:35 -0800
  "^from ((?#IP)) by (\S+) \(InterScan"
  IP,BY
  
  # from faerber.muc.de by slarti.muc.de with BSMTP (rsmtp-qm-ot 0.4) for asrg@ietf.org; 7 Mar 2003 21:10:38 -0000
  "^from \S+ by \S+ with BSMTP"
  None

  # from spike (spike.ig.co.uk [193.32.60.32]) by mail.ig.co.uk with SMTP id h27CrCD03362 for <asrg@ietf.org>; Fri, 7 Mar 2003 12:53:12 GMT
  "^from (\S+) \(([^[]+) \[((?#IP))\]\) by (\S+) with "
  HELO,RDNS,IP,BY

  # TO-DO: what is this?
  # from raptor.research.att.com (bala@localhost) by raptor.research.att.com (SGI-8.9.3/8.8.7) with ESMTP id KAA14788  for <asrg@example.com>; Fri, 7 Mar 2003 10:37:56 -0500 (EST)
  "^from .+ by \S+ \(SGI-.+\)"
  None

  # TO-DO: what is this?
  # from mmail by argon.connect.org.uk with local (connectmail/exim) id 18tOsg-0008FX-00; Thu, 13 Mar 2003 09:20:06 +0000
  "^from \S+ by \S+ with local"
  None
  
  # from ([10.0.0.6]) by mail0.ciphertrust.com with ESMTP ; Thu, 13 Mar 2003 06:26:21 -0500 (EST)
  "^from \(\[((?#IP))\]\) by (\S+) with "
  IP,BY

  # from ironport.com (10.1.1.5) by a50.ironport.com with ESMTP; 01 Apr 2003 12:00:51 -0800
  "^from (\S+) \(((?#IP))\) by (\S+) with "
  HELO,IP,BY

  # from scv3.apple.com (scv3.apple.com) by mailgate2.apple.com (Content Technologies SMTPRS 4.2.1) with ESMTP id <T61095998e1118164e13f8@mailgate2.apple.com>; Mon, 17 Mar 2003 17:04:54 -0800
  "^from (\S+) \((\S+)\) by (\S+) \(Content Tech"
  HELO,RDNS,BY

  # from 01al10015010057.ad.bls.com ([90.152.5.141] [90.152.5.141]) by aismtp3g.bls.com with ESMTP; Mon, 10 Mar 2003 11:10:41 -0500
  "^from (\S+) \(\[((?#IP))\] \[(?#IP)\]\) by (\S+) with "
  HELO,IP,BY

  # from 206.47.0.153 by dm3cn8.bell.ca with ESMTP (Tumbleweed MMS SMTP Relay (MMS v5.0)); Mon, 24 Mar 2003 19:49:48 -0500
  "^from ((?#IP)) by (\S+) with \S+ \(Tumbleweed"
  IP,BY

  # from [10.128.128.81]:50999 (HELO dfintra.f-secure.com) by fsav4im2 ([10.128.128.74]:25) (F-Secure Anti-Virus for Internet Mail 6.0.34 Release) with SMTP; Tue, 5 Mar 2002 14:11:53 -0000
  "^from \[((?#IP))\]\S+ \(HELO (\S+)\) by (\S+) \(\S+\) \(F-Secure"
  IP,HELO,BY

  # from 62.180.7.250 (HELO daisy) by smtp.altavista.de (209.228.22.152) with SMTP; 19 Sep 2002 17:03:17 +0000
  "^from ((?#IP)) \(HELO (\S+)\) by (\S+) "
  IP,HELO,BY

  # from oemcomputer [63.232.189.195] by highstream.net (SMTPD32-7.07) id A4CE7F2A0028; Sat, 01 Feb 2003 21:39:10 -0500
  "^from (\S+) \[((?#IP))\] by (\S+) \(SMTPD"
  HELO,IP,BY

  # from nodnsquery(192.100.64.12) by herbivore.monmouth.edu via csmap (V4.1) id srcAAAyHaywy
  "^from (\S+)\(((?#IP))\) by (\S+) via csmap"
  RDNS,IP,BY

  # from jmason.org (unverified [195.218.107.131]) by ni-mail1.dna.utvinternet.net <B0014212518@ni-mail1.dna.utvinternet.net>; Tue, 11 Feb 2003 12:18:12 +0000
  "^from (\S+) \(unverified \[((?#IP))\]\) by (\S+) "
  HELO,IP,BY

  # from 165.228.131.11 (proxying for 139.130.20.189) (SquirrelMail authenticated user jmmail) by jmason.org with HTTP
  "^from \S+ \((?:proxying for )?((?#IP))\) \([A-Za-z][^\)]+\) by (\S+) with "
  IP,BY

  # from qmail-scanner-general-admin@lists.sourceforge.net by alpha by uid 7791 with qmail-scanner-1.14 (spamassassin: 2.41. Clear:SA:0(-4.1/5.0):. Processed in 0.209512 secs)
  "^from \S+\@\S+ by \S+ by uid \S+ "
  None

  # TO-DO: why?
  # from DSmith1204@aol.com by imo-m09.mx.aol.com (mail_out_v34.13.) id 7.53.208064a0 (4394); Sat, 11 Jan 2003 23:24:31 -0500 (EST)
  "^from \S+\@\S+ by \S+ "
  None

  # from Unknown/Local ([?.?.?.?]) by mailcity.com; Fri, 17 Jan 2003 15:23:29 -0000
  "^from Unknown\/Local \("
  None

  # from localhost (localhost [127.0.0.1]) (uid 500) by mail with local; Tue, 07 Jan 2003 11:40:47 -0600
  "^from (?#LOCAL) \((?:\S+\@|)(?#LOCAL)[\) ]"
  None

  # from olgisoft.com (127.0.0.1) by 127.0.0.1 (EzMTS MTSSmtp 1.55d5) ; Thu, 20 Mar 03 10:06:43 +0100 for <asrg@ietf.org>
  "^from \S+ \((?:\S+\@)?(?#LOCAL)\) "
  None

  # TO-DO: could use IPv6 localhost
  # from casper.ghostscript.com (raph@casper [127.0.0.1]) h148aux8016336verify=FAIL); Tue, 4 Feb 2003 00:36:56 -0800
  "^from (\S+) \(\S+\@\S+ \[(?#LOCAL)\]\) "
  None

  # TO-DO: confirm
  # from (AUTH: e40a9cea) by vqx.net with esmtp (courier-0.40) for <asrg@ietf.org>; Mon, 03 Mar 2003 14:49:28 +0000
  "^from \(AUTH: \S+\) by \S+ with "
  None

  # from CATHY.IJS.SI by CATHY.IJS.SI (PMDF V4.3-10 #8779) id <01KTSSR50NSW001MXN@CATHY.IJS.SI>; Fri, 21 Mar 2003 20:50:56 +0100
  # from MATT_LINUX by hippo.star.co.uk via smtpd (for mail.webnote.net [193.120.211.219]) with SMTP; 3 Jul 2002 15:43:50 UT
  # from cp-its-ieg01.mail.saic.com by cpmx.mail.saic.com for me@jmason.org; Tue, 23 Jul 2002 14:09:10 -0700
  "^from \S+ by \S+ (?:with|via|for|\()"
  None
  
  # from virtual-access.org by bolero.conactive.com ; Thu, 20 Feb 2003 23:32:58 +0100
  "^from \S+ by \S+ *\;"
  None

"""





# receivedDB.py - Simple script to read in a database file and parse
#                 a given Received: header

# 20040114: Benjamin Han <benhdj@cs.cmu.edu> Created; version 0.1.

# Copyright (C) 2003-2004  Benjamin Han <benhdj@cs.cmu.edu>
#
# This program is free software; you can redistribute it and/or
# modify it under the terms of the GNU General Public License
# as published by the Free Software Foundation; either version 2
# of the License, or (at your option) any later version.

# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU General Public License for more details.

# You should have received a copy of the GNU General Public License
# along with this program; if not, write to the Free Software
# Foundation, Inc., 59 Temple Place - Suite 330, Boston, MA  02111-1307, USA.

import re

mpPat=re.compile(r'\(\?#[^)]+\)')


class MetaPatterns (dict):
    def instantiate (self, pat):
        def _replaceMP (mo,mps=self):
            mpName=mo.group(0)[3:-1]
            mp=mps.get(mpName)
            if mp is not None: return '(?:%s)'%mp
            else: raise "Non-existent meta pattern"        
        return mpPat.subn(_replaceMP,pat)[0]

mp=MetaPatterns()
mp['IP']=r'(?:::\w\w\w\w:)?\d+\.\d+\.\d+\.\d+'
mp['LOCAL']=r'local(?:host(?:\.localdomain)?)?|127\.0\.\d+\.\d+'

fbPat1=re.compile(r'^from (\S+) ')
fbPat2=re.compile(r'(?i)helo=(\S+) ')
fbPat3=re.compile(r'\[(%s)\]'%mp['IP'])
fbPat4=re.compile(r'(?i)by (\S+) ')

class Group (list):
    def __init__ (self, head=None, inverse=False):
        if head is None: self.headPat=None
        else: self.headPat=re.compile(head)
        self.inverse=inverse
    def __str__ (self):
        if self.headPat: sList=[self.headPat.pattern]
        else: sList=['Generic']            
        sList.extend(['%s\n%s'%(t[0].pattern,str(t[1])) for t in self])
        return '\n'.join(sList)
    def isThisGroup (self, header):
        if self.headPat:
            if self.inverse: return self.headPat.search(header) is None
            else: return self.headPat.search(header) is not None            
        else: return True


class ReceivedDB (list):
    def __init__ (self):
        global header_db
        isPattern=True
        for line in header_db.splitlines():
            l=line.strip()
            if len(l)==0: continue
            firstChar=l[0]
            if firstChar=='#': continue
            elif firstChar=='*':
                patStr=l[1:].lstrip()
                if patStr=='': g=Group()
                else:
                    if patStr[0]=='-': g=Group(patStr[2:-1],True)
                    else: g=Group(patStr[1:-1])                    
                self.append(g)
            else:
                if isPattern:
                    pat=re.compile(mp.instantiate(l[1:-1]))
                    isPattern=False
                else:
                    l=l.split(',')
                    if len(l)==1: g.append((pat,None))
                    else:
                        aList=[None,None,None,None,None]   # HELO, IDENT, RDNS, IP, BY
                        for idx,keyword in enumerate(l):
                            idx+=1
                            if keyword=='HELO': aList[0]=idx
                            elif keyword=='IDENT': aList[1]=idx
                            elif keyword=='RDNS': aList[2]=idx
                            elif keyword=='IP': aList[3]=idx
                            else: aList[4]=idx

                        g.append((pat,aList))
                    isPattern=True
    def __str__ (self):
        firstGroup=True
        sList=[]
        for g in self:
            if firstGroup: firstGroup=False
            else: sList.append('------')
            sList.append(str(g))
        return '\n'.join(sList)

    def fallbackParse (self, header):
        helo=ident=rdns=ip=by=None
        mo=fbPat1.search(header)
        if mo: helo=mo.group(1)
        else:
            mo=fbPat2.search(header)
            if mo: helo=mo.group(1)
        mo=fbPat3.search(header)
        if mo: ip=mo.group(1)
        mo=fbPat4.search(header)
        if mo: by=mo.group(1)

        if helo or ident or rdns or ip or by: return (helo,ident,rdns,ip,by)
        else: return None

    def parse (self, header):
        """Parse a single Received header and return tuple (helo, ident, rDNS, ip, by); return
        None if the header should be ignored; return False if the header cannot be parsed."""
        for g in self:
            if g.isThisGroup(header):
                #if g.headPat: print g.headPat.pattern
                if len(g):
                    for t in g:
                        mo=t[0].search(header)
                        if mo is None: continue
                        #print t[0].pattern
                        aList=t[1]
                        if aList:
                            if aList[0] is None: helo=None
                            else: helo=mo.group(aList[0])
                            if aList[1] is None: ident=None
                            else: ident=mo.group(aList[1])
                            if aList[2] is None: rdns=None
                            else:
                                rdns=mo.group(aList[2])
                                if rdns=='unknown': rdns=None
                            if aList[3] is None: ip=None
                            else: ip=mo.group(aList[3])
                            if aList[4] is None: by=None
                            else: by=mo.group(aList[4])

                            return (helo,ident,rdns,ip,by)
                        else: return None
                else: return None
                return self.fallbackParse(header)   # none of the group's patterns can parse this header - try really general ones
            
        return self.fallbackParse(header)
        
        
