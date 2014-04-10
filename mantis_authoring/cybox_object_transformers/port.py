from .__object_base__ import *

from django import forms

from django.templatetags.static import static

class TEMPLATE_Default(transformer_object):
    class ObjectForm(forms.Form):
        object_type = forms.CharField(initial="Port", widget=forms.HiddenInput)
        object_subtype = forms.CharField(initial="Default", widget=forms.HiddenInput)
        I_object_display_name = forms.CharField(initial="Port", widget=forms.HiddenInput)
        I_icon =  forms.CharField(initial=static('img/stix/observable.svg'), widget=forms.HiddenInput)
        port_value = forms.CharField(max_length=5, required=True)
        layer4_protocol = forms.CharField(max_length=1024, required=False)


    def process_form(self, properties):
        cybox_port = port_object.Port()
        cybox_port.port_value = PositiveInteger(properties['port_value'])
        cybox_port.layer4_protocol = String(properties['layer4_protocol'])
        return cybox_port
        
