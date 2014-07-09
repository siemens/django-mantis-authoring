
from cybox.objects import artifact_object

from __object_base__ import transformer_object, ObjectFormTemplate

from django import forms

# The name of a class defining a CybOx object template *MUST* have
# the form 'TEMPLATE_<variant>'.

class TEMPLATE_Default(transformer_object):

    # The fact_terms provided in  ``relevant_fact_term_list`` are
    # used for searching for similar objects that are presented to the
    # user upon request.

    relevant_fact_term_list = ['Properties/Raw_Artifact']

    display_name = "Artifact"

    class ObjectForm(ObjectFormTemplate):


        data = forms.CharField(widget=forms.Textarea(attrs={'placeholder': 'Paste your artifact here.'}),
                               help_text = "REQUIRED. The Raw_Artifact field contains the raw content of a cyber artifact (rather than simply analysis of that artifact).",
                               required=True)

        # We leave the artifact type (code below) away, because:
        #
        # - the current version of the cybox API fails to pass the type info to the
        #   python binding anyways
        # - the list of values provided by the API and XML spec for specifying the
        #   type is somewhat incomplete: e.g., we have a 'file system fragment', but no general
        #   file fragment, etc.

        #ARTIFACT_TYPES = (
        #    ('File', 'File'),
        #    ('Memory Region', 'Memory Region'),
        #    ('File System Fragment', 'File System Fragment'),
        #    ('Network Traffic', 'Network Traffic'),
        #    ('Generic Data Region', 'Generic Data Region')
        #)

        #artifact_type = forms.ChoiceField(choices=ARTIFACT_TYPES, required=False, initial="TYPE_GENERIC")


    def process_form(self, properties,id_base=None,namespace_tag=None):
        return artifact_object.Artifact(properties['data'])
        
