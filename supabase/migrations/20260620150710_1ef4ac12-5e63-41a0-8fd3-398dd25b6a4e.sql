CREATE POLICY "Users can assign their own role"
ON public.user_roles FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);