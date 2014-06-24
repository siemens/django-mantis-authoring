from .__object_base__ import *

import re
from lxml import etree
from base64 import b64encode

class file_analyzer(file_object):
    """
    Detects and returns either a YARA, SNORT, or IOC test mechanism.
    """

    object_classes = ['ioc', 'yara', 'snort']
    def test_object(self):
        
        file_content = self.get_file_content()

        # Try IOC
        try:
            xroot = etree.fromstring(file_content)
            # If the root looks like this, we are quite confident that this is a IOC file
            if xroot.tag.lower() == '{http://schemas.mandiant.com/2010/ioc}ioc':
                return 'ioc'
        except:
            pass

        # Try YARA
        reg = re.compile("^rule \w+$", re.IGNORECASE) # If a line starts with 'rule <some_name>', we think it's a yara file
        if reg.match(file_content):
            return 'yara'

        # Try SNORT
        reg = re.compile('^(alert|log|pass).*(->|<>|<-).*$', re.IGNORECASE)
        for l in file_content.splitlines():
            if reg.match(l):
                return 'snort'

        return False

    
    def process(self,**kwargs):
        res = {'status': False,
               'data': 'An error occured.'}

        ftype = self.test_object()

        file_content = self.get_file_content()

        if ftype=='ioc':
            try:
                xroot = etree.fromstring(file_content)
                #xroot_string = etree.tostring(xroot, encoding='UTF-8', xml_declaration=False)

                predef_id = xroot.get('id', None)
                if predef_id:
                    predef_id = '%s:Test_Mechanism-%s' % (kwargs['default_ns_slug'],predef_id)

                res['status'] = True
                res['object_class'] = ftype
                res['data'] = [{ 'object_class': 'testmechanism',
                                 'object_type': 'Test_Mechanism',
                                 'object_subtype': 'IOC',
                                 'object_id': predef_id,
                                 'properties': { 'ioc_xml': b64encode(file_content),
                                                 'ioc_title': self.file_name,
                                                 'ioc_description': ''
                                             }
                             }]
            except Exception as e:
                res['msg'] =  str(e)
                pass

        elif ftype=='snort':
            res['status'] = True
            res['object_class'] = ftype
            res['data'] = [{ 'object_class': 'testmechanism',
                             'object_type': 'Test_Mechanism',
                             'object_subtype': 'SNORT',
                             'object_id': False,
                             'properties': { 'snort_rules': b64encode(file_content),
                                             'snort_title': self.file_name,
                                             'snort_description': ''
                                         }
                             }]

        elif ftype=='yara':
            # TODO: STIX currently does not implement a YARA test mechanism. 
            # https://github.com/STIXProject/python-stix/tree/master/stix/extensions/test_mechanism
            pass

        return res

    
