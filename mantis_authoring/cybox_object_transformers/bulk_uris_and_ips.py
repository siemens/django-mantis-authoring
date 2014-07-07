from .__object_base__ import transformer_object, ObjectFormTemplate

from django import forms

from django.templatetags.static import static

from cybox.objects import address_object, dns_record_object

class TEMPLATE_Default(transformer_object):

    display_name = "URIs and IPs (Bulk)"
    class ObjectForm(ObjectFormTemplate):
        _multi = forms.CharField(initial=static('true'), widget=forms.HiddenInput)

        data = forms.CharField(widget=forms.Textarea(attrs={'placeholder': 'Copy & Paste your Command and Control Domains/IPs here line by line.'}), required=False)

    def process_form(self, properties):
        import socket
        
        return_objects = []

        id_base = properties['observable_id']

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
                return_objects.append(((id_base,ln),ao))
            else:
                do = self.create_cybox_uri_object(ln) #dns_record_object.DNSRecord()
                #do.domain_name = ln
                return_objects.append(((id_base,ln),do))

        return return_objects
        
