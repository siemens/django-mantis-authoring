# Copyright (c) Siemens AG, 2015
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



from __future__ import absolute_import

from celery import shared_task



from dingos.forms import check_tag_validity



from mantis_authoring import MANTIS_AUTHORING_ACTIONABLES_EXPORT_FUNCTION

import logging

import importlib


logger = logging.getLogger(__name__)



@shared_task(ignore_result=True)
def export_to_actionables(top_level_iobject,
                          import_jsn=None,
                          user=None,
                          action_comment='Import of Report authored via GUI'):
    tags_to_add = []

    if import_jsn:
        report_type = import_jsn.get('stix_header',{}).get('stix_header_report_type', '')
        header_title = import_jsn.get('stix_header',{}).get('stix_header_title', '')
        if  report_type in ['incident_report', 'investigation'] or header_title.startswith('CERT-'):
            if header_title:
                possible_tag = check_tag_validity(header_title,
                                                  run_regexp_checks=True,
                                                  raise_exception_on_problem=False)
                if possible_tag:
                    tags_to_add = [possible_tag]
                    top_level_iobject.identifier.tags.add(possible_tag)


    mod_name, func_name = MANTIS_AUTHORING_ACTIONABLES_EXPORT_FUNCTION.rsplit('.',1)
    mod = importlib.import_module(mod_name)
    actionables_export_function = getattr(mod,func_name)
    actionables_export_function([top_level_iobject],
                                user = user,
                                action_comment=action_comment,
                                tags_to_add= tags_to_add,
                                tagging_comment = "Report for %s entered via GUI" % ", ".join(tags_to_add)
    )

