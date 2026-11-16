-- Fixtures for isolated native concurrency checks only.
DO $fixture$
DECLARE actor uuid;
BEGIN
 FOREACH actor IN ARRAY ARRAY['00000000-0000-4000-8000-000000000005'::uuid,'00000000-0000-4000-8000-000000000006'::uuid] LOOP
  PERFORM public.cafe_community_people_command_server(actor,'profile.save',
   '{"displayName":"Synthetic friend","nativeLanguages":["fr"],"learningLanguages":["it"],"adultAgreement":true,"rulesAgreement":true,"discoverable":true}');
 END LOOP;
END $fixture$;
