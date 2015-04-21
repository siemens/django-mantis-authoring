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

from .view_classes import BasicSTIXPackageTemplateView
from dingos import DINGOS_DEFAULT_ID_NAMESPACE_URI, DINGOS_TEMPLATE_FAMILY
from dingos_authoring.view_classes import BasicProcessingView, AuthoringMethodMixin
from mantis_stix_importer.importer import STIX_Import

from django.conf import settings


FORM_VIEW_NAME = 'url.mantis_authoring.transformers.stix.campaign_maintenance'



class FormView(BasicSTIXPackageTemplateView):

    template_name = 'mantis_authoring/%s/CampaignMaintenance.html' % DINGOS_TEMPLATE_FAMILY

    title = 'Campaign/ThreatActor Maintenance'







class stixTransformer:
    """
    Implements the transformer used to transform the JSON produced by
    the MANTIS Authoring GUI into a valid STIX document.
    """

    def __init__(self, *args,**kwargs):
        # Setup our namespace

        self.namespace_name = kwargs.get('namespace_uri', DINGOS_DEFAULT_ID_NAMESPACE_URI).decode('utf-8').encode('ascii')
        self.namespace_prefix = kwargs.get('namespace_slug', "dingos_default").decode('utf-8').encode('ascii')
        self.namespace_map = {self.namespace_name: self.namespace_prefix,
                              'http://data-marking.mitre.org/Marking-1': 'stixMarking',
                              }

class ProcessingView(BasicProcessingView):

    author_view = FORM_VIEW_NAME
    transformer = stixTransformer
    importer_class = STIX_Import




