from .__object_base__ import *

import hashlib

class file_analyzer(file_object):
    """
    Returns a generic file object.
    """

    object_classes = ['file']
    def test_object(self):
        if self.file_object:
            return 'file'
        return False

    
    def process(self,**kwargs):
        res = {'status': False,
               'data': 'An error occured.'}

        if not self.file_object:
            return res

        file_content = self.get_file_content()

        md5 = hashlib.md5()
        md5.update(file_content)

        sha1 = hashlib.sha1()
        sha1.update(file_content)

        sha256 = hashlib.sha256()
        sha256.update(file_content)

        res['status'] = True
        res['object_class'] = self.test_object()
        res['data'] = [{ 'object_class': 'observable',
                         'object_type': 'file',
                         'object_subtype': 'Default',
                         'properties': { 'file_name': self.file_name,
                                         'file_path': '',
                                         'file_size': self.file_size,
                                         'md5': md5.hexdigest(),
                                         'sha1': sha1.hexdigest(),
                                         'sha256': sha256.hexdigest()
                                     }
                     }]
        return res

    
