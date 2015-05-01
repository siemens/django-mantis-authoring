#!/usr/bin/python
# -*- coding: utf-8 -*-

#
# Copyright (c) Siemens AG, 2014
#
# This file is part of MANTIS.  MANTIS is free software: you can
# redistribute it and/or modify it under the terms of the GNU General Public
# License as published by the Free Software Foundation; either version 2
# of the License, or(at your option) any later version.
#
# This program is distributed in the hope that it will be useful, but WITHOUT
# ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS
# FOR A PARTICULAR PURPOSE.  See the GNU General Public License for more
# details.
#
# You should have received a copy of the GNU General Public License along with
# this program; if not, write to the Free Software Foundation, Inc., 51
# Franklin Street, Fifth Floor, Boston, MA 02110-1301 USA.
#

import json, copy
from django.conf import settings
from django.core.exceptions import ObjectDoesNotExist
from django.db.models import Q
from django.http import HttpResponse

from .utilities import name_cybox_obj
from .view_classes import BasicSTIXPackageTemplateView
from CampaignIndicators import FormView as CIFormView, stixTransformer
from dingos import DINGOS_DEFAULT_ID_NAMESPACE_URI, DINGOS_TEMPLATE_FAMILY, DINGOS_INTERNAL_IOBJECT_FAMILY_NAME
from dingos.models import IdentifierNameSpace, InfoObject
from dingos_authoring.models import AuthoredData
from dingos.view_classes import BasicJSONView
from dingos_authoring.view_classes import BasicProcessingView, AuthoringMethodMixin, guiJSONimport
from dingos_authoring.views import GetDraftJSON
from mantis_stix_importer.importer import STIX_Import

import cybox, stix
from stix.campaign import Campaign, Names, Attribution
from stix.common import Identity
from stix.common import VocabString as StixVocabString
from stix.common.identity import RelatedIdentities
from stix.core import STIXPackage
from stix.threat_actor import ThreatActor
# 'Name' has been removed in STIX 1.1.1
try:
    from stix.campaign import VocabString as Name
except:
    from stix.campaign import Name

FORM_VIEW_NAME_CAMPAIGN = 'url.mantis_authoring.transformers.stix.ct_maintenance_campaign'
FORM_VIEW_NAME_THREATACTOR = 'url.mantis_authoring.transformers.stix.ct_maintenance_threatactor'


class FormView(BasicSTIXPackageTemplateView):

    template_name = 'mantis_authoring/%s/CampaignMaintenance.html' % DINGOS_TEMPLATE_FAMILY

    title = 'Campaign/ThreatActor Maintenance'

    def get_context_data(self, **kwargs):
        context = super(FormView, self).get_context_data(**kwargs)
        campaignForm = CIFormView.StixCampaign
        threatActorForm = CIFormView.StixThreatActor
        context['campaignForm'] = campaignForm
        context['threatActorForm'] = threatActorForm
        return context

    
class GetJsonCT(AuthoringMethodMixin,BasicJSONView):
    """
    View serving latest draft of given name, or respond with the list of available templates
    """
    
    modify_data = []
    @property
    def returned_obj(self):
        res = {
            'status': False,
            'msg': 'An error occured loading the requested template',
            'data': None
        }

        if not self.namespace_info:
            return res
        
        authoring_group = self.namespace_info['authoring_group']

        if 'list' in self.request.GET:
            json_obj_l = AuthoredData.objects.filter(
                kind = AuthoredData.AUTHORING_JSON,
                group = authoring_group,
                latest = True,
                author_view__name = self.author_view
            ).prefetch_related('identifier','group','user').prefetch_related('top_level_iobject',
                                                                             'top_level_iobject__identifier',
                                                                             'top_level_iobject__identifier__namespace')

            res['status'] = True
            res['msg'] = ''
            res['data'] = []
            for el in json_obj_l:
                nd = {
                    'id': el.identifier.name, 
                    'name': el.name,
                    'date': el.timestamp.strftime("%Y-%m-%d %H:%M")
                }
                for func in self.modify_data:
                    nd = func(nd, el)
                res['data'].append(nd)

        else:
            name = self.request.GET.get('name',False)
            try:
                json_obj = AuthoredData.objects.get(Q(kind=AuthoredData.AUTHORING_JSON,
                                                      group=authoring_group,
                                                      identifier__name=name,
                                                      latest=True,
                                                      ) )
            except ObjectDoesNotExist:
                res['msg'] = 'Could not access object %s of group %s' %(name,authoring_group)
                res['status'] = False
                return res
            except MultipleObjectsReturned:
                res['msg'] = """Something is wrong in the database: there are several "latest" objects
                                of group %s with identifier %s""" % (authoring_group,name)
                return res

            if not json_obj.user:
                json_obj = AuthoredData.object_copy(json_obj,user=self.request.user)
            elif json_obj.user and json_obj.user != self.request.user:
                if self.request.GET.get('force_take', 'false') == 'true':
                    if json_obj.status == AuthoredData.IMPORTED:
                        status = AuthoredData.UPDATE
                    else:
                        status = json_obj.status
                    json_obj = AuthoredData.object_copy(json_obj,user=self.request.user,status=status)
                else:
                    res['msg'] = "The report is currently assigned to user '%s'. If you want to edit it anyway, click the following link to claim the report. Be sure no one else is currently working on it: {force_take}" % (json_obj.user)
                    return res
                        

            res['data'] = {}
            res['data']['id'] = json_obj.identifier.name
            res['data']['name'] = json_obj.name
            res['data']['date'] = json_obj.timestamp.strftime("%Y-%m-%d %H:%M")
            res['data']['jsn'] = json_obj.content
            for func in self.modify_data:
                res['data'] = func(res['data'], json_obj)

            res['status'] = True
            res['msg'] = 'Loaded \'' + json_obj.name + '\''

        return res




