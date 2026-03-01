CREATE OR REPLACE FUNCTION public.get_user_by_email(p_email TEXT)
RETURNS SETOF public.users
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.users WHERE email = p_email LIMIT 1;
$$;
--> statement-breakpoint
