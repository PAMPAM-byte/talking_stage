-- Founder-approved on 19 October 2026: inclusive NGN 2,000–1,000,000.
-- Integer minor units; these updates do not enable payments or requests.
begin;
update private.bachs_configuration
set minimum_amount_minor=200000,maximum_amount_minor=100000000
where singleton;
update private.monetary_request_policy
set minimum_amount_minor=200000,maximum_amount_minor=100000000
where singleton;
commit;