class GetDraftThreatActor(GetJsonCT):
    author_view = FORM_VIEW_NAME_THREATACTOR
    def include_add_data(data_element, db_el):
        data_element['jsn'] = db_el.content
        data_element['import_status'] = db_el.status
        stat = stixThreatActorTransformer()
        try:
            ta_jsn = json.loads(data_element['jsn'])
        except:
            return data_element
        ta = stat.create_ta_obj(ta_jsn)
        xml = ta.to_xml()
        data_element['object_name'] = name_infoobject(xml)
        return data_element
    
    # Include additional fields in the listing
    modify_data = [include_add_data]

    
class GetDraftCampaign(GetJsonCT):
    author_view = FORM_VIEW_NAME_CAMPAIGN


    
    
class stixCampaignTransformer:
    """
    Implements the transformer used to transform the JSON produced by
    the GUI into a valid STIX document.
    """

    def __init__(self, *args,**kwargs):
        # Setup our namespace

        self.namespace_name = kwargs.get('namespace_uri', DINGOS_DEFAULT_ID_NAMESPACE_URI).decode('utf-8').encode('ascii')
        self.namespace_prefix = kwargs.get('namespace_slug', "dingos_default").decode('utf-8').encode('ascii')
        self.namespace_map = {self.namespace_name: self.namespace_prefix,
                              'http://data-marking.mitre.org/Marking-1': 'stixMarking',
                              }

        self.namespace = cybox.utils.Namespace(self.namespace_name, self.namespace_prefix)
        cybox.utils.set_id_namespace(self.namespace)
        stix.utils.set_id_namespace({self.namespace_name: self.namespace_prefix})


        # See if we have a passed JSON
        jsn = kwargs.get('jsn', None)
        if type(jsn) == dict:
            self.jsn = copy.deepcopy(jsn)
        else:
            try:
                self.jsn = json.loads(jsn)
            except:
                return None
        if not self.jsn:
            return None

        stat = stixThreatActorTransformer(namespace_uri=kwargs.get('namespace_uri', DINGOS_DEFAULT_ID_NAMESPACE_URI),
                                          namespace_slug=kwargs.get('namespace_slug', "dingos_default"))

        camp = Campaign()
        camp.id_ = stat.gen_slugged_id(self.jsn.get('id', ''))
        camp.names =  Names(Name(self.jsn.get('name', '')))
        camp.title = self.jsn.get('title','')
        camp.description = self.jsn.get('description', '')
        camp.status = StixVocabString(self.jsn.get('status', ''))

        authored_ta = self.jsn.get('authored_ta', {})

        # Get the authored TAs. We might need to import a TA if it's status is in draft
        authored_objects = dict()
        json_obj_l = AuthoredData.objects.filter(
            kind = AuthoredData.AUTHORING_JSON,
            #user = kwargs.get('request').user,
            group = kwargs.get('namespace_info').get('authoring_group'),
            #status = AuthoredData.DRAFT,
            latest = True,
            author_view__name = FORM_VIEW_NAME_THREATACTOR
        ).prefetch_related('identifier','group','user').prefetch_related('top_level_iobject',
                                                                         'top_level_iobject__identifier',
                                                                         'top_level_iobject__identifier__namespace')
        for ao in json_obj_l:
            ta_jsn = json.loads(ao.content)
            authored_objects[stat.gen_slugged_id(ta_jsn.get('id'))] = ao

        attrib = Attribution()
        # Depending on the action we do different things. If user wants to
        # import a report we might also have to import a TA which is currently
        # in DRAFT status.
        if kwargs.get('action') == 'import':
            # Check if we also need to import TAs. TAs only get referenced in
            # the campaign so we can update them independently.
            for ta_id, _ta_bool in self.jsn.get('referenced_ta').iteritems():
                ta_id = stat.gen_slugged_id(ta_id)
                if ta_id in authored_objects:
                    if authored_objects[ta_id].status == AuthoredData.DRAFT:
                        ta_res = guiJSONimport(stixThreatActorTransformer,
                                      FORM_VIEW_NAME_THREATACTOR,
                                      STIX_Import,
                                      authored_objects[ta_id].content,
                                      kwargs.get('namespace_info'),
                                      authored_objects[ta_id].name,
                                      kwargs.get('request').user,
                                      authored_objects[ta_id].identifier,
                                      'import',
                                      None,
                                      kwargs.get('request') )
                        #AuthoredData.object_copy(authored_objects[ta_id], user= None)
                        
                ta = ThreatActor()
                ta.idref = stat.gen_slugged_id(ta_id)
                ta.timestamp=None
                ta.id_ = None
                attrib.append(ta)
            
            pass
        else:
            # ...otherwise we include the TA. Either as a reference (if not
            # within the authored objects), or directly
            for ta_id, _ta_bool in self.jsn.get('referenced_ta').iteritems():
                ta_id = stat.gen_slugged_id(ta_id)
                if ta_id in authored_objects:
                    ta_jsn = json.loads(authored_objects[ta_id].content)
                    ta = stat.create_ta_obj(ta_jsn)
                else:
                    ta = ThreatActor()
                    ta.idref = stat.gen_slugged_id(ta_id)
                    ta.timestamp=None
                    ta.id_ = None
                attrib.append(ta)

        camp.attribution.append(attrib)

        # Wrap it in a STIX package
        stix_package = STIXPackage(id_=camp.id_.replace('campaign-', 'Package-'))
        stix_package.campaigns.append(camp)

        self.stix_package = stix_package.to_xml(ns_dict=self.namespace_map,
                                                auto_namespace=True)


    def getStix(self):
        try:
            return self.stix_package
        except:
            return None


