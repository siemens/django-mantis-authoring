#!/usr/bin/python
# -*- coding: utf-8 -*-

from .__object_base__ import *

import re
import hashlib
import uuid
import email
import json
import dateutil.parser, dateutil.tz
import mantis_authoring.EmailObjectFunctions as EOF

from django.utils.encoding import force_str, force_text

TRAILING_PUNCTUATION = ['.', ',', ':', ';', '.)', '"', '\'', '!']
WRAPPING_PUNCTUATION = [('(', ')'), ('<', '>'), ('[', ']'), ('&lt;', '&gt;'), ('"', '"'), ('\'', '\''), ('href="', '"')]

word_split_re = re.compile(r'''([\s<>"']+)''')
simple_url_re = re.compile(r'^https?://\[?\w', re.IGNORECASE)
simple_url_2_re = re.compile(r'^www\.|^(?!http)\w[^@]+\.(com|edu|gov|int|mil|net|org)($|/.*)$', re.IGNORECASE)
simple_email_re = re.compile(r'^\S+@\S+\.\S+$')


def djunescape(text, trail):
    unescaped = (text + trail).replace(
        '&amp;', '&').replace('&lt;', '<').replace(
        '&gt;', '>').replace('&quot;', '"').replace('&#39;', "'")
    if trail and unescaped.endswith(trail):
        unescaped = unescaped[:-len(trail)]
    elif trail == ';':
        text += trail
        trail = ''
    return text, unescaped, trail

def getURLs(inp):
    ret = dict()
    words = word_split_re.split(force_text(inp))
    for i, word in enumerate(words):
        if '.' in word or '@' in word or ':' in word:
            #Deal with punctuation.
            lead, middle, trail = '', word, ''
            for punctuation in TRAILING_PUNCTUATION:
                if middle.endswith(punctuation):
                    middle = middle[:-len(punctuation)]
                    trail = punctuation + trail
            for opening, closing in WRAPPING_PUNCTUATION:
                if middle.startswith(opening):
                    middle = middle[len(opening):]
                    lead = lead + opening
                # Keep parentheses at the end only if they're balanced.
                if(middle.endswith(closing)
                   and middle.count(closing) == middle.count(opening) + 1):
                    middle = middle[:-len(closing)]
                    trail = closing + trail

            url = None
            if simple_url_re.match(middle):
                middle, middle_unescaped, trail = djunescape(middle, trail)
                url = middle_unescaped

            elif simple_url_2_re.match(middle):
                middle, middle_unescaped, trail = djunescape(middle, trail)
                url = middle_unescaped

            elif ':' not in middle and simple_email_re.match(middle):
                local, domain = middle.rsplit('@', 1)
                try:
                    domain = domain.encode('idna').decode('ascii')
                except UnicodeError:
                    continue
                # We leave out email addresses
                #url = '%s@%s' % (local, domain)
                
            if url:
                ret[url] = True

    return ret.keys()



