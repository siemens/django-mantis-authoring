from .__object_base__ import *

import re
import xlrd
import csv
import StringIO

from dingos.models import IdentifierNameSpace

class file_analyzer(file_object):
    """
    Returns a bulk set of indicators from the file and groups it according to the SOURCE column.
    """
    object_classes = ['indicator_list']

    object_type_mapping = {
        'ARTIFACT': 'artifact',
        'IP': 'address',
        'HASH': 'file',
        'FILENAME': 'file',
        'EMAIL_FROM': 'emailmessage',
        'EMAIL_TO': 'emailmessage',
        'URI': 'uri',
        'FQDN': 'uri',
        'WINSERVICE': 'winservice',
        'USERAGENT': 'httpsession'
        }
    required_columns = ['TYPE', 'VALUE', 'SOURCE']
    optional_columns = ['TIME', 'DESCRIPTION']
    column_index = {}
    file_type = ''

    def determine_column_placement(self, first_row):
        # Check for required columns. If one is missing we return immediately
        # Otherwise we remember the place of the column
        columns_ok = True
        self.column_index = dict()
        fr = [x.upper() for x in first_row]
        for rc in self.required_columns:
            if rc not in fr:
                columns_ok = False
            else:
                self.column_index[rc] = fr.index(rc)
        for rc in self.optional_columns:
            if rc in fr:
                self.column_index[rc] = fr.index(rc)
        return columns_ok

    def yield_row(self):
        file_content = self.get_file_content()

        if self.file_type == 'excel':
            # yield excel rows
            book = xlrd.open_workbook(file_contents = file_content)
            fs = book.sheet_by_index(0)
            
            for row_index in xrange(1, fs.nrows):
                row =  fs.row(row_index)
                r = {}
                for col_name, col_index in self.column_index.iteritems():
                    r[col_name] = ''
                    try:
                        r[col_name] = row[col_index].value
                    except:
                        pass
                yield r
                
                # yield {col_name: fs.cell(row_index, col_index).value
                #        for col_name, col_index in self.column_index.iteritems()}
 
                
        if self.file_type == 'csv':
            # yield csv rows
            f = StringIO.StringIO(file_content)
            dialect = csv.Sniffer().sniff(f.readline())
            # f.seek(0) We dont seek back to the beginning, so we can skip the headline
            reader = csv.reader(f, delimiter=dialect.delimiter, quotechar=dialect.quotechar)
            for row in reader:
                try:
                    yield {col_name: row[col_index]
                           for col_name, col_index in self.column_index.iteritems()}
                except:
                    # Skip this row on index access problem (empty rows etc.)
                    continue
            pass
    
    def test_object(self):
        
        file_content = self.get_file_content()

        # Try to read Excel
        try:
            book = xlrd.open_workbook(file_contents = file_content)
            # We only parse the first sheet
            fs = book.sheet_by_index(0)
            if not self.determine_column_placement(fs.row_values(0)):
                return False
            self.file_type = 'excel'
            # TODO: maybe check if there is data in the table

            return 'indicator_list'
        except Exception as e:
            pass

        # Try to read CSV
        try:
            f = StringIO.StringIO(file_content)
            dialect = csv.Sniffer().sniff(f.readline())
            f.seek(0)
            reader = csv.reader(f, delimiter=dialect.delimiter, quotechar=dialect.quotechar)
            for row in reader:
                if not self.determine_column_placement(row):
                    return False
                # We just read the first row
                break
            self.file_type = 'csv'
            return 'indicator_list'
        except Exception as e:
            pass
        
        return False

    
    def process(self,**kwargs):
        ns_info = kwargs['ns_info']
        res = {'status': False,
               'data': 'An error occured.'}
        res['object_class'] = self.test_object()
        res['data'] = []

        # Get all known namespaces. We need those to match the allowed
        # namespaces of the user
        all_namespaces = {}
        for ns in IdentifierNameSpace.objects.all():
            all_namespaces[ns.name.lower()] = ns.uri
            
        # In this we collect the indicators we need to crate in the front-end
        new_indicators = {}

        # Add the observables to the result
        for row in self.yield_row():
            object_type = self.map_object_type(row['TYPE'])
            if not object_type:
                continue

            object_namespace = row['SOURCE']
            ns_long = all_namespaces.get(row['SOURCE'].lower(), None)
            # Namespace does not exits?
            if not ns_long:
                continue
            # User has no permission to author this NS?
            if not ns_long in ns_info['allowed_ns_uris']:
                continue
            
            new_indicators[ns_long] = True
            res['data'].append({
                'object_class': 'observable',
                'object_type': object_type,
                'object_subtype': 'Default',
                'properties': self.create_object_properties(row),
                'object_namespace': ns_long
            });

        # Add the indicators to the result
        for ni in new_indicators:
            res['data'].append({
                'object_class': 'indicator',
                'object_type': 'Indicator',
                'object_subtype': '',
                'object_namespace': ni,
                'properties': {
                    # We default to low confidence on these
                    'indicator_title': 'Indicator collection: %s' % (ni) ,
                    'indicator_description': 'Indicators imported from file %s' % (self.file_name),
                    'indicator_confidence': 'Low'
                }
            })

        res['status'] = True
        return res

    def map_object_type(self, otype):
        otype = otype.upper()
        if otype in self.object_type_mapping:
            return self.object_type_mapping[otype]
        return None

    def create_object_properties(self, row):
        ret = {}
        otype = row['TYPE'].upper()
        object_type = self.map_object_type(otype)


        if object_type == 'artifact':
            # Create an artifact object
            ret = {
                'data': row['VALUE']
            }


                
        if object_type == 'address':
            # Create address object
            ret = {
                'ip_addr': row['VALUE'],
                'category': 'ipv4-addr',
                'dda-observable-title': 'IP Address "%s"' % (row['VALUE'])
            }
            #TODO: determine the category of the element

        

        if object_type == 'file':
            # Create a file object
            ret = {
                'file_name': '',
                'file_path': '',
                'file_size': '',
                'md5': '',
                'sha1': '',
                'sha256': ''
            }
            if otype == 'HASH':
                if len(row['VALUE']) == 32:
                    ret['md5'] = row['VALUE']
                elif len(row['VALUE']) == 40:
                    ret['sha1'] = row['VALUE']
                elif len(row['VALUE']) == 64:
                    ret['sha1'] = row['VALUE']
                ret['dda-observable-title'] = 'Unknown file with hash "%s"' % (row['VALUE'])
            elif otype == 'FILENAME':
                ret['file_name'] = row['VALUE']
                ret['dda-observable-title'] = 'File "%s"' % (row['VALUE'])



                
        if object_type == 'emailmessage':
            # Create a emailmessage object
            if otype == 'EMAIL_FROM':
                ret = {
                    'from_': row['VALUE']
                }
            if otype == 'EMAIL_TO':
                ret = {
                    'to': row['VALUE'].replace(';', "\n").replace(' ', "\n")
                }                


            
        if object_type == 'uri':
            # Create a uri object
            ret = {
                'value': row['VALUE']
            }
            if otype == 'FQDN':
                ret['type_'] = 'Domain Name'
            else:
                if not '://' in row['VALUE']:
                    ret['type_'] = 'General URN'

                    
                    
        if object_type == 'winservice':
            # Create a winservice object
            if '.dll' in row['VALUE'].lower():
                ret = {
                    'service_dll': row['VALUE']
                }
            else:
                ret = {
                    'service_name': row['VALUE']
                }


        if object_type == 'httpsession':
            # Create a http session object
            if otype == 'USERAGENT':
                ret = {
                    'user_agent': row['VALUE']
                }
            


                
        # Process optional columns
        if 'DESCRIPTION' in row:
            ret['dda-observable-description'] = row['DESCRIPTION']
            
        if 'TIME' in row:
            # TODO: What do we do with this one?
            pass
            
        return ret
