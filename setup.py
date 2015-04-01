#!/usr/bin/env python
# -*- coding: utf-8 -*-

import os
import sys

import mantis_authoring

try:
    from setuptools import setup
except ImportError:
    from distutils.core import setup

version = mantis_authoring.__version__

if sys.argv[-1] == 'publish':
    os.system('python setup.py sdist upload')
    print("You probably want to also tag the version now:")
    print("  git tag -a %s -m 'version %s'" % (version, version))
    print("  git push --tags")
    sys.exit()

readme = open('README.rst').read()
history = open('HISTORY.rst').read().replace('.. :changelog:', '')

setup(
    name='django-mantis-authoring',
    version=version,
    description="""An module that supports authoring of threat-intelligence information in Mantis.""",
    long_description=readme + '\n\n' + history,
    author='Siemens',
    author_email='mantis.cert@siemens.com',
    url='https://github.com/siemens/django-mantis-authoring',
    packages=[
        'mantis_authoring',
    ],
    include_package_data=True,
    install_requires=[
        'django-dingos-authoring>=0.3.0,<0.4.0',
        'pytz>=2013.9',
        'lxml>=3.2.1',
        'querystring-parser>=1.2.0',
        'django-mantis-stix-importer>=0.3.0,<0.4.0',
        'xlwt>=0.7.5',
        'xlrd>=0.9.3',
    ],
    license="GPLv2+",
    zip_safe=False,
    keywords='django-mantis-authoring',
    classifiers=[
        'Development Status :: 3 - Alpha',
        'Framework :: Django',
        'Intended Audience :: Developers',
        'License :: OSI Approved :: GNU General Public License v2 or later (GPLv2+)',
        'Natural Language :: English',
        'Programming Language :: Python :: 2.7',
        'Topic :: Security'
    ],
)
