from .__object_base__ import *

from django import forms

from django.templatetags.static import static

class TEMPLATE_Default(transformer_object):
    class ObjectForm(forms.Form):
        URI_TYPES = (
            ('TYPE_URL', 'URL'),
            ('TYPE_GENERAL', 'General URN'),
            ('TYPE_DOMAIN', 'Domain Name')
        )
        object_type = forms.CharField(initial="URI", widget=forms.HiddenInput)
        object_subtype = forms.CharField(initial="Default", widget=forms.HiddenInput)
        I_object_display_name = forms.CharField(initial="Generic URI", widget=forms.HiddenInput)
        I_icon =  forms.CharField(initial=static('img/stix/observable.svg'), widget=forms.HiddenInput)
        type_ = forms.ChoiceField(choices=URI_TYPES, required=False, initial="TYPE_URL")
        value = forms.CharField(max_length=2048, required=False)


    def process_form(self, properties):
        return self.create_cybox_uri_object(properties['value'], properties['type_'])
