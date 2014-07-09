from .__object_base__ import transformer_object, ObjectFormTemplate

from django import forms

from django.templatetags.static import static

from cybox.objects import address_object

class TEMPLATE_Default(transformer_object):

    display_name = "URIs and IPs (Bulk)"
    class ObjectForm(ObjectFormTemplate):
        _multi = forms.CharField(initial=static('true'), widget=forms.HiddenInput)

        data = forms.CharField(widget=forms.Textarea(attrs={'placeholder': 'Copy & Paste a list of URLs/Domains/IPs here line by line.'}), required=False)

    def process_form(self, properties,id_base=None,namespace_tag=None):
        import socket
        
        return_objects = []

        counter = 0
        for ln in properties['data'].splitlines(False):
            ln = ln.strip()
            is_ip = False
            try:
                socket.inet_aton(ln)
                is_ip=True
            except:
                pass

            obj_id_base = self.create_derived_id(id_base,
                                                 fact = ln,
                                                 counter = counter)
            counter += 1

            print "Bulk id base %s" % obj_id_base


            if is_ip:
                ao = address_object.Address()
                ao.address_value = ln

                return_objects.append((obj_id_base,ao))
                #return_objects.append(("%s:Address-%s" % (namespace_tag,obj_id_base),ao))
            else:

                do = self.create_cybox_uri_object(ln) #dns_record_object.DNSRecord()
                return_objects.append((obj_id_base,do))

        return {'type': 'bulk',
                'main_obj_properties_instance': None,
                'obj_properties_instances' : return_objects }
        
