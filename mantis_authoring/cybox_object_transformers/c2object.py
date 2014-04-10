from .__object_base__ import *

from django import forms

from django.templatetags.static import static

class TEMPLATE_Default(transformer_object):
    class ObjectForm(forms.Form):
        object_type = forms.CharField(initial="C2Object", widget=forms.HiddenInput)
        object_subtype = forms.CharField(initial="Default", widget=forms.HiddenInput)
        I_object_display_name = forms.CharField(initial="Command & Control Domains/IPs", widget=forms.HiddenInput)
        I_icon =  forms.CharField(initial=static('img/stix/observable.svg'), widget=forms.HiddenInput)
        _multi = forms.CharField(initial=static('true'), widget=forms.HiddenInput)
        data = forms.CharField(widget=forms.Textarea(attrs={'placeholder': 'Copy & Paste your Command and Control Domains/IPs here line by line.'}), required=False)

    def process_form(self, properties):
        import socket
        
        return_objects = []

        for ln in properties['data'].splitlines(False):
            ln = ln.strip()
            is_ip = False
            try:
                socket.inet_aton(ln)
                is_ip=True
            except:
                pass
        
            if is_ip:
                ao = address_object.Address()
                ao.address_value = ln
                ao.is_destination = True
                return_objects.append(ao)
            else:
                do = dns_record_object.DNSRecord()
                do.domain_name = ln
                return_objects.append(do)

        return return_objects
        
