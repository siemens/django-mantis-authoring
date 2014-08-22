from menu import Menu, MenuItem
from django.core.urlresolvers import reverse

# Since we should already have a menu for the authoring (from the dingos_authoring), we just add a menu entry
if Menu.items and Menu.items.has_key('mantis_main'):
    authoring_menu = filter(lambda x: x.title == 'Authoring' ,Menu.items['mantis_main'])
    authoring_menu = authoring_menu[0] if authoring_menu else None
    if authoring_menu:
        authoring_menu.children = (MenuItem("New Report", reverse('url.mantis_authoring.transformers.stix.campaing_indicators'), check = lambda request: request.user.is_authenticated()),) + authoring_menu.children

