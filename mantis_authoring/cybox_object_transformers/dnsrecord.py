from .__object_base__ import *

from django import forms

from django.templatetags.static import static

class TEMPLATE_Default(transformer_object):
    class ObjectForm(forms.Form):
        object_type = forms.CharField(initial="DNSRecord", widget=forms.HiddenInput)
        object_subtype = forms.CharField(initial="Default", widget=forms.HiddenInput)
        I_object_display_name = forms.CharField(initial="DNS Record", widget=forms.HiddenInput)
        I_icon =  forms.CharField(initial=static('img/stix/observable.svg'), widget=forms.HiddenInput)
        domain_name = forms.CharField(max_length=1024) # required to identify observable later in list
        ip_address = forms.CharField(max_length=15)
        description = forms.CharField(widget=forms.Textarea, required=False)

        autocompletion = {
            'ip_address': ['fact1', 'fact2']
        }


    def process_form(self, properties):
        cybox_dns_record = dns_record_object.DNSRecord()
        cybox_dns_record.description = StructuredText(properties.get('description',''))
        cybox_dns_record.domain_name = self.create_cybox_uri_object(properties.get('domain_name', ''))
        cybox_dns_record.ip_address = address_object.Address(String(str(properties.get('ip_address',''))))
        return cybox_dns_record

