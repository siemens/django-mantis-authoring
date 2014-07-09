
from .__object_base__ import transformer_object, ObjectFormTemplate

from cybox.objects import http_session_object

from cybox.common import String


from django import forms

from django.templatetags.static import static

class TEMPLATE_Default(transformer_object):

    display_name = "HTTP Session"
    class ObjectForm(ObjectFormTemplate):

        request_method = forms.CharField(label = "Request method",
                                 max_length=1024,
                                 required=False,
                                 help_text = "The HTTP method portion of the HTTP request line.")
        request_value = forms.CharField(label = 'Request value',
                              max_length=1024,
                              required=False,
                              help_text = "The value (typically a resource path) portion of the HTTP request line.")
        host = forms.CharField(label = "Requested host",
                               max_length=1024,
                               required=False,
                               help_text = "The domain name of the server.")
        port = forms.IntegerField(required=False,
                                  help_text = "The TCP port number on which the server is listening.")
        user_agent = forms.CharField(max_length=1024,
                                     required=False,
                                     help_text = "The HTTP Request User-Agent field, which defines the user agent string of the user agent.")

    def process_form(self, properties,id_base=None,namespace_tag=None):
        cybox_http_session = http_session_object.HTTPSession()
        cybox_http_session.http_request_response = [self.__create_cybox_http_request_response(properties)]
        return cybox_http_session
        

    def __create_cybox_http_request_response(self, properties):
        cybox_http_request_response = http_session_object.HTTPRequestResponse()
        #cybox_http_request_response.ordinal_position = 
        cybox_http_request_response.http_client_request = self.__create_cybox_http_client_request(properties)
        #cybox_http_request_response.http_provisional_server_response = self.__create_cybox_http_provisional_server_response(properties)
        #cybox_http_request_response.http_server_response = self.__create_cybox_http_server_response(properties)
        return cybox_http_request_response

    def __create_cybox_http_client_request(self, properties):
        if (properties['request_method'].strip() or
            properties['request_value'].strip() or
            properties['host'].strip() or
            properties['port'].strip() or
            properties['user_agent'].strip()):
            cybox_http_client_request = http_session_object.HTTPClientRequest()


            if properties['request_method'].strip() or properties['request_value'].strip():
                request_line = http_session_object.HTTPRequestLine()

                if properties['request_method'].strip():
                    request_line.http_method = String(properties['request_method'])
                if properties['request_value'].strip():
                    request_line.value = String(properties['request_value'])
                cybox_http_client_request.http_request_line = request_line

            request_header = http_session_object.HTTPRequestHeader()
            if properties['host'].strip() or properties['port'].strip() or properties['user_agent'].strip():
                request_header_fields = http_session_object.HTTPRequestHeaderFields()
                request_header_fields.host = http_session_object.HostField()
                if properties['host'].strip():
                    request_header_fields.host.domain_name = self.create_cybox_uri_object(properties['host'])
                try:
                    port = properties['port']
                    port = int(port)
                except:
                    port = None
                if port:
                    request_header_fields.host.port = http_session_object.Port()
                    request_header_fields.host.port.port_value = port

                if properties['user_agent'].strip():
                    request_header_fields.user_agent = String(properties['user_agent'])
                #request_header_fields...
                request_header.parsed_header = request_header_fields
                cybox_http_client_request.http_request_header = request_header

            #message_body = http_session_object.HTTPMessage()
            #message_body.length =
            #message_body.message_body =
            #cybox_http_client_request.http_message_body = message_body

            return cybox_http_client_request

