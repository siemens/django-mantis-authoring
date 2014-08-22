

from cybox.objects import email_message_object, address_object

from cybox.common import String

from .__object_base__ import transformer_object, ObjectFormTemplate
from django import forms


class Base(transformer_object):
    # We factor out helper functions that might be used
    # by serveral variants (at time of writing, there
    # is only the 'Default' variant.

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

        links = forms.CharField(widget=forms.Textarea(attrs={'placeholder':'URLs line by line'}),
                                required=False,
                                help_text = "Paste here URLs contained in email message; for each URL, a"
                                            " URI object will be generated and associated as 'Link' with the"
                                            " created email message object. Alternatively, create a URI object"
                                            " in the observable pool and relate it to this EmailMessage using"
                                            " the 'contained_in' relation. The latter is preferable if you may"
                                            " want to also relate the URI with other objects, as well.")



    def process_form(self, properties,id_base=None,namespace_tag=None):

        # Create the object

        cybox_email = email_message_object.EmailMessage()

        # Fill in header information from user input
        cybox_email.header = self.create_cybox_email_header_part(properties)

        # See whether there are URI objects to be created

        link_objects = []
        links = properties['links'].splitlines(False)
        if len(links)>0:
            # We need to generate identifiers for the URI objects. We
            # do this by using the 'create_derived_id' function that
            # is contained in the 'transformer_object' class.

            counter = 0
            for link in links:

                if link.strip():
                    obj_id_base = self.create_derived_id(id_base,
                                                     fact=link.strip(),
                                                     counter=counter

                    )
                    counter +=1

                    uri_obj = self.create_cybox_uri_object(link.strip())
                    link_objects.append((obj_id_base,uri_obj))

        if link_objects:

            email_links = email_message_object.Links()
            for (id_base,obj) in link_objects:
                id_ref = self.form_id_from_id_base(obj,namespace_tag,id_base)
                email_links.append(email_message_object.LinkReference(id_ref))

                cybox_email.links = email_links

            # The user has specified

        return {'type': 'obj_with_subobjects',
                'main_obj_properties_instance': cybox_email,
                'obj_properties_instances' : link_objects }