class CampaignProcessingView(BasicProcessingView):
    author_view = FORM_VIEW_NAME_CAMPAIGN
    transformer = stixCampaignTransformer
    importer_class = STIX_Import





class stixThreatActorTransformer:
    """
    Implements the transformer used to transform the JSON produced by
    the GUI into a valid STIX document.
    """

    def __init__(self, *args,**kwargs):
        # Setup our namespace

        self.namespace_name = kwargs.get('namespace_uri', DINGOS_DEFAULT_ID_NAMESPACE_URI).decode('utf-8').encode('ascii')
        self.namespace_prefix = kwargs.get('namespace_slug', "dingos_default").decode('utf-8').encode('ascii')
        self.namespace_map = {self.namespace_name: self.namespace_prefix,
                              'http://data-marking.mitre.org/Marking-1': 'stixMarking',
                              }

        self.namespace = cybox.utils.Namespace(self.namespace_name, self.namespace_prefix)
        cybox.utils.set_id_namespace(self.namespace)
        stix.utils.set_id_namespace({self.namespace_name: self.namespace_prefix})

        # See if we have a passed JSON
        jsn = kwargs.get('jsn', None)
        if type(jsn) == dict:
            self.jsn = copy.deepcopy(jsn)
        else:
            try:
                self.jsn = json.loads(jsn)
            except:
                return None
        if not self.jsn:
            return None

        form = CIFormView.StixThreatActor(self.jsn)
        if not form.is_valid():
            raise Exception('ThreatActor not valid.')

        # Create the package
        ta = self.create_ta_obj(self.jsn)
        stix_package = STIXPackage(id_=self.jsn.get('id').replace('threatactor-', 'Package-'),
                                   threat_actors=ta)
        self.stix_package = stix_package.to_xml(ns_dict=self.namespace_map,
                                                auto_namespace=True)

        
        
    def gen_slugged_id(self,id_string):
        ret = ''

        if not id_string:
            ret = id_string
        elif '{' in id_string:
            ns_uri,uid = tuple(id_string[1:].split('}',1))
            if ns_uri in self.namespace_map:
                ret = "%s:%s" % (self.namespace_map[ns_uri],uid)
            else:
                try:
                    ns_slug = IdentifierNameSpace.objects.get(uri=ns_uri).name
                except ObjectDoesNotExist:
                    ns_slug = "authoring"
                if not ns_slug:
                    ns_slug = "authoring"

                if ns_slug in self.namespace_map.values():
                    counter = 0
                    while "%s%d" % (ns_slug,counter) in self.namespace_map.values():
                        counter +=1
                    ns_slug = "%s%d" % (ns_slug,counter)
                self.namespace_map[ns_uri] = ns_slug
                ret = "%s:%s" % (ns_slug,uid)
        else:
            ret = id_string

        if ret:
            return ret.decode('utf-8').encode('ascii')
        return id_string


    def create_ta_obj(self, threatactor):
        """ Transform a passed json data structure to a STIX object"""
        cybox.utils.set_id_namespace(self.namespace)
        stix.utils.set_id_namespace({self.namespace_name: self.namespace_prefix})

        
        # New TA
        tac = ThreatActor()
        tac.id_ = self.gen_slugged_id(threatactor.get('id', ''))
        tac_id = tac.id_

        identity_id_format_string = tac_id.replace('threatactor','threatactor-id-%d')

        related_identities = []
        tac.identity = Identity(id_=identity_id_format_string % 0, idref=None, name=threatactor.get('identity_name', ''))

        related_identities = []
        counter = 1
        for ia in threatactor.get('identity_aliases', '').split('\n'):
            related_identities.append(Identity(id_=identity_id_format_string % counter, idref=None, name=ia.strip('\n').strip('\r').strip()))
            counter += 1
            tac.identity.related_identities = RelatedIdentities(related_identities)

        tac.title = threatactor.get('title', '')
        tac.description = threatactor.get('description', '')
        return tac        
        
        
    def getStix(self):
        try:
            return self.stix_package
        except:
            return None
           
