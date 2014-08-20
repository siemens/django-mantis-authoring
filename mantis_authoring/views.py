import importlib, json
from querystring_parser import parser

from django.db.models import Q
from django.http import HttpResponse, HttpResponseRedirect
from django.views.generic.edit import FormView

from dingos import DINGOS_INTERNAL_IOBJECT_FAMILY_NAME
from dingos.view_classes import BasicJSONView
from dingos.models import InfoObject

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
        post_dict = parser.parse(POST.urlencode())

        object_element = post_dict.get('el', {})
        object_type = object_element.get('object_type', None).lower().strip()
        object_subtype = object_element.get('object_subtype', 'Default')
        queryterm = post_dict.get('q', '')

        if not object_element or not object_type or object_type == '':
            pass
        elif object_type == 'campaign':
            q_q = Q(name__icontains=queryterm) & Q(iobject_type__name__icontains="Campaign")
            data =  InfoObject.objects.all(). \
                    exclude(latest_of=None). \
                    exclude(iobject_family__name__exact=DINGOS_INTERNAL_IOBJECT_FAMILY_NAME). \
                    exclude(iobject_family__name__exact='ioc'). \
                    filter(q_q). \
                    distinct().order_by('name')[:10]
            # TODO: fetch campaigns and associated threatactor from DB
            res['data'] = map(lambda x : {'id': "{%s}%s" % (x.identifier.namespace.uri,x.identifier.uid),
                                          'name': x.name,
                                          'cat': str(x.iobject_type),
                                          'threatactor': {}}, data)
        
            
        elif object_type == 'threatactor':
            q_q = Q(name__icontains=queryterm) & Q(iobject_type__name__icontains="ThreatActor")
            data =  InfoObject.objects.all(). \
                    exclude(latest_of=None). \
                    exclude(iobject_family__name__exact=DINGOS_INTERNAL_IOBJECT_FAMILY_NAME). \
                    exclude(iobject_family__name__exact='ioc'). \
                    filter(q_q). \
                    distinct().order_by('name')[:10]
            res['data'] = map(lambda x : {'id': "{%s}%s" % (x.identifier.namespace.uri,x.identifier.uid),
                                          'name': x.name, 'cat': str(x.iobject_type)}, data)

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
        post_dict = parser.parse(POST.urlencode())

        object_element = post_dict.get('observable_properties', {})
        object_type = object_element.get('object_type', '').lower().strip()
        object_subtype = object_element.get('object_subtype', 'Default')

        try:
            im = importlib.import_module('mantis_authoring.cybox_object_transformers.' + object_type)
            template_obj = getattr(im,'TEMPLATE_%s' % object_subtype)()
            cybox_xml = template_obj.process_form(object_element).to_xml()
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
        POST = self.request.POST
        post_dict = parser.parse(POST.urlencode())
        observable_properties = post_dict.get('observable_properties', {})
        observable_properties['observable_id'] = post_dict.get('observable_id')
        observable_properties['I_object_display_name'] = 'NONE'
        observable_properties['I_icon'] = 'NONE'
        object_type = observable_properties.get('object_type', None)
        object_subtype = observable_properties.get('object_subtype', 'Default')

        if True: #try:
            im = importlib.import_module('mantis_authoring.cybox_object_transformers.' + object_type.lower())
            template_obj = getattr(im,'TEMPLATE_%s' % object_subtype)()

            form_class = template_obj.ObjectForm
            form = form_class(**self.get_form_kwargs(observable_properties,object_type=object_type,
                                                     object_subtype=object_subtype))
        #except:
        #    res = {
        #        'status': False,
        #        'msg': 'An error occured validating the object.',
        #        'data': None
        #    }
        #    return HttpResponse(json.dumps(res), content_type='application/json', )

        if form.is_valid():
            return self.form_valid(form)
        else:
            return self.form_invalid(form)

    def form_valid(self, form, *args, **kwargs):
        res = {
            'status': True,
            'msg': 'Validation successful',
            'data': None
        }
        return HttpResponse(json.dumps(res), content_type='application/json', )

    def form_invalid(self, form, *args, **kwargs):
        res = {
            'status': True,
            'msg': 'An error occured validating the object.',
            'data': self.errors_to_json(form.errors)
        }
        return HttpResponse(json.dumps(res), content_type='application/json', )





class GetObjectName(BasicJSONView):
    """
    View serving the name of a passed cybox object
    """
    @property
    def returned_obj(self):
        res = {
            'status': False,
            'msg': 'An error occurred building the name',
            'data': ''
        }
        POST = self.request.POST
        post_dict = parser.parse(POST.urlencode())

        object_element = post_dict.get('observable_properties', {})
        object_type = object_element.get('object_type', '').lower().strip()
        object_subtype = object_element.get('object_subtype', 'Default')

        try:
            im = importlib.import_module('mantis_authoring.cybox_object_transformers.' + object_type)
            template_obj = getattr(im,'TEMPLATE_%s' % object_subtype)()
            transform_result = template_obj.process_form(object_element,'dummy','dummy')
            if isinstance(transform_result,dict):
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
            res['msg'] = str(e)

        return res

