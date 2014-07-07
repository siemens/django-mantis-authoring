import whois

from .__object_base__ import *

from cybox.objects import email_message_object

from .__object_base__ import transformer_object, ObjectFormTemplate
from django import forms
from django.templatetags.static import static



class Base(transformer_object):

    def create_cybox_email_header_part(self, properties):
        cybox_email_header = email_message_object.EmailHeader()
        """ recipients """
        if properties['to'].strip():
            recipient_list = email_message_object.EmailRecipients()
            for recipient in properties['to'].splitlines(False):
                recipient_list.append(address_object.EmailAddress(recipient.strip()))
            cybox_email_header.to = recipient_list
        """ sender """
        if properties['from_'].strip():
            cybox_email_header.from_ = address_object.EmailAddress(properties['from_'])
        """ subject """
        if properties['subject'].strip():
            cybox_email_header.subject = String(properties['subject'])
        """ in reply to """
        if properties['in_reply_to'].strip():
            cybox_email_header.in_reply_to = String(properties['in_reply_to'])
        """ send date """
        if properties['send_date']:
            cybox_email_header.date = DateTime(properties['send_date'])
        return cybox_email_header


class TEMPLATE_Default(Base):

    display_name = "Email"

    class ObjectForm(ObjectFormTemplate):

        from_ = forms.CharField(max_length=256,
                                required=False,
                                help_text="Email address of the sender of the email message.")
        to = forms.CharField(widget=forms.Textarea(attrs={'placeholder':"Recipients line by line"}),
                             required=False,
                             help_text="Email addresses of the recipients of the email message.")
        subject = forms.CharField(max_length=1024,
                                  required=False,
                                  help_text="Subject of email message.")
        in_reply_to = forms.CharField(max_length=1024,
                                      required=False,
                                      help_text = "Message ID of the message that this email is a reply to." )
        send_date = forms.DateTimeField(required=False,
                                        help_text = "Date/time that the email message was sent.")
        #raw_header = forms.CharField(widget=forms.Textarea,
        #                             required=False)

        #raw_body = forms.CharField(widget=forms.Textarea,
        #                           required=False)
        links = forms.CharField(widget=forms.Textarea(attrs={'placeholder':'Links line by line'}),
                                required=False,
                                help_text = "Relevant links contained in email message")


    def process_form(self, properties):
        id_salt = properties['observable_id']
        cybox_email = email_message_object.EmailMessage()

        # We leave away raw body and raw header, because
        # our objective is mainly to enter indicators rather than
        # a full description of an object.
        #
        #if properties['raw_body']:
        #    cybox_email.raw_body = String(properties['raw_body'])
        #if properties['raw_header']:
        #    cybox_email.raw_header = String(properties['raw_header'])
        cybox_email.header = self.create_cybox_email_header_part(properties)
        link_objects = []
        links = properties['links'].splitlines(False)
        if len(links)>0:
            for link in links:
                if link.strip():
                    id_base = self.create_hashed_id(id_salt,link.strip())
                    uri_obj = self.create_cybox_uri_object(link.strip())
                    link_objects.append((id_base,uri_obj))

        if link_objects:
            email_links = email_message_object.Links()
            for (id_base,obj) in link_objects:
                email_links.append(email_message_object.LinkReference("URI-%s" % id_base))

                cybox_email.links = email_links

            # The user has specified
            return (cybox_email,link_objects)
        else:
            return cybox_email
