from .__object_base__ import *

from django import forms

from django.templatetags.static import static

class TEMPLATE_Default(transformer_object):
    class ObjectForm(forms.Form):
        object_type = forms.CharField(initial="File", widget=forms.HiddenInput)
        object_subtype = forms.CharField(initial="Default", widget=forms.HiddenInput)
        I_object_display_name = forms.CharField(initial="File", widget=forms.HiddenInput)
        I_icon =  forms.CharField(initial=static('img/stix/observable.svg'), widget=forms.HiddenInput)
        file_name = forms.CharField(required=False)
        file_path = forms.CharField(required=False)
        file_size = forms.IntegerField(required=False)
        md5 = forms.CharField(max_length=32) # required to identify observable later in list
        sha1 = forms.CharField(max_length=40, required=False)
        sha256 = forms.CharField(max_length=64, required=False)


    def process_form(self, properties):
        cybox_file = file_object.File()
        cybox_file.file_name = String(properties['file_name'])
        if str(properties['file_name']).count('.')>0:
            file_extension = properties['file_name'].rsplit('.')[-1]
        else:
            file_extension = "None"
        cybox_file.file_extension = String(file_extension)
        if properties['file_size'] != '':
            cybox_file.size_in_bytes = int(properties['file_size'])
        if properties['md5'] != '':
            cybox_file.add_hash(Hash(properties['md5'], type_="MD5", exact=True))
        if properties['sha1'] != '':
            cybox_file.add_hash(Hash(properties['sha1'], type_="SHA1", exact=True))
        if properties['sha256'] != '':
            cybox_file.add_hash(Hash(properties['sha256'], type_="SHA256", exact=True))
        return cybox_file
        

