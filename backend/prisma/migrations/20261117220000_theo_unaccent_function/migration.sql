-- ═══════════════════════════════════════════════════════════════════════════
-- Migration: theo_unaccent function
-- Adds:
--  - public.theo_unaccent(text) IMMUTABLE function for accent-insensitive
--    and diacritic-insensitive search across Latin, Greek, and Hebrew.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.theo_unaccent(text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE PARALLEL SAFE STRICT
AS $function$
        SELECT regexp_replace(
          regexp_replace(
            normalize($1, NFD),
            E'[\u05BE\u05C0\u05C3\u05C6]', ' ', 'g'
          ),
          E'[\u0300-\u036F\u0591-\u05BD\u05BF\u05C1\u05C2\u05C4\u05C5\u05C7]', '', 'g'
        );
      $function$;

