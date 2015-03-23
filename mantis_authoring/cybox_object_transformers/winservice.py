

from .__object_base__ import transformer_object, ObjectFormTemplate

from django import forms

from cybox.objects import win_service_object

from cybox.common import String

from django.templatetags.static import static

class TEMPLATE_Default(transformer_object):

    display_name = "WinService"

    class ObjectForm(ObjectFormTemplate):

        display_name = forms.CharField(max_length=1024,
                                       required=False,
                                       help_text = "The displayed name of the service in Windows GUI controls. See also: http://msdn.microsoft.com/en-us/library/windows/desktop/ms683228(v=vs.85).aspx.")
        service_name = forms.CharField(max_length=1024,
                                       required=False,
                                       help_text=" The name of the service. See also: http://msdn.microsoft.com/en-us/library/windows/desktop/ms683229(v=vs.85).aspx.")
        service_dll = forms.CharField(max_length=1024,
                                      required=False,
                                      help_text = "The name of the DLL instantiated in the service.")
        startup_command_line = forms.CharField(max_length=1024,
                                               required=False,
                                               help_text = "The full command line used to start the service.")

    def process_form(self, properties,id_base=None,namespace_tag=None):
        service_object = win_service_object.WinService()
        if properties['display_name'].strip():
            service_object.display_name = String(unicode(properties.get('display_name','')))
        if properties['service_dll'].strip():
            service_object.service_dll = String(unicode(properties.get('service_dll','')))
        if properties['startup_command_line'].strip():
            service_object.startup_command_line = String(unicode(properties.get('startup_command_line','')))

        return service_object

