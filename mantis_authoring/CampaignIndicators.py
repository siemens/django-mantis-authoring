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




import re
import sys, datetime
import json, pytz
import importlib, uuid

from lxml import etree
from StringIO import StringIO
from base64 import b64decode

from cybox.core import Observable, Observables
from cybox.common import Hash, String, Time, ToolInformation, ToolInformationList, ObjectProperties, DateTime
import cybox.utils

from stix.indicator import Indicator
from stix.extensions.test_mechanism.open_ioc_2010_test_mechanism import OpenIOCTestMechanism
from stix.extensions.test_mechanism.snort_test_mechanism import SnortTestMechanism
from stix.campaign import Campaign, AssociatedCampaigns, Names, Name
from stix.threat_actor import ThreatActor
from stix.core import STIXPackage, STIXHeader
from stix.common import InformationSource, Confidence, Identity, Activity, DateTimeWithPrecision, StructuredText as StixStructuredText, VocabString as StixVocabString
from stix.common.identity import RelatedIdentities
from stix.common.related import RelatedCampaign
from stix.extensions.marking.tlp import TLPMarkingStructure
from stix.data_marking import Marking, MarkingSpecification
from stix.bindings.extensions.marking.tlp import TLPMarkingStructureType
import stix.utils

from django import forms

from dingos import DINGOS_DEFAULT_ID_NAMESPACE_URI, DINGOS_TEMPLATE_FAMILY

from .view_classes import BasicSTIXPackageTemplateView

from mantis_stix_importer.importer import STIX_Import

from dingos_authoring.view_classes import BasicProcessingView

from django.templatetags.static import static


FORM_VIEW_NAME = 'url.mantis_authoring.transformers.stix.campaing_indicators'

