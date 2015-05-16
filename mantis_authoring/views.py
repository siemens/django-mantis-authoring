import importlib, json
from querystring_parser import parser

from django.db.models import Q
from django.core.urlresolvers import reverse
from django.http import HttpResponse, HttpResponseRedirect
from django.views.generic.edit import FormView

from dingos import DINGOS_INTERNAL_IOBJECT_FAMILY_NAME
from dingos.view_classes import BasicJSONView
from dingos.models import InfoObject

from dingos_authoring.models import AuthoredData

from .utilities import name_cybox_obj, find_similar_cybox_obj


class GetAuthoringObjectReference(BasicJSONView):
    """
    View serving a reference to an existing object
    """
    @property
    def returned_obj(self):
        res = {
            'status': False,
            'msg': 'An error occured',
            'data': list(InfoObject.objects.none())
        }

        POST = self.request.POST
        post_dict = parser.parse(str(POST.urlencode()))

        object_element = post_dict.get('el', {})

        if type(object_element) is not dict:
            object_element = parser.parse(object_element)

        object_type = object_element.get('object_type', '').lower().strip()
        object_subtype = object_element.get('object_subtype', 'Default')
        queryterm = post_dict.get('q', '')

        if not object_element or object_type == '':
            pass
        elif object_type == 'campaign':
            # Get the authored objects with status 'import'
            json_obj_l = AuthoredData.objects.filter(
                kind = AuthoredData.AUTHORING_JSON,
                latest = True,
                author_view__name = 'url.mantis_authoring.transformers.stix.ct_maintenance_campaign',
                status = AuthoredData.IMPORTED
            ).prefetch_related('identifier','group','user').prefetch_related('top_level_iobject',
                                                                             'top_level_iobject__identifier',
                                                                             'top_level_iobject__identifier__namespace')
            authored_campaigns = dict()
            for ao in json_obj_l:
                ta_jsn = json.loads(ao.content)
                authored_campaigns['{'+ta_jsn['ns']+'}campaign-'+ta_jsn['uuid']] = True

            # Query the imported objects
            q_q = (Q(name__icontains=queryterm) | Q(identifier__uid=queryterm)) & Q(iobject_type__name__icontains="Campaign")
            data =  InfoObject.objects.all(). \
                    exclude(latest_of=None). \
                    exclude(iobject_family__name__exact=DINGOS_INTERNAL_IOBJECT_FAMILY_NAME). \
                    exclude(iobject_family__name__exact='ioc'). \
                    filter(q_q). \
                    distinct().order_by('name')[:10]

            for x in data:
                r = {'id': "{%s}%s" % (x.identifier.namespace.uri,x.identifier.uid),
                     'uuid': x.identifier.uid,
                     'ns': x.identifier.namespace.uri,
                     'name': x.name,
                     'cat': str(x.iobject_type),
                     'authored': False }
                if r['id'] in authored_campaigns:
                    r['authored'] = True
                    res['data'].insert(0, r)
                else:
                    res['data'].append(r)

            res['status'] = True
        

        else:
            try:
                im = importlib.import_module('mantis_authoring.cybox_object_transformers.' + object_type)
                template_obj = getattr(im,'TEMPLATE_%s' % object_subtype)()
                data = template_obj.autocomplete(queryterm, object_element)
                res['data'] = map(lambda x : {'id': "{%s}%s" % (x.identifier.namespace.uri,x.identifier.uid),
                                              'name': x.iobject.name, 'cat': str(x.iobject.iobject_type)}, data)
                res['status'] = True
                res['msg'] = ''
            except Exception as e:
                res['msg'] = str(e)
                
        return res






