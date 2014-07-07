from .__object_base__ import transformer_object, ObjectFormTemplate

from cybox.objects import address_object

from cybox.common import String

from django import forms

from django.templatetags.static import static


# The name of a class defining a CybOx object template *MUST* have
# the form 'TEMPLATE_<variant>'.

class TEMPLATE_Default(transformer_object):

    # The fact_terms provided in  ``relevant_fact_term_list`` are
    # used for searching for similar objects that are presented to the
    # user upon request.

    relevant_fact_term_list = ['Properties/Address_Value']

    # Display name of the object shown in the authoring interface

    display_name = 'IP Address'

    # Django form object with fields for relevant facts
    class ObjectForm(ObjectFormTemplate):

        ip_addr = forms.CharField(label="IP Address",
                                  required=True,
                                  help_text="REQUIRED. Be sure to enter data according to chosen format (v4 vs. v6. and"
                                            " single IP vs. network in slash notation)",
                                  max_length=100)


        CATEGORY_TYPES = (
            ('ipv4-addr', 'IPv4 Address'),
            ('ipv4-net', 'IPv4 Network (Slash notation)'),
            ('ipv6-addr', 'IPv6 Address'),
            ('ipv6-net', 'IPv6 Network (Slash notation)')
        )


        category = forms.ChoiceField(choices=CATEGORY_TYPES, required=False, initial="ipv4-addr")

        # Allowing the user to provide one of the condition types below
        # just makes using the data more difficult. We always go with 'Equals'

        #CONDITIONS_TYPES = (
        #    ('InclusiveBetween', 'Inclusive Between'),
        #    ('StartsWith', 'Starts With'),
        #    ('Contains', 'Contains'),
        #    ('Equals', 'Equals')
        #)
        #condition = forms.ChoiceField(choices=CONDITIONS_TYPES, required=False, initial="Equals")



    def process_form(self, properties):
        # We use the cybox API to create an address object
        cybox_address = address_object.Address()
        cybox_address.address_value = String(str(properties.get('ip_addr','')))
        cybox_address.category = properties.get('category', None)
        cybox_address.condition = 'Equals'
        return cybox_address
        

