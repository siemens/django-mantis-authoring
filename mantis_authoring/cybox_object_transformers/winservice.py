from .__object_base__ import *

from .__object_base__ import transformer_object, ObjectFormTemplate

from django import forms

from django.templatetags.static import static

class TEMPLATE_Default(transformer_object):

    display_name = "WinService"

    class ObjectForm(ObjectFormTemplate):

        display_name = forms.CharField(max_length=1024, required=True)
        service_name = forms.CharField(max_length=1024, required=False)
        service_dll = forms.CharField(max_length=1024, required=False)
        startup_command_line = forms.CharField(max_length=1024, required=False)
        service_description = forms.CharField(widget=forms.Textarea, required=False)

    def process_form(self, properties):
        service_object = win_service_object.WinService()
        service_object.display_name = String(str(properties.get('display_name','')))
        service_object.service_dll = String(str(properties.get('service_dll','')))
        service_object.startup_command_line = String(str(properties.get('startup_command_line','')))
        desc_list = win_service_object.ServiceDescriptionList(str(properties.get('service_description',''),))
        service_object.description_list = desc_list
        return service_object

