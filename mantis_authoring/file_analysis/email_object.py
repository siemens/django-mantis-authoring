#!/usr/bin/python
# -*- coding: utf-8 -*-

from .__object_base__ import *

import re
import hashlib
import uuid
import email
import dateutil.parser, dateutil.tz
import mantis_authoring.ExtractMsg as ExtractMsg

from StringIO import StringIO
from email.Header import decode_header
from email.utils import parseaddr


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
            message = ExtractMsg.Message(self.get_file_content())
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
            eml = parseEml(self.get_file_content())
            eml_rel_ref = str(uuid.uuid4())
            #TODO Links
            links = ''
            
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
            message = ExtractMsg.Message(self.get_file_content())
            eml_rel_ref = str(uuid.uuid4())

            try:
                dt = dateutil.parser.parse(message.date)
                send_date = dt.astimezone(dateutil.tz.gettz('UTC')).strftime("%Y-%m-%d %H:%M:%S")
            except:
                send_date = ''

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
                                 'links': '',
                                 'x_mailer': message.header.get('X-Mailer', ''),
                                 'received_lines': "\n".join(str(r) for r in message.header.get_all('Received'))
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
    return {
        'subject' : subject,
        'body' : body,
        'html' : html,
        'from' : msgobj.get('From', ''), #parseaddr(msgobj.get('From'))[1],
        'to' : msgobj.get('To', ''), ##parseaddr(msgobj.get('To'))[1],
        'in_reply_to': msgobj.get('In-Reply-To', ''),
        'reply_to': msgobj.get('Reply-To', ''),
        'received_lines' : "\n".join(str(r) for r in msgobj.get_all('Received')),
        'x_mailer': msgobj.get('X-Mailer', ''),
        'send_date': send_date,
        'attachments': attachments,
    }
