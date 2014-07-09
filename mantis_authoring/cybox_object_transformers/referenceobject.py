from .__object_base__ import *

from .__object_base__ import transformer_object, ObjectFormTemplate

from django import forms

from django.templatetags.static import static


class TEMPLATE_Default(transformer_object):

    display_name = "Reference Object"

    class ObjectForm(ObjectFormTemplate):
        object_id =  forms.CharField(initial='', widget=forms.HiddenInput)

    def process_form(self, properties,id_base=None,namespace_tag=None):
        pass


