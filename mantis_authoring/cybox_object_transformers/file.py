from .__object_base__ import *

from .__object_base__ import transformer_object, ObjectFormTemplate



import ntpath

from django import forms

from django.templatetags.static import static

class TEMPLATE_Default(transformer_object):

    display_name = "File"

    relevant_fact_term_list = ['Properties/Hashes/Hash/Simple_Hash_Value',
                               'Properties/File_Name',
                               'Properties/File_Path']

    class ObjectForm(ObjectFormTemplate):

        file_name = forms.CharField(required=False,
                                    help_text= """Base name of the file (including an extension, if present).""")
        file_path = forms.CharField(required=False,
                                    help_text = """Fully-qualified path to the file including filename (must
                                                   not conflict with File_Name field!!!)""")
        file_size = forms.IntegerField(required=False)

        md5 = forms.CharField(max_length=32, required=False)
        sha1 = forms.CharField(max_length=40, required=False)
        sha256 = forms.CharField(max_length=64, required=False)


        def clean(self):

            super(TEMPLATE_Default.ObjectForm, self).clean()
            file_name = self.cleaned_data.get("file_name")
            file_path = self.cleaned_data.get("file_path")

            if file_path.strip():
                name_from_path = ntpath.basename(file_path)
                if file_name.strip():
                    if name_from_path != file_name:
                        raise forms.ValidationError("File name in File_Path and File_Name must be equal!")
                else:
                    # This does not have any effect, since the javascript app does not use
                    # the cleaned data. In order for this to have effect, the JS app would
                    # have to repopulate the fields from the cleaned data: either after each validation
                    # or in bulk before submitting the JSON for save/import.
                    self.cleaned_data['file_name'] = name_from_path

            return self.cleaned_data

    def process_form(self, properties,id_base=None,namespace_tag=None):
        cybox_file = file_object.File()

        if properties['file_name']:
            cybox_file.file_name = String(properties['file_name'])
        if str(properties['file_name']).count('.')>0:
            file_extension = properties['file_name'].rsplit('.')[-1]
            cybox_file.file_extension = String(file_extension)
        if str(properties['file_path']):
            cybox_file.file_path= properties['file_path']
        if properties['file_size'] != '':
            cybox_file.size_in_bytes = int(properties['file_size'])
        if properties['md5'] != '':
            cybox_file.add_hash(Hash(properties['md5'], type_="MD5", exact=True))
        if properties['sha1'] != '':
            cybox_file.add_hash(Hash(properties['sha1'], type_="SHA1", exact=True))
        if properties['sha256'] != '':
            cybox_file.add_hash(Hash(properties['sha256'], type_="SHA256", exact=True))
        return cybox_file
        

