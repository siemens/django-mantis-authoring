
from dingos.models import InfoObjectNaming, InfoObject, Fact

from dingos.core.utilities import set_dict
from mantis_stix_importer.importer import STIX_Import

importer = STIX_Import()


def name_cybox_obj(cybox_obj):
    """
    Derive name for CybOx object from XML

    When calling the to_xml function on a CybOx object from MITRE's API,
    it returns XML of the following form::

       <AddressObj:AddressObjectType
    	xmlns:dingos_author="cert.siemens.com"
    	xmlns:cyboxCommon="http://cybox.mitre.org/common-2"
	    xmlns:AddressObj="http://cybox.mitre.org/objects#AddressObject-2"
	    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
	    xsi:schemaLocation="http://cybox.mitre.org/common-2 http://cybox.mitre.org/XMLSchema/common/2.1/cybox_common.xsd http://cybox.mitre.org/objects#AddressObject-2 http://cybox.mitre.org/XMLSchema/objects/Address/2.1/Address_Object.xsd" xsi:type="AddressObj:AddressObjectType" category="ipv4-addr">
        <AddressObj:Address_Value condition="Equals">123.13</AddressObj:Address_Value>
       </AddressObj:AddressObjectType>


    We can use this XML to derive a name for the object by leveraging the naming mechanism
    for InfoObjects from Dingos as follows:

    - import XML with proper exporter, but instead of carrying out the import,
      continue working with the dictionary representation of the top-level object
    - flatten dictionary representation into fact list (simplisticly prepending 'Properties/'
      to every fact term, because in the actual XML, the object XML is embedded in a
      'Properties' element and the naming schemas for cybox object configured for DINGOS
       expect this element
    - call the naming routine from the InfoObject model.

    """

    import_result = importer.xml_import(xml_content=cybox_obj,
                                       return_dict_repr=True)

    dict_repr = import_result['dict_repr']


    fact_list =  dict_repr.flatten()[0]


    obj_type = dict_repr.get('@xsi:type').split(':')[1].split('Type')[0]


    # Trial in using derive_iobject_function for getting infoobject..
    #print "NAME"
    #print importer.derive_iobject_type(embedding_ns='',embedded_ns='AddressObj',elt_name='AddressObjectType')

    name_schemas = InfoObjectNaming.objects.filter(iobject_type__name=obj_type,
                                                   iobject_type__iobject_family__name='cybox.mitre.org'). \
        order_by('position').values_list('format_string', flat=True)

    fact_details_list = map(lambda x:{'node_id': x['node_id'],
                                      'fact_term': 'Properties/%s'% x['term'],
                                      'attribute': x['attribute'],
                                      'value': x['value'],
                                      },fact_list)

    name = InfoObject.name_from_facts(fact_details_list,name_schemas,default_name='InfoObject')

    return name

def find_similar_cybox_obj(cybox_obj,relevant_fact_term_list=None,limit=40):
    """
    Given a cybox object XML and a list or relevant fact terms, the function returns
    similar objects from the database (i.e., objects, that contain all the facts
    for the relevant fact terms as the given cybox object.

    Example: Assume, the XML is::

       ...
       <AddressObj:Address_Value condition="Equals">127.0.0.1</AddressObj:Address_Value>
       ...

    and you execute::

       find_similar_cybox_obj(<xml>,['Properties/Address_Value',
                                     'Properties/Address_Value@category'])

    then the function will return the first 40 objects that contain the following facts::

         Properties/Address_Value = 127.0.0.1
         Properties/Address_Value@condition = Equals

    """
    if not relevant_fact_term_list:
        return []

    import_result = importer.xml_import(xml_content=cybox_obj,
                                        return_dict_repr=True)
    dict_repr = import_result['dict_repr']
    fact_list =  dict_repr.flatten()[0]

    fact_dict = {}

    for fact in fact_list:
        if not fact['term']:
            term = 'Properties'
        else:
            term = 'Properties/%s' % fact['term']

        key = (term,fact['attribute'])
        if not key in fact_dict:
            fact_dict[key] = []
        if isinstance(fact['value'],list):
            fact_dict[key] = fact_dict[key] + fact['value']
        else:
            fact_dict[key].append(fact['value'])

    relevant_facts = []

    for fact_term in relevant_fact_term_list:
        if '@' in fact_term:
            fact_term = fact_term.split('@')
        else:
            fact_term = (fact_term,False)
        if fact_term in fact_dict:
            for value in fact_dict[fact_term]:
                relevant_facts.append((fact_term,value))


    objects = InfoObject.objects.all()

    for ((term,attribute),value) in relevant_facts:
        if not attribute:
            attribute = ''
        fact_query = Fact.objects.filter(fact_term__term=term,
                                         fact_term__attribute=attribute,
                                         fact_values__value__contains=value)

        objects = objects.filter(facts__in=fact_query)

    return objects[0:limit]