class file_analyzer(file_object):
    """
    Returns an email object and file objects for attachments
    """

    object_classes = ['email_object']
    
    
    def test_object(self):

        # Test for eml
        message = email.message_from_string(self.get_file_content())
        message_from = message.get('From', None)
        message_to = message.get('To', None)
        if message_from is not None or message_to is not None:
            self.object_type = 'eml'
            return 'email_object'

        # Test for msg
        try:
            message = EOF.Message(self.get_file_content())
            if message.sender is not None or message.to is not None:
                self.object_type = 'msg'
                return 'email_object'
        except:
            pass
    
        return False


    
    def process(self,**kwargs):
        res = {'status': False,
               'data': 'An error occured.'}

        if not self.test_object():
            return res

        
        if self.object_type == 'eml':
            # Process eml
            eml = EOF.parseEml(self.get_file_content())
            eml_rel_ref = str(uuid.uuid4())
            links = "\n".join(set(getURLs(eml['body']) + getURLs(eml['html'])))
            
            res['status'] = True
            res['object_class'] = 'email_object'
            res['data'] = [{ '_create_relation_ref': eml_rel_ref,
                             'object_class': 'observable',
                             'object_type': 'emailmessage',
                             'object_subtype': 'Default',
                             'properties': {
                                 'from_': eml['from'],
                                 'to' : eml['to'],
                                 'subject' : eml['subject'],
                                 'in_reply_to': eml['in_reply_to'],
                                 'reply_to': eml['reply_to'],
                                 'send_date': eml['send_date'],
                                 'links': links,
                                 'x_mailer': eml['x_mailer'],
                                 'received_lines': eml['received_lines']
                             }
                     }]
            for att in eml['attachments']:
                att_content = att.read()
                att_rel_ref = str(uuid.uuid4())
                
                md5 = hashlib.md5()
                md5.update(att_content)

                sha1 = hashlib.sha1()
                sha1.update(att_content)

                sha256 = hashlib.sha256()
                sha256.update(att_content)

                fa = { '_create_relation_ref': att_rel_ref,
                       'object_class': 'observable',
                       'object_type': 'file',
                       'object_subtype': 'Default',
                       'properties': { 'file_name': att.name,
                                       'file_path': '',
                                       'file_size': att.size,
                                       'md5': md5.hexdigest(),
                                       'sha1': sha1.hexdigest(),
                                       'sha256': sha256.hexdigest(),
                                       
                                       'dda-observable-title': 'Email Attachment: ' + att.name,
                                       'dda-observable-description': 'File of type "' + att.content_type + '" attached to email "' + self.file_name + '"'
                                   }
                     }
                res['data'].append(fa)
                rel = {
                    'object_class': 'relationship',
                    'object_type': 'Contains',
                    'source_create_relation_ref': eml_rel_ref,
                    'target_create_relation_ref': att_rel_ref
                }
                res['data'].append(rel)

            
        elif self.object_type == 'msg':
            # Process msg
            message = EOF.Message(self.get_file_content())
            eml_rel_ref = str(uuid.uuid4())

            try:
                dt = dateutil.parser.parse(message.date)
                send_date = dt.astimezone(dateutil.tz.gettz('UTC')).strftime("%Y-%m-%d %H:%M:%S")
            except:
                send_date = ''

            links = "\n".join(set(getURLs(message.body)))

            rl = []
            for rline in message.header.get_all('Received'):
                rl.append( ' '.join([l.strip().replace("\t", ' ').decode('utf8', 'replace') for l in rline.split("\n")]) )

            res['status'] = True
            res['object_class'] = 'email_object'
            res['data'] = [{ '_create_relation_ref': eml_rel_ref,
                             'object_class': 'observable',
                             'object_type': 'emailmessage',
                             'object_subtype': 'Default',
                             'properties': {
                                 'from_': message.sender,
                                 'to' : message.to,
                                 'subject' : message.subject,
                                 'in_reply_to': message.header.get('In-Reply-To', ''),
                                 'reply_to': message.header.get('Reply-To', ''),
                                 'send_date': send_date,
                                 'links': links,
                                 'x_mailer': message.header.get('X-Mailer', ''),
                                 'received_lines': json.dumps(rl)
                             }
                     }]

            for att in message.attachments:
                att_rel_ref = str(uuid.uuid4())
                filename = att.longFilename
                if filename is None:
                    filename = att.shortFilename
                md5 = hashlib.md5()
                md5.update(att.data)

                sha1 = hashlib.sha1()
                sha1.update(att.data)

                sha256 = hashlib.sha256()
                sha256.update(att.data)

                fa = { '_create_relation_ref': att_rel_ref,
                       'object_class': 'observable',
                       'object_type': 'file',
                       'object_subtype': 'Default',
                       'properties': { 'file_name': filename,
                                       'file_path': '',
                                       'file_size': len(att.data),
                                       'md5': md5.hexdigest(),
                                       'sha1': sha1.hexdigest(),
                                       'sha256': sha256.hexdigest(),
                                       
                                       'dda-observable-title': 'Email Attachment: ' + filename,
                                       'dda-observable-description': 'File attached to email "' + self.file_name + '"'
                                   }
                     }
                res['data'].append(fa)
                rel = {
                    'object_class': 'relationship',
                    'object_type': 'Contains',
                    'source_create_relation_ref': eml_rel_ref,
                    'target_create_relation_ref': att_rel_ref
                }
                res['data'].append(rel)
            
            
        else:
            return res


        return res

    




