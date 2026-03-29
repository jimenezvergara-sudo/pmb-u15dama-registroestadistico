CREATE POLICY "Users can update own club players"
ON public.club_players FOR UPDATE
TO authenticated
USING (club_id = get_user_club_id(auth.uid()))
WITH CHECK (club_id = get_user_club_id(auth.uid()));