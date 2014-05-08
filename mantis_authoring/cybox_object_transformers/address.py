from .__object_base__ import *

from django import forms

from django.templatetags.static import static

class TEMPLATE_Default(transformer_object):
    class ObjectForm(forms.Form):
        CATEGORY_TYPES = (
            ('ipv4-addr', 'IPv4 Address'),
            ('ipv4-net', 'IPv4 Network'),
            ('ipv6-addr', 'IPv6 Address'),
            ('ipv6-net', 'IPv6 Network')
        )
        CONDITIONS_TYPES = (
            ('InclusiveBetween', 'Inclusive Between'),
            ('StartsWith', 'Starts With'),
            ('Contains', 'Contains'),
            ('Equals', 'Equals')
        )
        object_type = forms.CharField(initial="Address", widget=forms.HiddenInput)
        object_subtype = forms.CharField(initial="Default", widget=forms.HiddenInput)
        I_object_display_name = forms.CharField(initial="Address", widget=forms.HiddenInput)
        I_icon =  forms.CharField(initial=static('img/stix/observable.svg'), widget=forms.HiddenInput)
        observable_id = forms.CharField(initial="", widget=forms.HiddenInput)
        ip_addr = forms.CharField(label="IP Address",
                                  help_text="Enter an IP Address",
                                  max_length=45,
                                  )
        category = forms.ChoiceField(choices=CATEGORY_TYPES, required=False, initial="ipv4-addr")
        #is_source = forms.BooleanField(initial=False)
        #is_destination = forms.BooleanField(initial=False)
        condition = forms.ChoiceField(choices=CONDITIONS_TYPES, required=False, initial="Equals")

    def process_form(self, properties):
        cybox_address = address_object.Address()
        cybox_address.address_value = String(properties['ip_addr'])
        cybox_address.category = properties['category']
        cybox_address.condition = properties['condition']
        return cybox_address
        

