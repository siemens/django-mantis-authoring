from .__object_base__ import *

from .__object_base__ import transformer_object, ObjectFormTemplate

from django import forms

from django.templatetags.static import static

class TEMPLATE_Default(transformer_object):

    display_name = "URI"
    class ObjectForm(ObjectFormTemplate):

        URI_TYPES = (
            ('URL', 'URL'),
            ('General URN', 'General URN'),
            ('Domain Name', 'Domain Name')
        )

        type_ = forms.ChoiceField(choices=URI_TYPES, required=False, initial="TYPE_URL")
        value = forms.CharField(max_length=2048)


    def process_form(self, properties):
        return self.create_cybox_uri_object(properties['value'], properties['type_'])
