=============================
Django Mantis Authoring
=============================

**WARNING: Mantis is not maintained anymore: by now, the excellent MISP platform
(http://www.misp-project.org/)
offers all the functionality (and much more) that had been required when
MANTIS was created but could then not be found in any other tool.**



A module providing STIX/CybOX authoring capabilities for MANTIS.

Documentation
-------------

The full documentation is at http://django-mantis-authoring.readthedocs.org.


Quickstart
----------

Please refer to the quickstart information of MANTIS, available at http://django-mantis.readthedocs.org.

Once you are set up with MANTIS, you can use the Django ``manage.py`` to import
STIX indicators into your system as follows::

   $ python manage.py mantis_stix_import <xml-file>  <xml-file> ... [--settings=<path_to_your_django_settings_module]

Here is the output of ``--help`` for ``mantis_stix_import``::

    Usage: manage.py mantis_stix_import [options] xml-file xml-file ... (you can use wildcards)
    
    Imports stix XML files of specified paths into DINGO
    
    Options:
      -v VERBOSITY, --verbosity=VERBOSITY
                            Verbosity level; 0=minimal output, 1=normal output, 2=verbose output, 3=very verbose output
      --settings=SETTINGS   The Python path to a settings module, e.g. "myproject.settings.main". 
                            If this isn't provided, the DJANGO_SETTINGS_MODULE environment variable will be used.
      --pythonpath=PYTHONPATH
                            A directory to add to the Python path, e.g. "/home/djangoprojects/myproject".
      --traceback           Print traceback on exception
      -m MARKING_JSON, --marking_json=MARKING_JSON
                            File with json representation of information of marking to be associated with imports.
      -p PLACEHOLDER_FILLERS, --marking_pfill=PLACEHOLDER_FILLERS
                            Key-value pairs used to fill in placeholders in marking as described in marking file.
      --version             show program's version number and exit
      -h, --help            show this help message and exit



Acknowledgments
---------------


The basic layout for this Django app with out-of-the-box configuration of ``setup.py`` for
easy build, submission to PyPi, etc., and Sphinx documentation tree was generated with Audrey Roy's excellent `Cookiecutter`_
and Daniel Greenfield's `cookiecutter-djangopackage`_ template.


.. _Cookiecutter: https://github.com/audreyr/cookiecutter


.. _cookiecutter-djangopackage: https://github.com/pydanny/cookiecutter-djangopackage
