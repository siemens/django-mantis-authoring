import cybox.objects, importlib, os, hashlib
from cybox.common import Hash, String, Time, ToolInformation, ToolInformationList, ObjectProperties, DateTime, StructuredText, AnyURI, PositiveInteger
import cybox.utils

# Import all cybox object classes
cybox_objects = [fname[:-3] for fname in os.listdir(cybox.objects.__path__[0]) if fname.endswith(".py") and not fname.startswith("_")]
for co in cybox_objects:
    globals()[co] = importlib.import_module('.'+co, 'cybox.objects')

from django.db.models import Q
from dingos.models import InfoObject2Fact, InfoObject, UserData, get_or_create_fact
from dingos import DINGOS_INTERNAL_IOBJECT_FAMILY_NAME, DINGOS_TEMPLATE_FAMILY

from django import forms

from django.templatetags.static import static

from mantis_authoring.settings import MANTIS_AUTHORING_ID_DERIVATION_STRATEGY, HASH_MODE, COUNTER_MODE

class ObjectFormTemplate(forms.Form):

    def __init__(self,*args,**kwargs):
        object_type = kwargs.pop('object_type')
        object_subtype = kwargs.pop('object_subtype','Default')
        display_name = kwargs.pop('display_name',None)
        super(ObjectFormTemplate, self).__init__(*args, **kwargs)
        self.fields['object_type'] = forms.CharField(initial=object_type, widget=forms.HiddenInput)
        self.fields['object_subtype'] = forms.CharField(initial=object_subtype, widget=forms.HiddenInput)
        if display_name:
            self.fields['I_object_display_name'] = forms.CharField(initial=display_name, widget=forms.HiddenInput)
        else:
            self.fields['I_object_display_name'] = forms.CharField(initial="%s (%s)" % (object_type,object_subtype),
                                                                   widget=forms.HiddenInput)

    I_icon =  forms.CharField(initial=static('img/stix/observable.svg'), widget=forms.HiddenInput)
    observable_id = forms.CharField(initial="", widget=forms.HiddenInput)


class transformer_object(object):

    display_name = "[MISSING DISPLAYNAME]"
    def __init__(self):
        pass

    relevant_fact_term_list = []


    def create_derived_id(self,father_id,
                          fact=None,
                          mode= MANTIS_AUTHORING_ID_DERIVATION_STRATEGY,
                          counter=None):
        if mode==HASH_MODE:
            if fact == None:
                raise StandardError("You need to pass a hashable fact.")
            return "%s" % (hashlib.md5("%s-%s" % (father_id,fact)).hexdigest())
        elif mode == COUNTER_MODE:
            if counter == None:
                raise StandardError("You need to pass a counter value.")
            else:
                # We make an offset so by looking at the indicator
                # one cannot see how many subobjects must at least exist
                offset = sum(map(lambda c: ord(c), father_id)) % 10000
                return "%s-%05d" % (father_id,offset+counter)
        else:
            raise StandardError("You need to pass a valid mode to 'create_derived_id'.")

    def form_id_from_id_base(self,obj,namespace_tag,id_base):
        return "%s:%s-%s" % (namespace_tag,
                             obj.__class__.__name__,
                             id_base)

    def get_relevant_fact_term_list(self):
        return self.relevant_fact_term_list or None

    def autocomplete(self, queryterm, values):
        if values is None:
            return []
        type_ = values.get('object_type', None)
        if type_ is None:
            return []
        return self.object_lookup_simple(type_, queryterm)


    def object_lookup_simple(self, type_, term, limit=10):

        t_q = Q(iobject__iobject_type__name__icontains=type_)
        q_q = Q(fact__fact_values__value__icontains=term) & Q(fact__fact_term__term__icontains="Address")

        return InfoObject2Fact.objects.all().\
            exclude(iobject__latest_of=None).\
            exclude(iobject__iobject_family__name__exact=DINGOS_INTERNAL_IOBJECT_FAMILY_NAME). \
            exclude(iobject__iobject_family__name__exact='ioc'). \
            prefetch_related('iobject',
                             'iobject__iobject_type',
                             'fact__fact_term',
                             'fact__fact_values') \
                .filter(q_q)\
                .select_related().distinct().order_by('iobject__id')[:limit]


        # t_q = Q(iobject_type__name__icontains=type_)
        # q_q = Q(identifier__uid__icontains=term) | Q(name__icontains=term)
        # return InfoObject.objects.exclude(latest_of=None)\
        #                          .exclude(iobject_family__name__exact=DINGOS_INTERNAL_IOBJECT_FAMILY_NAME)\
        #                          .prefetch_related(
        #                              'iobject_type',
        #                              'iobject_family',
        #                              'iobject_family_revision',
        #                              'identifier')\
        #                          .filter(q_q)\
        #                          .filter(t_q)\
        #                          .select_related().distinct().order_by('-latest_of__pk')[:limit]


    # Creates a cybox URI object, used in multiple objects
    def create_cybox_uri_object(self, value, type_=None):
        if not value:
            return None
        return uri_object.URI(AnyURI(value), type_)

        

        
        
        
