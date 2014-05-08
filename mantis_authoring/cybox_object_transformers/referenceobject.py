from .__object_base__ import *

from django import forms

from django.templatetags.static import static

class TEMPLATE_Default(transformer_object):
    class ObjectForm(forms.Form):
        object_type = forms.CharField(initial="ReferenceObject", widget=forms.HiddenInput)
        object_subtype = forms.CharField(initial="Default", widget=forms.HiddenInput)
        I_object_display_name = forms.CharField(initial="Object Reference", widget=forms.HiddenInput)
        I_icon =  forms.CharField(initial=static('img/stix/observable.svg'), widget=forms.HiddenInput)
        object_id =  forms.CharField(initial='', widget=forms.HiddenInput)

    def process_form(self, properties):
        pass