class GetAuthoringSimilarObjects(BasicJSONView):
    """
    View serving a list of similar objects
    """
    @property
    def returned_obj(self):
        res = {
            'status': False,
            'msg': 'An error occured',
            'data': {
                'items': []
            }
        }

        POST = self.request.POST
        post_dict = parser.parse(str(POST.urlencode()))

        object_element = post_dict.get('observable_properties', {})
        object_type = object_element.get('object_type', '').lower().strip()
        object_subtype = object_element.get('object_subtype', 'Default')

        try:
            im = importlib.import_module('mantis_authoring.cybox_object_transformers.' + object_type)
            template_obj = getattr(im,'TEMPLATE_%s' % object_subtype)()
            transform_result = template_obj.process_form(object_element)
            if isinstance(transform_result, dict):

                result_type = transform_result['type']
                main_properties_obj = transform_result['main_obj_properties_instance']
                properties_obj_list = transform_result['obj_properties_instances']

                if main_properties_obj:
                    cybox_xml = main_properties_obj.to_xml()
                elif len(properties_obj_list) > 0:
                    cybox_xml = ''
                    pass
                else:
                    cybox_xml = ''
                    pass
            else:
                cybox_xml = transform_result.to_xml()
            
            fact_term_list = template_obj.get_relevant_fact_term_list()
            similar_objects = find_similar_cybox_obj(cybox_xml, fact_term_list)
            for similar_obj in similar_objects:
                sobj = similar_obj.facts.all()
                sobj = sobj.filter(fact_term__term__in=fact_term_list)

                det = []
                for fact in sobj:
                    det.append(
                        ', '.join(map(lambda x: x.get('value') ,fact.fact_values.values()))
                    )
                
                res['data']['items'].append({
                    'url': reverse('url.dingos.view.infoobject', args=(similar_obj.pk,)),
                    'title': similar_obj.name,
                    'details': ', '.join(det)
                })
            res['status'] = True
            if(len(res['data']['items'])==0):
                res['status'] = False
                res['msg'] = 'Sorry, we could not find similar objects!'

        except Exception as e:
            raise e
            res['msg'] = str(e)
        
        return res





class ValidateObject(FormView):

    def errors_to_json(self, errors):
        """
        Convert a Form error list to JSON::
        """
        return dict(
                (k, map(unicode, v))
                for (k,v) in errors.iteritems()
            )

    def get_form_kwargs(self, data=None,object_type=None,object_subtype=None):
        kwargs = super(ValidateObject, self).get_form_kwargs()
        if data:
            kwargs.update({'initial': data, 'data': data})
        kwargs.update({'object_type':object_type,
                      'object_subtype':object_subtype})
        return kwargs

    def post(self, request, *args, **kwargs):
        res = {
            'status': True,
            'data': dict()
        }
        POST = self.request.POST.get('obs', {})
        p_dict = json.loads(POST)

        for post_dict in p_dict:
            observable_properties = post_dict.get('observable_properties', {})
            observable_properties['observable_id'] = post_dict.get('observable_id')
            observable_properties['I_object_display_name'] = 'NONE'
            observable_properties['I_icon'] = 'NONE'
            object_type = observable_properties.get('object_type', None)
            object_subtype = observable_properties.get('object_subtype', 'Default')

            im = importlib.import_module('mantis_authoring.cybox_object_transformers.' + object_type.lower())
            template_obj = getattr(im,'TEMPLATE_%s' % object_subtype)()

            form_class = template_obj.ObjectForm
            form = form_class(**self.get_form_kwargs(observable_properties,object_type=object_type,
                                                     object_subtype=object_subtype))

            res['data'][observable_properties['observable_id']] = dict()
            res['data'][observable_properties['observable_id']]['object_name'] = getObjectName(observable_properties)

            if form.is_valid():
                res['data'][observable_properties['observable_id']]['valid'] = True
                res['data'][observable_properties['observable_id']]['msg'] = 'Validation successful'
                res['data'][observable_properties['observable_id']]['data'] = None
            else:
                res['data'][observable_properties['observable_id']]['valid'] = False
                res['data'][observable_properties['observable_id']]['msg'] = 'An error occured validating the object.'
                res['data'][observable_properties['observable_id']]['data'] = self.errors_to_json(form.errors)

        return HttpResponse(json.dumps(res), content_type='application/json', )



def getObjectName(object_element):
    """
    Function for determining the name of a passed object
    """
    res = {
        'status': True,
        'data': ''
    }
    object_type = object_element.get('object_type', '').lower().strip()
    object_subtype = object_element.get('object_subtype', 'Default')

    try:
        im = importlib.import_module('mantis_authoring.cybox_object_transformers.' + object_type)
        template_obj = getattr(im,'TEMPLATE_%s' % object_subtype)()
        transform_result = template_obj.process_form(object_element,'dummy','dummy')
        if isinstance(transform_result, dict):
            result_type = transform_result['type']
            main_properties_obj = transform_result['main_obj_properties_instance']
            properties_obj_list = transform_result['obj_properties_instances']
            res['status'] = True
            if main_properties_obj:
                cybox_xml = main_properties_obj.to_xml()
                res['data'] = name_cybox_obj(cybox_xml)
                res['status'] = True
            elif len(properties_obj_list) > 0:
                    (id,properties_obj) = properties_obj_list[0]
                    res['data'] = 'Bulk: %s ...' % name_cybox_obj(properties_obj.to_xml())
            else:
                res['data'] = 'Empty Bulk Object'
        else:
            cybox_xml = transform_result.to_xml()
            res['data'] = name_cybox_obj(cybox_xml)
            res['status'] = True
    except Exception as e:
        res['status'] = False
        res['data'] = str(e)
    return res

