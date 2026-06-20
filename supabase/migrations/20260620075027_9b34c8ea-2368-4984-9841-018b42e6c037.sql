
DROP POLICY IF EXISTS "Anyone can view students" ON public."Students";
REVOKE SELECT ON public."Students" FROM anon;

CREATE POLICY "Authenticated users can view students"
  ON public."Students" FOR SELECT
  TO authenticated
  USING (true);
