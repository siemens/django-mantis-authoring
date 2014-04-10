from .__object_base__ import *

from django import forms

from django.templatetags.static import static

class TEMPLATE_Default(transformer_object):
    class ObjectForm(forms.Form):
        ARTIFACT_TYPES = (
            ('TYPE_FILE', 'File'),
            ('TYPE_MEMORY', 'Memory Region'),
            ('TYPE_FILE_SYSTEM', 'File System Fragment'),
            ('TYPE_NETWORK', 'Network Traffic'),
            ('TYPE_GENERIC', 'Generic Data Region')
        )
        object_type = forms.CharField(initial="Artifact", widget=forms.HiddenInput)
        object_subtype = forms.CharField(initial="Default", widget=forms.HiddenInput)
        I_object_display_name = forms.CharField(initial="Artifact", widget=forms.HiddenInput)
        I_icon =  forms.CharField(initial=static('img/stix/observable.svg'), widget=forms.HiddenInput)
        artifact_type = forms.ChoiceField(choices=ARTIFACT_TYPES, required=False, initial="TYPE_GENERIC")
        data = forms.CharField(widget=forms.Textarea(attrs={'placeholder': 'Paste your artifact here.'}), required=False)

    def process_form(self, properties):
        return artifact_object.Artifact(properties['data'], properties['artifact_type'])
        
