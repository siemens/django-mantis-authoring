import os
from django.core.files.uploadedfile import InMemoryUploadedFile

class file_object(object):
    """
    This class provides a base skeleton for the file analysis plugins.
    """


    file_object = None
    file_name = ''
    file_size = ''
    file_content = None

    def __init__(self, obj):
        """Inits the object. Gets passed something in obj which can be of
        type InMemoryUploadedFile (in case Django passes it to us) or
        it can be a dictionary (which happens when a file gets
        submitted, its data cached, and then the cached info is passed
        to us)
        The init must make sure to bring the obj to a consistant form.
        """
        self.file_object = obj
        if isinstance(obj, InMemoryUploadedFile):
            self.file_name = obj.name
            self.file_size = obj.size
        else: # Cache dict
            self.file_name = obj['filename']
            self.file_size = os.path.getsize(obj['cache_file'])

    
    def get_description(self):
        return self.__doc__


    def get_file_content(self):
        if isinstance(self.file_object, InMemoryUploadedFile):
            if not self.file_content:
                self.file_object.seek(0)
                self.file_content = self.file_object.read()
        else:
            if not self.file_content:
                with open(self.file_object['cache_file']) as f:
                    self.file_content = f.read()

        return self.file_content


    object_classes = []
    def is_class_type(self, klass):
        """
        Checks whether a passed class or classes would qualify for the module. 
        """
        if not klass:
            return True
        klass = klass.split(',')
        return (bool)(set(klass).intersection(set(self.object_classes)))


    def test_object(self):
        """
        Tests whether the file is processable by the module. Returns the object_class on success, otherwise False
        """
        return False

    
    def process(self):
        """
        Processes the file and generates the information needed by the frontend to create the object.
        Returns a dictionary with a status and the data. Status is false on error, data contains the message.
        """
        return {'status': False,
                'object_class': self.test_object(self.file_object),
                'data': 'An error occured.'}

    

        
        
        
