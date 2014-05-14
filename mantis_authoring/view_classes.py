
import sys

import pkgutil

from dingos.view_classes import BasicTemplateView

from operator import itemgetter

from dingos import DINGOS_TEMPLATE_FAMILY


# Extract all templates

CYBOX_OBJECT_TEMPLATE_REGISTRY = {}

import cybox_object_transformers
package = sys.modules['mantis_authoring.cybox_object_transformers']


prefix = package.__name__ + '.'

for importer, modname, ispkg in pkgutil.iter_modules(package.__path__, prefix):

    module = __import__(modname, fromlist="dummy")
    for key in dir(module):
        if key.startswith('TEMPLATE_'):
            CYBOX_OBJECT_TEMPLATE_REGISTRY[(modname.split('.')[-1],key.split("TEMPLATE_")[1])] = getattr(module,key)


class BasicSTIXPackageTemplateView(BasicTemplateView):


    title = 'Mantis Authoring'

    cybox_object_template_registry = CYBOX_OBJECT_TEMPLATE_REGISTRY

    @property
    def cybox_object_template_forms(self):
        existing_templates= sorted(self.cybox_object_template_registry.items(),key=itemgetter(1))
        return map(lambda x: x[1].ObjectForm, existing_templates)

    cybox_relations = [
        {'label': 'Created', 'value': 'Created', 'description': 'Specifies that this object created the related object.'},
        {'label': 'Deleted', 'value': 'Deleted', 'description': 'Specifies that this object deleted the related object.'},
        {'label': 'Read_From', 'value': 'Read_From', 'description': 'Specifies that this object was read from the related object.'},
        {'label': 'Wrote_To', 'value': 'Wrote_To', 'description': 'Specifies that this object wrote to the related object.'},
        {'label': 'Downloaded_From', 'value': 'Downloaded_From', 'description': 'Specifies that this object was downloaded from the related object.'},
        {'label': 'Downloaded', 'value': 'Downloaded', 'description': 'Specifies that this object downloaded the related object.'},
        {'label': 'Uploaded', 'value': 'Uploaded', 'description': 'Specifies that this object uploaded the related object.'},
        {'label': 'Received_Via_Upload', 'value': 'Received_Via_Upload', 'description': 'Specifies that this object received the related object via upload.'},
        {'label': 'Opened', 'value': 'Opened', 'description': 'Specifies that this object opened the related object.'},
        {'label': 'Closed', 'value': 'Closed', 'description': 'Specifies that this object closed the related object.'},
        {'label': 'Copied', 'value': 'Copied', 'description': 'Specifies that this object copied the related object.'},
        {'label': 'Moved', 'value': 'Moved', 'description': 'Specifies that this object moved the related object.'},
        {'label': 'Sent', 'value': 'Sent', 'description': 'Specifies that this object sent the related object.'},
        {'label': 'Received', 'value': 'Received', 'description': 'Specifies that this object received the related object.'},
        {'label': 'Renamed', 'value': 'Renamed', 'description': 'Specifies that this object renamed the related object.'},
        {'label': 'Resolved_To', 'value': 'Resolved_To', 'description': 'Specifies that this object was resolved to the related object.'},
        {'label': 'Related_To', 'value': 'Related_To', 'description': 'Specifies that this object is related to the related object.'},
        {'label': 'Dropped', 'value': 'Dropped', 'description': 'Specifies that this object dropped the related object.'},
        {'label': 'Contains', 'value': 'Contains', 'description': 'Specifies that this object contains the related object.'},
        {'label': 'Extracted_From', 'value': 'Extracted_From', 'description': 'Specifies that this object was extracted from the related object.'},
        {'label': 'Installed', 'value': 'Installed', 'description': 'Specifies that this object installed the related object.'},
        {'label': 'Connected_To', 'value': 'Connected_To', 'description': 'Specifies that this object connected to the related object.'},
        {'label': 'FQDN_Of', 'value': 'FQDN_Of', 'description': 'Specifies that this object is an FQDN of the related object.'},
        {'label': 'Characterizes', 'value': 'Characterizes', 'description': 'Specifies that this object describes the properties of the related object. This is most applicable in cases where the related object is an Artifact Object and this object is a non-Artifact Object.'},
        {'label': 'Used', 'value': 'Used', 'description': 'Specifies that this object used the related object.'},
        {'label': 'Redirects_To', 'value': 'Redirects_To', 'description': 'Specifies that this object redirects to the related object.'}
    ]


    def get_context_data(self, **kwargs):
        context = super(BasicSTIXPackageTemplateView, self).get_context_data(**kwargs)
        context['title'] =  self.title
        context['observableForms'] = self.cybox_object_template_forms
        context['relations'] = sorted(self.cybox_relations, key=itemgetter('label'))
        return context



