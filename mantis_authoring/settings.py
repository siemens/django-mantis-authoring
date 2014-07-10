
# When authoring STIX/CybOx objects, we sometimes need
# to derive object ids from a given object id. The
# setting below governs how this is done.
#
# - 'hash': We take the given object id, concatenate it
#    with some defining characteristic of the object for
#    which we require the new id, and take the hash value
#
# - 'counter': We simply concatenate the given object-id
#   with a counter value.
#
# The setting below governs how identifiers are der

HASH_MODE = 'hash'

COUNTER_MODE = 'counter'

MANTIS_AUTHORING_ID_DERIVATION_STRATEGY = COUNTER_MODE
