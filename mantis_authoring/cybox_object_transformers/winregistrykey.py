from .__object_base__ import transformer_object, ObjectFormTemplate
from cybox.objects import win_registry_key_object
from cybox.common import String
from django import forms

class TEMPLATE_Default(transformer_object):
    # The fact_terms provided in  ``relevant_fact_term_list`` are
    # used for searching for similar objects that are presented to the
    # user upon request.

    relevant_fact_term_list = []

    # Display name of the object shown in the authoring interface

    display_name = 'WinRegistryKey'

    # Django form object with fields for relevant facts

    class ObjectForm(ObjectFormTemplate):
        hive = forms.CharField(max_length = 1024,
                               required = True,
                               help_text = "The registry hive")
        key = forms.CharField(max_length = 1024,
                              required = True,
                              help_text = "The registry key")
        name = forms.CharField(max_length = 1024,
                               required = False,
                               help_text = "The cell name")
        data = forms.CharField(max_length = 1024,
                               required = False,
                               help_text = "The cell data")
        data_type = forms.CharField(max_length = 1024,
                                    required = False,
                                    help_text = "The cell data_type e.g. REG_SZ")

    def process_form(self, properties, id_base=None, namespace_tag=None):
        registry_key_object = win_registry_key_object.WinRegistryKey()
        if properties['hive'].strip():
            registry_key_object.hive = String(unicode(properties.get('hive', '')))
        if properties['key'].strip():
            registry_key_object.key = String(unicode(properties.get('key', '')))

        if properties['name'].strip() and properties['data'].strip() and properties['data_type'].strip():
            value = win_registry_key_object.RegistryValue()
            value.name = String(unicode(properties.get('name', '')))
            value.datatype = String(unicode(properties.get('data_type')))
            value.data = String(unicode(properties.get('data')))
            values = win_registry_key_object.RegistryValues()
            values.append(value)
            registry_key_object.values = values

        return registry_key_object
