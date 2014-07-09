
from .__object_base__ import transformer_object, ObjectFormTemplate

from cybox.objects import port_object

from cybox.common import PositiveInteger, String

from django import forms

from django.templatetags.static import static

class TEMPLATE_Default(transformer_object):

    display_name = "Port"
    class ObjectForm(ObjectFormTemplate):
        port_value = forms.IntegerField(required=True)
        layer4_protocol = forms.CharField(max_length=1024, required=False)


    def process_form(self, properties,id_base=None,namespace_tag=None):
        cybox_port = port_object.Port()
        cybox_port.port_value = PositiveInteger(properties['port_value'])
        cybox_port.layer4_protocol = String(properties['layer4_protocol'])
        return cybox_port
        