class FormView(BasicSTIXPackageTemplateView):

    template_name = 'mantis_authoring/%s/CampaignIndicators.html' % DINGOS_TEMPLATE_FAMILY

    title = 'Campaign Indicator'

    """
    Classes describe front-end elements. Element properties then show up in the resulting JSON as properties.
    Properties with a leading 'I_' will not be converted to JSON
    """



    class StixThreatActor(forms.Form):
        CONFIDENCE_TYPES = (
            ('High', 'High'),
            ('Medium', 'Medium'),
            ('Low', 'Low'),
            ('None', 'None'),
            ('Unknown', 'Unknown')
        )
        object_type = forms.CharField(initial="ThreatActor", widget=forms.HiddenInput)
        I_object_display_name = forms.CharField(initial="Threat Actor", widget=forms.HiddenInput)
        I_icon =  forms.CharField(initial=static('img/stix/threat_actor.svg'), widget=forms.HiddenInput)
        identity_name = forms.CharField(max_length=1024, help_text="Required if Campaign/ThreatActor should be generated")
        identity_aliases = forms.CharField(widget=forms.Textarea(attrs={'placeholder': 'Line by line aliases of this threat actor'}), required=False, )
        title = forms.CharField(max_length=1024)
        description = forms.CharField(widget=forms.Textarea, required=False)
        confidence = forms.ChoiceField(choices=CONFIDENCE_TYPES, required=False, initial="med")
        #information_source = forms.CharField(max_length=1024)


    class StixThreatActorReference(forms.Form):
        object_type = forms.CharField(initial="ThreatActorReference", widget=forms.HiddenInput)
        I_object_display_name = forms.CharField(initial="Threat Actor Reference", widget=forms.HiddenInput)
        I_icon =  forms.CharField(initial=static('img/stix/threat_actor.svg'), widget=forms.HiddenInput)
        object_id =  forms.CharField(initial='', widget=forms.HiddenInput)


    class StixCampaign(forms.Form):
        STATUS_TYPES = (
            ('Success', 'Success'),
            ('Fail', 'Fail'),
            ('Error', 'Error'),
            ('Complete/Finish', 'Complete/Finish'),
            ('Pending', 'Pending'),
            ('Ongoing', 'Ongoing'),
            ('Unknown', 'Unknown')
        )
        CONFIDENCE_TYPES = (
            ('High', 'High'),
            ('Medium', 'Medium'),
            ('Low', 'Low'),
            ('None', 'None'),
            ('Unknown', 'Unknown')
        )
        HANDLING_TYPES = (
            ('WHITE', 'White'),
            ('GREEN', 'Green'),
            ('AMBER', 'Amber'),
            ('RED', 'Red')
        )
        object_type = forms.CharField(initial="Campaign", widget=forms.HiddenInput)
        I_object_display_name = forms.CharField(initial="Campaign", widget=forms.HiddenInput)
        I_icon =  forms.CharField(initial=static('img/stix/campaign.svg'), widget=forms.HiddenInput)
        name = forms.CharField(max_length=1024, help_text="Required if Campaign/ThreatActor should be generated")
        title = forms.CharField(max_length=1024)
        description = forms.CharField(widget=forms.Textarea, required=False)
        status = forms.ChoiceField(choices=STATUS_TYPES, required=False, initial="Unknown")
        activity_timestamp_from = forms.CharField(max_length=1024)
        activity_timestamp_to = forms.CharField(max_length=1024)
        confidence = forms.ChoiceField(choices=CONFIDENCE_TYPES, required=False, initial="med")
        handling = forms.ChoiceField(choices=HANDLING_TYPES, required=False, initial="amber")
        #information_source = forms.CharField(max_length=1024)


    class StixCampaignReference(forms.Form):
        object_type = forms.CharField(initial="CampaignReference", widget=forms.HiddenInput)
        I_object_display_name = forms.CharField(initial="Campaign Reference", widget=forms.HiddenInput)
        I_icon =  forms.CharField(initial=static('img/stix/campaign.svg'), widget=forms.HiddenInput)
        object_id =  forms.CharField(initial='', widget=forms.HiddenInput)


    class StixIndicator(forms.Form):
        CONFIDENCE_TYPES = (
            ('High', 'High'),
            ('Medium', 'Medium'),
            ('Low', 'Low'),
            ('None', 'None'),
            ('Unknown', 'Unknown')
        )
        object_type = forms.CharField(initial="Indicator", widget=forms.HiddenInput)
        I_object_display_name = forms.CharField(initial="Indicator", widget=forms.HiddenInput)
        I_icon =  forms.CharField(initial=static('img/stix/indicator.svg'), widget=forms.HiddenInput)
        indicator_producer = forms.CharField(max_length=1024)
        indicator_title = forms.CharField(max_length=1024)
        indicator_description = forms.CharField(widget=forms.Textarea, required=False)
        indicator_confidence = forms.ChoiceField(choices=CONFIDENCE_TYPES, required=False, initial="med")


    class TestMechanismIOC(forms.Form):
        object_type = forms.CharField(initial="Test_Mechanism", widget=forms.HiddenInput)
        object_subtype = forms.CharField(initial="IOC", widget=forms.HiddenInput)
        I_icon =  forms.CharField(initial=static(''), widget=forms.HiddenInput)
        ioc_xml = forms.CharField(initial="", widget=forms.HiddenInput)
        ioc_title = forms.CharField(max_length=1024)
        ioc_description = forms.CharField(widget=forms.Textarea, required=False)

    class TestMechanismYara(forms.Form):
        object_type = forms.CharField(initial="Test_Mechanism", widget=forms.HiddenInput)
        object_subtype = forms.CharField(initial="YARA", widget=forms.HiddenInput)
        I_icon =  forms.CharField(initial=static(''), widget=forms.HiddenInput)
        yara_rules = forms.CharField(initial="", widget=forms.HiddenInput)
        yara_title = forms.CharField(max_length=1024)
        yara_description = forms.CharField(widget=forms.Textarea, required=False)

    class TestMechanismSnort(forms.Form):
        object_type = forms.CharField(initial="Test_Mechanism", widget=forms.HiddenInput)
        object_subtype = forms.CharField(initial="SNORT", widget=forms.HiddenInput)
        I_icon =  forms.CharField(initial=static(''), widget=forms.HiddenInput)
        snort_rules = forms.CharField(initial="", widget=forms.HiddenInput)
        snort_title = forms.CharField(max_length=1024)
        snort_description = forms.CharField(widget=forms.Textarea, required=False)



    """
    Edit view for STIX object describing indicators for a given campaign.
    """
    def get_context_data(self, **kwargs):
        context = super(FormView, self).get_context_data(**kwargs)

        indicatorForms = [self.StixIndicator]
        campaignForms = [self.StixCampaign, self.StixCampaignReference]
        threatActorForms = [self.StixThreatActor, self.StixThreatActorReference]
        testMechanismForms = [self.TestMechanismIOC, self.TestMechanismSnort]

        context['indicatorForms'] = indicatorForms
        context['campaignForms'] = campaignForms
        context['threatActorForms'] = threatActorForms
        context['testMechanismForms'] = testMechanismForms

        return context




