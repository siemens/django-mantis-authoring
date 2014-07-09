from .__object_base__ import transformer_object, ObjectFormTemplate

from cybox.common import StructuredText, String
from cybox.objects import dns_record_object, address_object

from django import forms

from django.templatetags.static import static

class DISABLEDTEMPLATE_Default(transformer_object):

    # Disabled -- need to clarify use cases for DNS Record first

    display_name = "DNS Record"


    # The fact_terms provided in  ``relevant_fact_term_list`` are
    # used for searching for similar objects that are presented to the
    # user upon request.

    relevant_fact_term_list = []



    class ObjectForm(ObjectFormTemplate):


        domain_name = forms.CharField(max_length=1024,
                                      help_text = "REQUIRED. The name of the domain to which the DNS cache entry points.",
                                      required=True)
        ip_address = forms.CharField(max_length=15,
                                     help_text = "REQUIRED. The IP address to which the domain name in the DNS cache entry resolves to.",
                                     required=True)

        queried_date = forms.DateTimeField(help_text = "Enter date and time (UTC) in format YYYY-MM-DD HH:MM:SS",
                                           required=False)

    def process_form(self, properties,id_base=None,namespace_tag=None):
        cybox_dns_record = dns_record_object.DNSRecord()
        cybox_dns_record.domain_name = self.create_cybox_uri_object(properties.get('domain_name', ''))
        cybox_dns_record.ip_address = address_object.Address(String(str(properties.get('ip_address',''))))
        cybox_dns_record.ip_address.condition = 'Equals'
        if properties.get('queried_date',None):
            cybox_dns_record.queried_date = properties.get('queried_date',None)

        return cybox_dns_record

