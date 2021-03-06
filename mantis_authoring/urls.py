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

from django.conf.urls import url

from . import views

import CampaignIndicators, CampaignMaintenance

urlpatterns = [
    # 'New Report' Authoring
    url(r'^Templates/CampaignIndicators/$', CampaignIndicators.FormView.as_view(), name=CampaignIndicators.FORM_VIEW_NAME),
    url(r'^Templates/CampaignIndicators/transform$', CampaignIndicators.ProcessingView.as_view()),
    url(r'^Templates/CampaignIndicators/upload$', CampaignIndicators.UploadFile.as_view(), name="url.mantis_authoring.upload_file"),
    url(r'^Templates/CampaignIndicators/IndicatorListTemplate$', CampaignIndicators.IndicatorListTemplate.as_view(), name="url.mantis_authoring.indicator_list_template"),
    url(r'^Templates/CampaignIndicators/load$', CampaignIndicators.GetDraft.as_view()),
    

    # 'Campaign/TA Maintenance' Authoring
    url(r'^Templates/CampaignMaintenance/$', CampaignMaintenance.FormView.as_view(), name=CampaignMaintenance.FORM_VIEW_NAME_CAMPAIGN),
    url(r'^Templates/CampaignMaintenance/transform_campaign$', CampaignMaintenance.CampaignProcessingView.as_view()),
    url(r'^Templates/CampaignMaintenance/transform_threatactor$', CampaignMaintenance.ThreatActorProcessingView.as_view()),
    url(r'^Templates/CampaignMaintenance/get_ref_tas$', CampaignMaintenance.GetRefThreatActors.as_view()),
    url(r'^Templates/CampaignMaintenance/load_campaign$', CampaignMaintenance.GetDraftCampaign.as_view()),
    url(r'^Templates/CampaignMaintenance/load_threatactor$', CampaignMaintenance.GetDraftThreatActor.as_view()),
    

    url(r'/ref$', views.GetAuthoringObjectReference.as_view(), name="url.mantis_authoring.ref"),

    url(r'^validate_object$', views.ValidateObject.as_view(), name="url.mantis_authoring.validate_object"),
    url(r'/validate_object$', views.ValidateObject.as_view(), name="url.mantis_authoring.validate_object"),
    url(r'^similar_object$', views.GetAuthoringSimilarObjects.as_view(), name="url.mantis_authoring.similar_object"),
    url(r'/similar_object$', views.GetAuthoringSimilarObjects.as_view(), name="url.mantis_authoring.similar_object")

]