class stixTransformer:
    """
    Implements the transformer used to transform the JSON produced by
    the MANTIS Authoring GUI into a valid STIX document.
    """
    def __init__(self, *args,**kwargs):

        # Setup our namespace
        self.namespace_name = kwargs.get('namespace_uri', DINGOS_DEFAULT_ID_NAMESPACE_URI)
        self.namespace_prefix = kwargs.get('namespace_slug', "dingos_default")
        self.namespace = cybox.utils.Namespace(self.namespace_name, self.namespace_prefix)
        cybox.utils.set_id_namespace(self.namespace)
        stix.utils.set_id_namespace({self.namespace_name: self.namespace_prefix})

        # See if we have a passed JSON
        jsn = kwargs['jsn']
        if type(jsn) == dict:
            self.jsn = jsn
        else:
            try:
                self.jsn = json.loads(jsn)
            except:
                print 'Error parsing provided JSON'
                return None
        if not self.jsn:
            return None

        # Some defaults
        self.stix_header = {}
        self.stix_indicators = []
        self.test_mechanisms = []
        self.campaign = None
        self.threatactor = None
        self.indicators = {}
        self.observables = {}
        self.old_observable_mapping = {}
        self.cybox_observable_list = None
        self.cybox_observable_references = []

        # Now process the parts
        self.__process_observables()
        self.__process_test_mechanisms()
        self.__process_indicators()
        self.__process_campaigns()
        self.__create_stix_package()

    def __process_campaigns(self):
        """
        Processes the campaigns JSON part
        """
        try:
            campaign = self.jsn['campaign']
        except:
            print "Error. No threat campaigns passed."
            return


        try:
            threatactor = campaign['threatactor']
        except:
            print "Error. No threat actor passed."
            return
        
        # The campaign
        if campaign.get('object_type') == 'CampaignReference':
            camp = Campaign()
            camp.idref = campaign.get('object_id', '')
            camp._id = None
            self.campaign = camp
        elif campaign.get('name','').strip() != '':
            camp = Campaign()
            camp.names =  Names(Name(campaign.get('name', '')))
            camp.title = campaign.get('title','')
            camp.description = campaign.get('description', '')
            camp.confidence = Confidence(campaign.get('confidence', ''))
            camp.handling = TLPMarkingStructure()
            camp.handling.color = campaign.get('handling', '')
            #camp.information_source = InformationSource()
            #camp.information_source.description = campaign.get('information_source', '')
            camp.status = StixVocabString(campaign.get('status', ''))
            afrom = Activity()
            afrom.date_time = DateTimeWithPrecision(value=campaign.get('activity_timestamp_from', ''), precision="minute")
            afrom.description = StixStructuredText('Timestamp from')
            ato = Activity()
            ato.date_time = DateTimeWithPrecision(value=campaign.get('activity_timestamp_to', ''), precision="minute")
            ato.description = StixStructuredText('Timestamp to')
            camp.activity = [afrom, ato]
            self.campaign = camp
            

        if threatactor.get('object_type') == 'ThreatActorReference':
            tac = ThreatActor()
            tac.idref = threatactor.get('object_id', '')
            tac._id = None
            if self.campaign:
                tac.associated_campaigns = camp
            self.threatactor = tac
        elif threatactor.get('identity_name', '').strip() != '' and self.campaign:
            tac = ThreatActor()
            related_identities = []
            for ia in threatactor.get('identity_aliases', '').split('\n'):
                related_identities.append(Identity(None, None, ia.strip('\n').strip('\r').strip()))
            tac.identity = Identity(None, None, threatactor.get('identity_name', ''))
            tac.identity.related_identities = RelatedIdentities(related_identities)
            tac.title = String(threatactor.get('title', ''))
            tac.description = StixStructuredText(threatactor.get('description', ''))
            #tac.information_source = InformationSource()
            #tac.information_source.description = threatactor.get('information_source', '')
            tac.confidence = Confidence(threatactor.get('confidence', ''))
            if self.campaign:
                tac.associated_campaigns = camp
            self.threatactor = tac



    def __create_test_mechanism_object(self, test):
        """
        Helper function which creates a test mechansim object according to the passed object type.
        'full' specifies if the structure should be filled, otherweise an empty object is returned (used for referencing)
        """

        tm = False

        if test['object_subtype'] == 'IOC':
            tm = OpenIOCTestMechanism(test['test_mechanism_id'])
            try:
                ioc = test['ioc_xml']
                ioc_xml = etree.parse(StringIO(b64decode(ioc)))
                tm.ioc = ioc_xml
            except Exception as e:
                print 'XML of "%s" not valid: %s' % (test['ioc_title'], str(e))

        elif test['object_subtype'] == 'SNORT':
            tm = SnortTestMechanism(test['test_mechanism_id'])
            tm.rules = b64decode(test['snort_rules']).splitlines()

        return tm



    def __process_test_mechanisms(self):
        """
        Processes the test mechanisms from the JSON.
        """
        try:
            tests = self.jsn['test_mechanisms']
        except:
            print "Error. No test mechanisms passed."
            return


        for test in tests:
            tm = self.__create_test_mechanism_object(test)
            if tm:
                self.test_mechanisms.append(tm)



    def __process_observables(self):
        """
        Processes the observables JSON part and produces a list of observables.
        """
        try:
            observables = self.jsn['observables']
        except:
            print "Error. No observables passed."
            return

        cybox_observable_dict = {}
        relations = {}


        # First collect all object relations.
        for obs in observables:
            relations[obs['observable_id']] = obs['related_observables']

        for obs in observables:
            object_type = obs['observable_properties']['object_type']
            #object_subtype = obs['observable_properties']['object_subtype']
            object_subtype = obs.get('object_subtype', 'Default')

            im = importlib.import_module('mantis_authoring.cybox_object_transformers.' + object_type.lower())
            template_obj = getattr(im,'TEMPLATE_%s' % object_subtype)()
            try:
                cybox_obs = template_obj.process_form(obs['observable_properties'])
                if cybox_obs==None:
                    self.cybox_observable_references.append(obs['observable_id'])
                    continue
            except:
                continue

            if type(cybox_obs)==list: # We have multiple objects as result. We now need to create new ids and update the relations
                old_id = obs['observable_id']
                new_ids = []
                translations = {} # used to keep track of which new __ id was translated
                for no in cybox_obs:
                    _tmp_id = '__' + str(uuid.uuid4())
                    cybox_observable_dict[_tmp_id] = no
                    new_ids.append(_tmp_id)
                    translations[_tmp_id] = old_id

                # Now find references to the old observable_id and replace with relations to the new ids.
                # Instead of manipulation the ids, we just generate a new array of relations

                new_relations = {}
                for obs_id, obs_rel in relations.iteritems():
                    if obs_id==old_id: # our old object has relations to other objects
                        for ni in new_ids: # for each new key ...
                            new_relations[ni] = {}
                            for ork, orv in obs_rel.iteritems(): # ... we insert the new relations
                                if ork==old_id: # skip entries where we reference ourselfs
                                    continue
                                new_relations[ni][ork] = orv
                    else: # our old object might be referenced by another one
                        new_relations[obs_id] = {} #create old key
                        #try to find relations to our old object...
                        for ork, orv in obs_rel.iteritems():
                            if ork==old_id: # Reference to our old key...
                                for ni in new_ids: #..insert relation to each new key
                                    new_relations[obs_id][ni] = orv
                            else: #just insert. this has nothing to do with our old key
                                new_relations[obs_id][ork] = orv

                relations = new_relations

            else: # only one object. No need to adjust relations or ids
                cybox_observable_dict[obs['observable_id']] = cybox_obs


        # Observables and relations are now processed. The only
        # thing left is to include the relation into the actual
        # objects.
        self.cybox_observable_list = []
        for obs_id, obs in cybox_observable_dict.iteritems():
            for rel_id, rel_type in relations[obs_id].iteritems():
                related_object = cybox_observable_dict[rel_id]
                if not related_object: # This might happen if a observable was not generated(because data was missing); TODO!                
                    continue
                obs.add_related(related_object, rel_type, inline=False)
            if not obs_id.startswith('__'): # If this is not a generated object we keep the observable id!                                   
		obs = Observable(obs, obs_id)
            else:
                obs = Observable(obs)
                self.old_observable_mapping[obs.id_] = translations[obs_id]

            self.cybox_observable_list.append(obs)


        return self.cybox_observable_list


        # Observables and relations are now processed. The only
        # thing left is to include the relation into the actual
        # objects.
        self.cybox_observable_list = []
        for obs_id, obs in cybox_observable_dict.iteritems():
            for rel_id, rel_type in relations[obs_id].iteritems():
                related_object = cybox_observable_dict[rel_id]
                if not related_object: # This might happen if a observable was not generated(because data was missing); TODO!
                    continue
                obs.add_related(related_object, rel_type, inline=False)
            if not obs_id.startswith('__'): # If this is not a generated object we keep the observable id!
		obs = Observable(obs, obs_id)
            else:
                obs = Observable(obs)
                self.old_observable_mapping[obs.id_] = translations[obs_id]

            self.cybox_observable_list.append(obs)

	return self.cybox_observable_list




    def __create_stix_indicator(self, indicator):
        """
        Helper function to create an Indicator object
        """
        stix_indicator = Indicator(indicator['indicator_id'])
        stix_indicator.title = String(indicator['indicator_title'])
        stix_indicator.description = String(indicator['indicator_description'])
        stix_indicator.confidence = Confidence(indicator['indicator_confidence'])
        #stix_indicator.indicator_types = String(indicator['object_type'])
        return stix_indicator



    def __process_indicators(self):
        """
        Processes the indicator JSON part. Sets the stix_indicators
        which be picked up by the create_stix_package. (observables
        referenced in an indicator will be included there while loose
        observables are not inlcluded in any indicator and will just
        be appended to the package by create_stix_package)
        """


        indicators = self.jsn['indicators']
        already_included_tests = [] # used to record already included test_mechanisms so we dont insert doubles but references to the already inserted ones

        self.stix_indicators = []

        for indicator in indicators:
            stix_indicator = self.__create_stix_indicator(indicator)
            related_observables = indicator['related_observables']
            related_test_mechanisms = indicator['related_test_mechanisms']

            # Add the observables to the indicator
            for observable in self.cybox_observable_list:
                check_obs_id = observable.id_
                # if we have autogenerated observables, we check against the OLD id the item had before generating new ones
                if check_obs_id in self.old_observable_mapping.keys():
                    check_obs_id = self.old_observable_mapping[observable.id_]

                if check_obs_id in related_observables:
                    obs_rel = Observable()
                    obs_rel.idref = observable.id_
                    obs_rel.id_ = None
                    stix_indicator.add_observable(obs_rel)

            # Add observable references to the indicator
            for obs_ref in self.cybox_observable_references:
                obs_rel = Observable()
                obs_rel.idref = obs_ref
                obs_rel.id_ = None
                stix_indicator.add_observable(obs_rel)

            # Add the test mechanisms to the indicator
            for tm in self.test_mechanisms:
                check_tes_id = tm.id_
                if check_tes_id in related_test_mechanisms:
                    # If we already included this test, we only reference it
                    if check_tes_id in already_included_tests:
                        test_mechanism_ref = tm.__class__()
                        test_mechanism_ref.id_ = None
                        test_mechanism_ref.idref = check_tes_id
                        stix_indicator.add_test_mechanism(test_mechanism_ref)
                    else:
                        stix_indicator.add_test_mechanism(tm)
                        already_included_tests.append(check_tes_id)

            self.stix_indicators.append(stix_indicator)


    def __create_stix_package(self):
        """
        Creates the STIX XML. __process_observables and __process_indicators must be called before
        """
        try:
            stix_properties = self.jsn['stix_header']
            observables = self.jsn['observables']
        except:
            print "Error. No header passed."
            return

        stix_indicators = self.stix_indicators

        #stix_id_generator = stix.utils.IDGenerator(namespace={self.namespace_name: self.namespace_prefix})
        #stix_id = stix_id_generator.create_id()
        stix_id = stix_properties['stix_package_id']
        #spec = MarkingSpecificationType(idref=stix_id)
        spec = MarkingSpecification()
        #spec.idref = stix_id
        #spec.set_Controlled_Structure("//node()")
        spec.controlled_structure = "//node()"
        #tlpmark = TLPMarkingStructureType()
        #tlpmark.set_color(stix_properties['stix_header_tlp'])
        tlpmark = TLPMarkingStructure()
        tlpmark.color = stix_properties['stix_header_tlp']
        #spec.set_Marking_Structure([tlpmark])
        spec.marking_structure = [tlpmark]
        stix_package = STIXPackage(indicators=stix_indicators, observables=Observables(self.cybox_observable_list), id_=stix_id, threat_actors=self.threatactor)
        stix_header = STIXHeader()
        stix_header.title = stix_properties['stix_header_title']
        stix_header.description = stix_properties['stix_header_description']
        stix_header.handling = Marking([spec])
        stix_information_source = InformationSource()
        stix_information_source.time = Time(produced_time=datetime.datetime.now(pytz.timezone('Europe/Berlin')).isoformat())
        stix_information_source.tools = ToolInformationList([ToolInformation(tool_name="Mantis Authoring GUI", tool_vendor="Siemens CERT")])
        stix_header.information_source = stix_information_source
        stix_package.stix_header = stix_header
        self.stix_package = stix_package.to_xml(ns_dict={'http://data-marking.mitre.org/Marking-1': 'stixMarking'})
        return self.stix_package



    def getStix(self):
        try:
            return self.stix_package
        except:
            return None


class ProcessingView(BasicProcessingView):

    author_view = FORM_VIEW_NAME
    transformer = stixTransformer
    importer_class = STIX_Import

if __name__ == '__main__':
    fn = sys.argv[1]
    with open(fn) as fp:
        jsn = json.load(fp)

    if jsn:
        t = Transformer.stixTransformer(jsn=jsn)
        print t.run()