class ThreatActorProcessingView(BasicProcessingView):
    author_view = FORM_VIEW_NAME_THREATACTOR
    transformer = stixThreatActorTransformer
    importer_class = STIX_Import




            







class GetRefThreatActors(BasicJSONView):
    """
    View serving all ThreatActors (references to existing ones)
    """
    @property
    def returned_obj(self):
        res = {
            'status': False,
            'msg': 'An error occured',
            'data': []
        }

        q_q = Q(iobject_type__name__icontains="ThreatActor")
        data =  InfoObject.objects.all(). \
                exclude(latest_of=None). \
                exclude(iobject_family__name__exact=DINGOS_INTERNAL_IOBJECT_FAMILY_NAME). \
                exclude(iobject_family__name__exact='ioc'). \
                filter(q_q). \
                distinct().order_by('name')[:10]


        res['data'] = map(lambda x : {'id': "{%s}%s" % (x.identifier.namespace.uri,x.identifier.uid),
                                      'ns': x.identifier.namespace.uri,
                                      'name': x.name,
                                      'cat': str(x.iobject_type)}, data)

        res['status'] = True

        return res











from mantis_stix_importer.importer import STIX_Import
from dingos.models import InfoObjectNaming
def name_infoobject(xml):

    importer = STIX_Import()

    import_result = importer.xml_import(xml_content=xml,
                                       return_dict_repr=True)

    dict_repr = import_result['dict_repr']
    fact_list =  dict_repr.flatten()[0]
    obj_type = dict_repr.get('@xsi:type').split(':')[1].split('Type')[0]

    name_schemas = InfoObjectNaming.objects.filter(iobject_type__name=obj_type). \
                   order_by('position').values_list('format_string', flat=True)

    fact_details_list = map(lambda x:{'node_id': x['node_id'],
                                      'fact_term': x['term'],
                                      'attribute': x['attribute'],
                                      'value': x['value'],
                                      },fact_list)
    name = InfoObject.name_from_facts(fact_details_list,name_schemas,default_name='InfoObject')
    return name
